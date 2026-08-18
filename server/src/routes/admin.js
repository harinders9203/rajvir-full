import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { coll, oid, isoNow, withId } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import {
  notify,
  TIME_RE,
  escRegex,
  getSettings,
  getHours,
  joinAppointments,
} from '../lib/helpers.js';

const router = Router();
router.use(requireAuth, requireAdmin);

/* ------------------------------------------------------------------ */
/* Image uploads (stored on disk under server/uploads, served at /uploads) */
/* ------------------------------------------------------------------ */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = EXT[file.mimetype] || '.jpg';
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error('Only JPG, PNG, WebP or GIF images are allowed.'));
    }
    cb(null, true);
  },
});

// POST /api/admin/uploads — multipart field "image" -> { url }
router.post('/uploads', (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(422).json({ error: err.message });
    if (!req.file) return res.status(422).json({ error: 'No image file received.' });
    res.status(201).json({ url: `/uploads/${req.file.filename}` });
  });
});

// DELETE /api/admin/uploads — { url } removes the file from disk (uploads dir only)
router.delete('/uploads', (req, res) => {
  const { url } = req.body || {};
  if (!url || !String(url).startsWith('/uploads/')) {
    return res.status(422).json({ error: 'A valid uploaded image URL is required.' });
  }
  const filename = path.basename(String(url));
  const filePath = path.join(UPLOAD_DIR, filename);
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(UPLOAD_DIR))) {
    return res.status(422).json({ error: 'Invalid image path.' });
  }
  try {
    if (fs.existsSync(resolved)) fs.unlinkSync(resolved);
  } catch {
    // best-effort cleanup
  }
  res.json({ ok: true });
});

/* ------------------------------------------------------------------ */
/* Dashboard overview                                                  */
/* ------------------------------------------------------------------ */

const localISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const countAppts = (status) =>
  status ? coll('appointments').countDocuments({ status }) : coll('appointments').countDocuments({});

router.get('/stats', async (req, res) => {
  const today = localISO(new Date());

  const [
    total_appointments,
    pending,
    accepted,
    rejected,
    completed,
    cancelled,
    total_customers,
    active_customers,
    total_designs,
    active_designs,
    revenueRows,
    todaysRows,
    recentRows,
    pendingRows,
    popularRows,
    seriesRows,
  ] = await Promise.all([
    countAppts(),
    countAppts('pending'),
    countAppts('accepted'),
    countAppts('rejected'),
    countAppts('completed'),
    countAppts('cancelled'),
    coll('users').countDocuments({ role: 'customer' }),
    coll('users').countDocuments({ role: 'customer', is_active: true }),
    coll('nail_designs').countDocuments({}),
    coll('nail_designs').countDocuments({ is_active: true }),
    coll('appointments')
      .aggregate([
        { $match: { status: 'completed' } },
        {
          $lookup: {
            from: 'nail_designs',
            localField: 'nail_design_id',
            foreignField: '_id',
            as: 'd',
          },
        },
        { $unwind: '$d' },
        { $group: { _id: null, s: { $sum: '$d.price' } } },
      ])
      .toArray(),
    coll('appointments')
      .find({
        appointment_date: today,
        status: { $in: ['pending', 'accepted'] },
      })
      .sort({ appointment_time: 1 })
      .toArray(),
    coll('appointments').find({}).sort({ created_at: -1, _id: -1 }).limit(8).toArray(),
    coll('appointments')
      .find({ status: 'pending' })
      .sort({ appointment_date: 1, appointment_time: 1 })
      .limit(8)
      .toArray(),
    coll('appointments')
      .aggregate([
        { $group: { _id: '$nail_design_id', c: { $sum: 1 } } },
        { $sort: { c: -1 } },
        { $limit: 5 },
      ])
      .toArray(),
    coll('appointments')
      .aggregate([
        { $match: { status: 'completed' } },
        {
          $lookup: {
            from: 'nail_designs',
            localField: 'nail_design_id',
            foreignField: '_id',
            as: 'd',
          },
        },
        { $unwind: '$d' },
        { $group: { _id: '$appointment_date', total: { $sum: '$d.price' } } },
      ])
      .toArray(),
  ]);

  const [todays, recent, pendingList] = await Promise.all([
    joinAppointments(todaysRows),
    joinAppointments(recentRows),
    joinAppointments(pendingRows),
  ]);

  // Popular designs
  const popIds = popularRows.map((p) => p._id);
  const popDesigns = popIds.length
    ? await coll('nail_designs').find({ _id: { $in: popIds } }).toArray()
    : [];
  const popMap = new Map(popDesigns.map((d) => [d._id.toString(), d]));
  const popular = popularRows
    .map((p) => {
      const d = popMap.get(p._id.toString());
      return d
        ? {
            id: d._id.toString(),
            name: d.name,
            image_url: d.image_url,
            price: d.price,
            c: p.c,
            bookings: p.c,
          }
        : null;
    })
    .filter(Boolean);

  // 7-day revenue series (fill missing days with 0)
  const seriesMap = new Map(seriesRows.map((r) => [r._id, r.total]));
  const revenueSeries = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = localISO(d);
    revenueSeries.push({ date: iso, total: seriesMap.get(iso) || 0 });
  }

  const upcoming = await coll('appointments').countDocuments({
    status: { $in: ['pending', 'accepted'] },
    appointment_date: { $gte: today },
  });

  res.json({
    stats: {
      total_appointments,
      pending,
      accepted,
      rejected,
      completed,
      cancelled,
      total_customers,
      active_customers,
      total_designs,
      active_designs,
      revenue: revenueRows[0]?.s || 0,
      upcoming,
    },
    today,
    todays,
    recent,
    pending: pendingList,
    popular,
    revenueSeries,
  });
});

