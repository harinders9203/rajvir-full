import { coll, oid, isoNow, withId } from '../db.js';

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateString(s) {
  if (!DATE_RE.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

export function isFutureOrToday(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d >= today;
}

/** Escape a string for use inside a $regex. */
export function escRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function getSettings() {
  return coll('salon_settings').findOne({ _id: 1 });
}

export async function getHours() {
  return coll('business_hours').find().sort({ _id: 1 }).toArray();
}

/** Business-hours doc keyed by JS day-of-week (0 = Sunday). */
export async function hoursForDay(dayOfWeek) {
  return coll('business_hours').findOne({ _id: dayOfWeek });
}

/** Insert a notification row for a user (userId may be a string or ObjectId). */
export async function notify(userId, title, message, type = 'info') {
  await coll('notifications').insertOne({
    user_id: oid(userId) || userId,
    title,
    message,
    type,
    is_read: false,
    created_at: isoNow(),
  });
}

/**
 * Generate the slot list for a date.
 * Slots are derived from the salon's opening/closing time for that weekday and the
 * configured booking interval. Slots that are already at capacity (based on
 * max_slots_per_slot) are marked unavailable.
 */
export async function generateSlots(dateStr, includeFullDetails = true) {
  const date = new Date(`${dateStr}T00:00:00`);
  const day = date.getDay();
  const hours = await hoursForDay(day);

  if (!hours || !hours.is_open) {
    return { is_open: false, slots: [] };
  }

  const settings = await getSettings();
  const [openH, openM] = hours.opening_time.split(':').map(Number);
  const [closeH, closeM] = hours.closing_time.split(':').map(Number);
  const openMin = openH * 60 + openM;
  const closeMin = closeH * 60 + closeM;
  const interval = Math.max(15, settings.booking_interval || 60);

  const booked = await coll('appointments')
    .aggregate([
      {
        $match: { appointment_date: dateStr, status: { $in: ['pending', 'accepted'] } },
      },
      { $group: { _id: '$appointment_time', n: { $sum: 1 } } },
    ])
    .toArray();

  const bookedMap = new Map(booked.map((b) => [b._id, b.n]));
  const maxPerSlot = Math.max(1, settings.max_slots_per_slot || 1);

  const slots = [];
  for (let t = openMin; t < closeMin; t += interval) {
    const hh = String(Math.floor(t / 60)).padStart(2, '0');
    const mm = String(t % 60).padStart(2, '0');
    const time = `${hh}:${mm}`;
    const taken = bookedMap.get(time) || 0;
    if (includeFullDetails) {
      slots.push({ time, available: taken < maxPerSlot, booked: taken });
    } else {
      slots.push(time);
    }
  }
  return { is_open: true, slots };
}

/**
 * Server-side availability check. Returns true if `max_slots_per_slot` isn't
 * exceeded for the date+time by pending/accepted appointments.
 */
export async function slotIsAvailable(dateStr, time) {
  const n = await coll('appointments').countDocuments({
    appointment_date: dateStr,
    appointment_time: time,
    status: { $in: ['pending', 'accepted'] },
  });
  const maxPerSlot = Math.max(1, (await getSettings()).max_slots_per_slot || 1);
  return n < maxPerSlot;
}

/** Public shape of an appointment (no internal/admin fields). */
export function publicAppointment(doc) {
  if (!doc) return null;
  return {
    id: doc._id.toString(),
    customer_id: doc.customer_id ? doc.customer_id.toString() : doc.customer_id,
    nail_design_id: doc.nail_design_id ? doc.nail_design_id.toString() : doc.nail_design_id,
    appointment_date: doc.appointment_date,
    appointment_time: doc.appointment_time,
    status: doc.status,
    customer_notes: doc.customer_notes,
    admin_notes: doc.admin_notes,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
  };
}

/**
 * Decorate appointment docs with joined design + customer fields (replaces the
 * old SQL JOIN). Batch-fetches to keep it cheap.
 */
export async function joinAppointments(appts) {
  if (!appts || appts.length === 0) return [];
  appts = appts.filter(Boolean);
  if (appts.length === 0) return [];
  const designIds = [...new Set(appts.map((a) => a.nail_design_id.toString()))];
  const userIds = [...new Set(appts.map((a) => a.customer_id.toString()))];
  const [designs, users] = await Promise.all([
    coll('nail_designs').find({ _id: { $in: designIds.map(oid) } }).toArray(),
    coll('users').find({ _id: { $in: userIds.map(oid) } }).toArray(),
  ]);
  const dMap = new Map(designs.map((d) => [d._id.toString(), d]));
  const uMap = new Map(users.map((u) => [u._id.toString(), u]));
  return appts.map((a) => {
    const d = dMap.get(a.nail_design_id.toString());
    const u = uMap.get(a.customer_id.toString());
    return {
      ...withId(a),
      customer_id: a.customer_id.toString(),
      nail_design_id: a.nail_design_id.toString(),
      design_name: d?.name || '',
      design_price: d?.price ?? 0,
      design_duration: d?.duration ?? 0,
      design_image: d?.image_url || '',
      customer_name: u?.name || '',
      customer_email: u?.email || '',
      customer_phone: u?.phone || '',
    };
  });
}
