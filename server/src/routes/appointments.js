import { Router } from 'express';
import { coll, oid, isoNow } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import {
  TIME_RE,
  generateSlots,
  getSettings,
  hoursForDay,
  isFutureOrToday,
  isValidDateString,
  joinAppointments,
  notify,
} from '../lib/helpers.js';

const router = Router();
// Auth applies only to /appointments paths — this router is mounted at /api
router.use('/appointments', requireAuth);

const slotStateId = (date, time) => `${date}|${time}`;

/**
 * Atomically claim one seat in a slot. Mongo has no row locks on a shared
 * cluster, so we keep a per-slot counter document and claim with a conditional
 * atomic update — concurrent requests cannot both pass.
 */
async function claimSlot(dateStr, timeStr) {
  const stateId = slotStateId(dateStr, timeStr);
  const maxPerSlot = Math.max(1, (await getSettings()).max_slots_per_slot || 1);

  // Ensure the counter exists (idempotent)
  await coll('slot_state').updateOne(
    { _id: stateId },
    { $setOnInsert: { count: 0 } },
    { upsert: true }
  );

  const claimed = await coll('slot_state').findOneAndUpdate(
    { _id: stateId, count: { $lt: maxPerSlot } },
    { $inc: { count: 1 } },
    { returnDocument: 'after' }
  );
  return Boolean(claimed);
}

async function releaseSlot(dateStr, timeStr) {
  await coll('slot_state').updateOne(
    { _id: slotStateId(dateStr, timeStr), count: { $gt: 0 } },
    { $inc: { count: -1 } }
  );
}

// GET /appointments — current customer's appointments
router.get('/appointments', async (req, res) => {
  const rows = await coll('appointments')
    .find({ customer_id: oid(req.user.id) })
    .sort({ appointment_date: -1, appointment_time: -1 })
    .toArray();
  const appointments = await joinAppointments(rows);
  res.json({ appointments });
});

// GET /appointments/:id — must own the appointment
router.get('/appointments/:id', async (req, res) => {
  const row = await coll('appointments').findOne({
    _id: oid(req.params.id),
    customer_id: oid(req.user.id),
  });
  if (!row) return res.status(404).json({ error: 'Appointment not found.' });
  const [appointment] = await joinAppointments([row]);
  res.json({ appointment });
});

// POST /appointments — create booking. The availability re-check happens server-side
// and is made atomic via the slot counter (claimSlot), so concurrent requests
// cannot double-book a slot.
router.post('/appointments', async (req, res) => {
  const { nail_design_id, appointment_date, appointment_time, customer_notes } = req.body || {};
  const errors = {};

  const design = await coll('nail_designs').findOne({ _id: oid(nail_design_id), is_active: true });
  if (!design) errors.nail_design_id = 'Please choose a valid, active nail design.';
  if (!appointment_date || !isValidDateString(String(appointment_date))) {
    errors.appointment_date = 'Please choose a valid date.';
  } else if (!isFutureOrToday(String(appointment_date))) {
    errors.appointment_date = 'Appointments can only be booked for today or a future date.';
  } else {
    const settings = await getSettings();
    const limit = Math.max(1, settings.advance_booking_days || 60);
    const d = new Date(`${appointment_date}T00:00:00`);
    const max = new Date();
    max.setDate(max.getDate() + limit);
    max.setHours(0, 0, 0, 0);
    if (d > max) errors.appointment_date = `You can book up to ${limit} days in advance.`;
  }
  if (!appointment_time || !TIME_RE.test(String(appointment_time))) {
    errors.appointment_time = 'Please choose a valid time slot.';
  }
  if (customer_notes && String(customer_notes).length > 500) {
    errors.customer_notes = 'Notes must be under 500 characters.';
  }
  if (Object.keys(errors).length) return res.status(422).json({ errors });

  // Validate the chosen time is actually a generated slot for that weekday
  const dateStr = String(appointment_date);
  const timeStr = String(appointment_time);
  const date = new Date(`${dateStr}T00:00:00`);
  const hours = await hoursForDay(date.getDay());
  if (!hours || !hours.is_open) {
    return res.status(422).json({ errors: { appointment_date: 'The salon is closed on this day.' } });
  }
  const daySlots = await generateSlots(dateStr);
  if (!daySlots.slots.some((s) => s.time === timeStr)) {
    return res.status(422).json({ errors: { appointment_time: 'This time is not a bookable slot.' } });
  }

  // Atomic check-and-claim: two concurrent requests for the same slot cannot
  // both pass (the counter increments atomically; only one gets a seat).
  const claimed = await claimSlot(dateStr, timeStr);
  if (!claimed) {
    return res.status(409).json({
      error: 'Sorry, that slot was just booked by someone else. Please pick another time.',
      errors: { appointment_time: 'This slot is no longer available.' },
    });
  }

  let apptId;
  try {
    const now = isoNow();
    const inserted = await coll('appointments').insertOne({
      customer_id: oid(req.user.id),
      nail_design_id: design._id,
      appointment_date: dateStr,
      appointment_time: timeStr,
      status: 'pending',
      customer_notes: String(customer_notes || '').trim(),
      admin_notes: '',
      created_at: now,
      updated_at: now,
    });
    apptId = inserted.insertedId;
  } catch (err) {
    // Duplicate key — the same customer already holds this slot (pending/accepted).
    // Release the claim so the seat isn't leaked.
    await releaseSlot(dateStr, timeStr);
    if (err.code === 11000) {
      return res.status(409).json({
        error: 'You already have an appointment for this slot.',
        errors: { appointment_time: 'You already have a booking for this time slot.' },
      });
    }
    throw err;
  }

  const [appt] = await joinAppointments([await coll('appointments').findOne({ _id: apptId })]);
  await notify(
    req.user.id,
    'Booking submitted',
    `Your appointment for "${design.name}" on ${dateStr} at ${timeStr} has been submitted and is awaiting confirmation.`,
    'info'
  );
  // Notify admins
  const admins = await coll('users').find({ role: 'admin' }).toArray();
  for (const a of admins) {
    await notify(a._id, 'New appointment request', `${req.user.name} requested "${design.name}" on ${dateStr} at ${timeStr}.`, 'info');
  }

  res.status(201).json({ appointment: appt });
});

// PUT /appointments/:id/cancel — customer cancels (only their own, only if allowed)
router.put('/appointments/:id/cancel', async (req, res) => {
  const row = await coll('appointments').findOne({
    _id: oid(req.params.id),
    customer_id: oid(req.user.id),
  });
  if (!row) return res.status(404).json({ error: 'Appointment not found.' });

  if (row.status !== 'pending' && row.status !== 'accepted') {
    return res.status(422).json({ error: 'Only pending or accepted appointments can be cancelled.' });
  }
  const settings = await getSettings();
  if (!settings.allow_cancellation) {
    return res.status(422).json({ error: 'Cancellation is currently disabled. Please contact the salon.' });
  }

  await coll('appointments').updateOne(
    { _id: row._id },
    { $set: { status: 'cancelled', updated_at: isoNow() } }
  );
  await releaseSlot(row.appointment_date, row.appointment_time);
  await notify(
    req.user.id,
    'Appointment cancelled',
    `Your appointment on ${row.appointment_date} at ${row.appointment_time} was cancelled.`,
    'warning'
  );
  res.json({ ok: true });
});

export default router;

// Re-export the shape for admin use
export { publicAppointment } from '../lib/helpers.js';