/* ------------------------------------------------------------------ */
/* Appointment management                                              */
/* ------------------------------------------------------------------ */

router.get('/appointments', async (req, res) => {
  const { status, q, date, from, to, limit } = req.query;
  const filter = {};

  if (status && status !== 'all') filter.status = String(status);
  if (q) {
    const re = new RegExp(escRegex(String(q)), 'i');
    const customers = await coll('users').find({ $or: [{ name: re }, { email: re }, { phone: re }] }).toArray();
    const designs = await coll('nail_designs').find({ name: re }).toArray();
    const custIds = customers.map((c) => c._id);
    const designIds = designs.map((d) => d._id);
    filter.$or = [
      { customer_id: { $in: custIds } },
      { nail_design_id: { $in: designIds } },
      { _id: oid(String(q)) ? { $eq: oid(String(q)) } : undefined },
    ].filter((c) => Object.values(c)[0] !== undefined);
    if (!filter.$or.length) delete filter.$or;
  }
  if (date) filter.appointment_date = String(date);
  if (from || to) {
    filter.appointment_date = {};
    if (from) filter.appointment_date.$gte = String(from);
    if (to) filter.appointment_date.$lte = String(to);
  }

  const lim = Math.min(Number(limit) || 100, 500);
  const rows = await coll('appointments')
    .find(filter)
    .sort({ appointment_date: -1, appointment_time: -1, _id: -1 })
    .limit(lim)
    .toArray();
  const appointments = await joinAppointments(rows);
  res.json({ appointments });
});

router.get('/appointments/:id', async (req, res) => {
  const row = await coll('appointments').findOne({ _id: oid(req.params.id) });
  if (!row) return res.status(404).json({ error: 'Appointment not found.' });
  const [appointment] = await joinAppointments([row]);
  res.json({ appointment });
});

const ALLOWED_TRANSITIONS = {
  accept: { from: ['pending'], to: 'accepted' },
  reject: { from: ['pending'], to: 'rejected' },
  complete: { from: ['accepted'], to: 'completed' },
  cancel: { from: ['pending', 'accepted'], to: 'cancelled' },
};

const CUSTOMER_MESSAGES = {
  accepted: ['Appointment accepted', (a) => `Great news — your appointment for "${a.design_name}" on ${a.appointment_date} at ${a.appointment_time} has been accepted. We can't wait to see you!`, 'success'],
  rejected: ['Appointment rejected', (a) => `Unfortunately, your appointment request for "${a.design_name}" on ${a.appointment_date} was rejected. Your slot has been released — you're welcome to book another time.`, 'error'],
  completed: ['Appointment completed', (a) => `Your appointment for "${a.design_name}" on ${a.appointment_date} has been marked as completed. Thank you for visiting Blush!`, 'success'],
  cancelled: ['Appointment cancelled', (a) => `Your appointment for "${a.design_name}" on ${a.appointment_date} at ${a.appointment_time} was cancelled by the salon. Your slot is free again.`, 'warning'],
};

const releaseSlot = async (dateStr, timeStr) => {
  await coll('slot_state').updateOne(
    { _id: `${dateStr}|${timeStr}`, count: { $gt: 0 } },
    { $inc: { count: -1 } }
  );
};

router.put('/appointments/:id/:action', async (req, res) => {
  const { id, action } = req.params;
  const rule = ALLOWED_TRANSITIONS[action];
  if (!rule) return res.status(404).json({ error: 'Unknown action.' });

  const row = await coll('appointments').findOne({ _id: oid(id) });
  if (!row) return res.status(404).json({ error: 'Appointment not found.' });
  if (!rule.from.includes(row.status)) {
    return res.status(422).json({
      error: `This appointment is currently "${row.status}" and cannot be ${action === 'cancel' ? 'cancelled' : action + 'ed'}.`,
    });
  }

  const adminNotes = String(req.body?.admin_notes || '').trim().slice(0, 1000);

  await coll('appointments').updateOne(
    { _id: row._id },
    {
      $set: {
        status: rule.to,
        ...(adminNotes ? { admin_notes: adminNotes } : {}),
        updated_at: isoNow(),
      },
    }
  );

  // Leaving pending/accepted frees the slot for others.
  if (row.status === 'pending' || row.status === 'accepted') {
    await releaseSlot(row.appointment_date, row.appointment_time);
  }

  const [updated] = await joinAppointments([await coll('appointments').findOne({ _id: row._id })]);
  const [title, msg, type] = CUSTOMER_MESSAGES[rule.to];
  await notify(row.customer_id, title, msg(updated), type);

  res.json({ appointment: updated });
});

/* ------------------------------------------------------------------ */
/* Calendar (day / week / month ranges)                                */
/* ------------------------------------------------------------------ */

router.get('/calendar', async (req, res) => {
  const { start, end } = req.query;
  if (!start || !end) return res.status(422).json({ error: 'start and end dates are required.' });
  const rows = await coll('appointments')
    .find({ appointment_date: { $gte: String(start), $lte: String(end) } })
    .sort({ appointment_date: 1, appointment_time: 1 })
    .toArray();
  const [appointments] = await Promise.all([joinAppointments(rows)]);
  const hours = (await getHours()).map((h) => ({
    day_of_week: h._id,
    opening_time: h.opening_time,
    closing_time: h.closing_time,
    is_open: Boolean(h.is_open),
  }));
  res.json({ appointments, hours, settings: await getSettings() });
});

/* ------------------------------------------------------------------ */
/* Nail design CRUD                                                    */
/* ------------------------------------------------------------------ */

function validateDesign(body) {
  const errors = {};
  const name = String(body.name || '').trim();
  const price = Number(body.price);
  const category = String(body.category || '').trim();
  const duration = Number(body.duration);
  const description = String(body.description || '').trim();
  const image_url = String(body.image_url || '').trim();

  if (!name) errors.name = 'Design name is required.';
  else if (name.length > 80) errors.name = 'Name must be under 80 characters.';
  if (Number.isNaN(price) || price < 0) errors.price = 'Price must be a positive number.';
  if (!category) errors.category = 'Category is required.';
  if (Number.isNaN(duration) || duration < 15 || duration > 480) errors.duration = 'Duration must be between 15 and 480 minutes.';
  if (description.length > 1000) errors.description = 'Description must be under 1000 characters.';

  return {
    errors,
    data: {
      name,
      price: Number.isNaN(price) ? 0 : price,
      category,
      duration: Number.isNaN(duration) ? 60 : duration,
      description,
      image_url,
      is_active: body.is_active === false || body.is_active === 0 ? false : true,
    },
  };
}

router.get('/designs', async (req, res) => {
  const rows = await coll('nail_designs').find({}).sort({ created_at: -1, _id: -1 }).toArray();
  const counts = await coll('appointments')
    .aggregate([{ $group: { _id: '$nail_design_id', c: { $sum: 1 } } }])
    .toArray();
  const countMap = new Map(counts.map((c) => [c._id.toString(), c.c]));
  res.json({
    designs: rows.map((d) => ({ ...withId(d), is_active: Boolean(d.is_active), booking_count: countMap.get(d._id.toString()) || 0 })),
  });
});

router.post('/designs', async (req, res) => {
  const { errors, data } = validateDesign(req.body || {});
  if (Object.keys(errors).length) return res.status(422).json({ errors });
  const now = isoNow();
  const result = await coll('nail_designs').insertOne({ ...data, created_at: now, updated_at: now });
  const design = await coll('nail_designs').findOne({ _id: result.insertedId });
  res.status(201).json({ design: { ...withId(design), is_active: Boolean(design.is_active) } });
});

router.put('/designs/:id', async (req, res) => {
  const existing = await coll('nail_designs').findOne({ _id: oid(req.params.id) });
  if (!existing) return res.status(404).json({ error: 'Nail design not found.' });
  const { errors, data } = validateDesign(req.body || {});
  if (Object.keys(errors).length) return res.status(422).json({ errors });
  await coll('nail_designs').updateOne(
    { _id: existing._id },
    { $set: { ...data, updated_at: isoNow() } }
  );
  const design = await coll('nail_designs').findOne({ _id: existing._id });
  res.json({ design: { ...withId(design), is_active: Boolean(design.is_active) } });
});

router.delete('/designs/:id', async (req, res) => {
  const existing = await coll('nail_designs').findOne({ _id: oid(req.params.id) });
  if (!existing) return res.status(404).json({ error: 'Nail design not found.' });
  const booked = await coll('appointments').countDocuments({ nail_design_id: existing._id });
  if (booked > 0) {
    return res.status(409).json({
      error: `This design has ${booked} booking${booked > 1 ? 's' : ''} on record. Deactivate it instead of deleting.`,
    });
  }
  await coll('nail_designs').deleteOne({ _id: existing._id });
  res.json({ ok: true });
});

/* ------------------------------------------------------------------ */
/* Customers                                                           */
/* ------------------------------------------------------------------ */

router.get('/customers', async (req, res) => {
  const q = String(req.query.q || '');
  const filter = { role: 'customer' };
  if (q) {
    const re = new RegExp(escRegex(q), 'i');
    filter.$or = [{ name: re }, { email: re }, { phone: re }];
  }
  const users = await coll('users').find(filter).sort({ created_at: -1 }).toArray();
  const ids = users.map((u) => u._id);
  const apptStats = ids.length
    ? await coll('appointments')
        .aggregate([
          { $match: { customer_id: { $in: ids } } },
          {
            $group: {
              _id: '$customer_id',
              appointment_count: { $sum: 1 },
              last_appointment: { $max: '$appointment_date' },
              pending_count: {
                $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
              },
            },
          },
        ])
        .toArray()
    : [];
  const statsMap = new Map(apptStats.map((s) => [s._id.toString(), s]));

  res.json({
    customers: users.map((u) => {
      const s = statsMap.get(u._id.toString()) || {};
      return {
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        phone: u.phone,
        is_active: Boolean(u.is_active),
        created_at: u.created_at,
        appointment_count: s.appointment_count || 0,
        last_appointment: s.last_appointment || null,
        pending_count: s.pending_count || 0,
      };
    }),
  });
});

router.get('/customers/:id', async (req, res) => {
  const customer = await coll('users').findOne({ _id: oid(req.params.id), role: 'customer' });
  if (!customer) return res.status(404).json({ error: 'Customer not found.' });
  const [rows, totals] = await Promise.all([
    coll('appointments')
      .find({ customer_id: customer._id })
      .sort({ appointment_date: -1, appointment_time: -1 })
      .toArray(),
    coll('appointments')
      .aggregate([
        { $match: { customer_id: customer._id } },
        {
          $lookup: {
            from: 'nail_designs',
            localField: 'nail_design_id',
            foreignField: '_id',
            as: 'd',
          },
        },
        { $unwind: '$d' },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            completed: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
            },
            upcoming: {
              $sum: {
                $cond: [{ $in: ['$status', ['pending', 'accepted']] }, 1, 0],
              },
            },
            spent: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$d.price', 0] } },
          },
        },
      ])
      .toArray(),
  ]);
  const appointments = await joinAppointments(rows);
  const t = totals[0] || { total: 0, completed: 0, upcoming: 0, spent: 0 };
  res.json({
    customer: {
      id: customer._id.toString(),
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      is_active: Boolean(customer.is_active),
      created_at: customer.created_at,
      updated_at: customer.updated_at,
      total: t.total,
      completed: t.completed,
      upcoming: t.upcoming,
      spent: t.spent,
    },
    appointments,
  });
});

router.put('/customers/:id', async (req, res) => {
  const customer = await coll('users').findOne({ _id: oid(req.params.id), role: 'customer' });
  if (!customer) return res.status(404).json({ error: 'Customer not found.' });
  const isActive = req.body?.is_active === false || req.body?.is_active === 0 ? false : true;
  await coll('users').updateOne(
    { _id: customer._id },
    { $set: { is_active: isActive, updated_at: isoNow() } }
  );
  await notify(
    customer._id,
    isActive ? 'Account reactivated' : 'Account deactivated',
    isActive
      ? 'Welcome back! Your account has been reactivated and you can book appointments again.'
      : 'Your account has been deactivated. Please contact the salon for assistance.',
    isActive ? 'success' : 'warning'
  );
  res.json({
    customer: {
      id: customer._id.toString(),
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      is_active: isActive,
      created_at: customer.created_at,
    },
  });
});

/* ------------------------------------------------------------------ */
/* Salon settings                                                      */
/* ------------------------------------------------------------------ */

router.get('/settings', async (req, res) => {
  const [settings, hours] = await Promise.all([getSettings(), getHours()]);
  res.json({
    settings: withId(settings),
    hours: hours.map((h) => ({
      day_of_week: h._id,
      opening_time: h.opening_time,
      closing_time: h.closing_time,
      is_open: Boolean(h.is_open),
    })),
  });
});

router.put('/settings', async (req, res) => {
  const b = req.body || {};
  const errors = {};
  const int = (v, min, max, key, label) => {
    const value = v ?? null;
    const n = Number(value);
    if (value === null || Number.isNaN(n) || n < min || n > max) {
      errors[key] = `${label} must be between ${min} and ${max}.`;
      return Number.isNaN(n) ? NaN : n;
    }
    return n;
  };
  const s = await getSettings();
  const salon_name = String(b.salon_name ?? s.salon_name).trim();
  if (!salon_name) errors.salon_name = 'Salon name is required.';
  const email = String(b.email ?? s.email).trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address.';
  const phone = String(b.phone ?? s.phone).trim();
  if (phone.length < 7) errors.phone = 'Enter a valid phone number.';

  const appointment_duration = int(b.appointment_duration ?? s.appointment_duration, 15, 480, 'appointment_duration', 'Appointment duration');
  const booking_interval = int(b.booking_interval ?? s.booking_interval, 15, 240, 'booking_interval', 'Booking interval');
  const max_slots_per_slot = int(b.max_slots_per_slot ?? s.max_slots_per_slot, 1, 10, 'max_slots_per_slot', 'Max appointments per slot');
  const advance_booking_days = int(b.advance_booking_days ?? s.advance_booking_days, 1, 365, 'advance_booking_days', 'Advance booking limit');

  if (Object.keys(errors).length) return res.status(422).json({ errors });

  const allow_cancellation = b.allow_cancellation === undefined ? Boolean(s.allow_cancellation) : b.allow_cancellation !== false && b.allow_cancellation !== 0;

  await coll('salon_settings').updateOne(
    { _id: 1 },
    {
      $set: {
        salon_name,
        tagline: String(b.tagline ?? s.tagline),
        phone,
        email,
        address: String(b.address ?? s.address),
        instagram: String(b.instagram ?? s.instagram),
        facebook: String(b.facebook ?? s.facebook),
        tiktok: String(b.tiktok ?? s.tiktok),
        logo_url: String(b.logo_url ?? s.logo_url),
        appointment_duration,
        booking_interval,
        max_slots_per_slot,
        advance_booking_days,
        allow_cancellation,
        updated_at: isoNow(),
      },
    }
  );
  const [settings, hours] = await Promise.all([getSettings(), getHours()]);
  res.json({
    settings: withId(settings),
    hours: hours.map((h) => ({
      day_of_week: h._id,
      opening_time: h.opening_time,
      closing_time: h.closing_time,
      is_open: Boolean(h.is_open),
    })),
  });
});

router.put('/hours', async (req, res) => {
  const { days } = req.body || {};
  if (!Array.isArray(days) || days.length === 0) {
    return res.status(422).json({ error: 'Provide a list of days.' });
  }
  const errors = [];
  const hours = coll('business_hours');
  for (const day of days) {
    const dow = Number(day.day_of_week);
    const open = String(day.opening_time || '10:00');
    const close = String(day.closing_time || '19:00');
    if (!Number.isInteger(dow) || dow < 0 || dow > 6) {
      errors.push('Invalid day_of_week value.');
      continue;
    }
    if (!TIME_RE.test(open) || !TIME_RE.test(close)) {
      errors.push(`Invalid time for day ${dow}. Use HH:MM.`);
      continue;
    }
    const [oh, om] = open.split(':').map(Number);
    const [ch, cm] = close.split(':').map(Number);
    if (oh * 60 + om >= ch * 60 + cm) {
      errors.push(`Closing time must be after opening time for day ${dow}.`);
      continue;
    }
    await hours.updateOne(
      { _id: dow },
      { $set: { opening_time: open, closing_time: close, is_open: day.is_open ? true : false } },
      { upsert: true }
    );
  }
  if (errors.length) return res.status(422).json({ error: errors.join(' ') });
  const all = await getHours();
  res.json({
    hours: all.map((h) => ({
      day_of_week: h._id,
      opening_time: h.opening_time,
      closing_time: h.closing_time,
      is_open: Boolean(h.is_open),
    })),
  });
});

export default router;
