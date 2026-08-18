import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connect, disconnect, coll, isoNow } from './db.js';

const UNSPLASH = (id, w = 900) =>
  `https://images.unsplash.com/${id}?q=80&w=${w}&auto=format&fit=crop`;

const designs = [
  {
    name: 'Classic French Tips',
    description: 'Timeless white-tipped nails hand-painted for a clean, polished everyday look.',
    price: 45,
    category: 'French Tips',
    duration: 60,
    image_url: UNSPLASH('photo-1604654894610-df63bc536371'),
  },
  {
    name: 'Milky Pink Gel',
    description: 'A sheer milky-pink gel overlay that looks natural, glossy and effortlessly chic.',
    price: 50,
    category: 'Gel Nails',
    duration: 75,
    image_url: UNSPLASH('photo-1610992015732-2449b76344bc'),
  },
  {
    name: 'Chrome Mirror Shine',
    description: 'Liquid-metal chrome finish with a mirror-glass shine that turns heads.',
    price: 65,
    category: 'Nail Art',
    duration: 90,
    image_url: UNSPLASH('photo-1632345031435-8727f6897d53'),
  },
  {
    name: 'Soft Ombre Fade',
    description: 'A dreamy gradient from blush pink to cream — soft, romantic and photo-ready.',
    price: 60,
    category: 'Custom Designs',
    duration: 90,
    image_url: UNSPLASH('photo-1607779097040-26e80aa78e66'),
  },
  {
    name: 'Bridal Pearl Elegance',
    description: 'Pearl and crystal accents on a nude base, designed for your perfect day.',
    price: 120,
    category: 'Bridal Nails',
    duration: 120,
    image_url: UNSPLASH('photo-1519014816548-bf5fe059798b'),
  },
  {
    name: 'Coffin Acrylic Extensions',
    description: 'Long-lasting coffin-shaped acrylics with a high-shine finish and your choice of color.',
    price: 85,
    category: 'Acrylic Nails',
    duration: 120,
    image_url: UNSPLASH('photo-1522337660859-02fbefca4702'),
  },
  {
    name: 'Minimal Nude Almond',
    description: 'Short almond nails in a soft nude tone — minimal, modern, and low-maintenance.',
    price: 40,
    category: 'Minimal Nails',
    duration: 45,
    image_url: UNSPLASH('photo-1604902396830-aca29e19b067'),
  },
  {
    name: 'Rose Gold Extensions',
    description: 'Luxury rose-gold gel extensions with encapsulated shimmer and a glossy top coat.',
    price: 95,
    category: 'Extensions',
    duration: 135,
    image_url: UNSPLASH('photo-1636016909418-4dfae21e0e78'),
  },
  {
    name: 'Stiletto Art Accent',
    description: 'Bold stiletto nails with hand-drawn art accents — perfect for the fearless.',
    price: 75,
    category: 'Nail Art',
    duration: 105,
    image_url: UNSPLASH('photo-1604908174453-a6a2a9057b19'),
  },
  {
    name: 'Velvet Matte French',
    description: 'Matte velvet-finish French tips in a warm beige for a sophisticated twist.',
    price: 55,
    category: 'French Tips',
    duration: 75,
    image_url: UNSPLASH('photo-1604654894610-df63bc536371'),
  },
  {
    name: 'Baby Boomer Set',
    description: 'The classic pink-and-white baby boomer fade, blended to perfection.',
    price: 70,
    category: 'Bridal Nails',
    duration: 105,
    image_url: UNSPLASH('photo-1519014816548-bf5fe059798b'),
  },
  {
    name: 'Sunset Watercolor Art',
    description: 'Watercolor sunset tones painted on a sheer base — wearable art for your hands.',
    price: 68,
    category: 'Custom Designs',
    duration: 100,
    image_url: UNSPLASH('photo-1522337660859-02fbefca4702'),
  },
];

const customers = [
  { name: 'Sophia Bennett', email: 'sophia@example.com', phone: '+1 (555) 010-2201', password: 'password123' },
  { name: 'Emma Carter', email: 'emma@example.com', phone: '+1 (555) 010-2202', password: 'password123' },
  { name: 'Olivia Reyes', email: 'olivia@example.com', phone: '+1 (555) 010-2203', password: 'password123' },
];

const localISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return localISO(d);
}

export async function runSeed({ force = false } = {}) {
  await connect();
  const now = isoNow();
  const designsColl = coll('nail_designs');

  const count = await designsColl.countDocuments();
  if (count > 0 && !force) {
    console.log('Database already seeded — skipping (use `npm run seed -- --force` to reseed).');
    await disconnect();
    return;
  }

  if (force) {
    await Promise.all([
      coll('notifications').deleteMany({}),
      coll('appointments').deleteMany({}),
      coll('slot_state').deleteMany({}),
      coll('nail_designs').deleteMany({}),
      coll('users').deleteMany({}),
    ]);
  }

  const admin = await coll('users').insertOne({
    name: 'Blush Admin',
    email: 'admin@blush.com',
    phone: '+1 (555) 010-0000',
    password_hash: bcrypt.hashSync('admin123', 10),
    role: 'admin',
    is_active: true,
    created_at: now,
    updated_at: now,
  });

  const customerIds = [];
  for (const c of customers) {
    const r = await coll('users').insertOne({
      name: c.name,
      email: c.email,
      phone: c.phone,
      password_hash: bcrypt.hashSync(c.password, 10),
      role: 'customer',
      is_active: true,
      created_at: now,
      updated_at: now,
    });
    customerIds.push(r.insertedId);
  }

  const designIds = [];
  for (const d of designs) {
    const r = await coll('nail_designs').insertOne({
      ...d,
      is_active: true,
      created_at: now,
      updated_at: now,
    });
    designIds.push(r.insertedId);
  }

  const today = localISO(new Date());
  const date = (offset) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    // Skip to a weekday if offset lands on the weekend
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    return localISO(d);
  };

  // (customer, design) are 1-based indexes into customerIds / designIds
  const seedAppointments = [
    { customer: 1, design: 1, offset: 1, time: '10:00', status: 'accepted' },
    { customer: 2, design: 3, offset: 1, time: '12:00', status: 'pending' },
    { customer: 3, design: 2, offset: 2, time: '11:00', status: 'accepted' },
    { customer: 1, design: 5, offset: 3, time: '14:00', status: 'pending' },
    { customer: 2, design: 7, offset: 4, time: '15:00', status: 'completed' },
    { customer: 3, design: 4, offset: 5, time: '16:00', status: 'cancelled' },
    { customer: 1, design: 6, offset: -1, time: '13:00', status: 'completed' },
    { customer: 2, design: 9, offset: -2, time: '17:00', status: 'completed' },
  ];

  const apptColl = coll('appointments');
  for (const [i, a] of seedAppointments.entries()) {
    const apptDate = a.offset >= 0 ? date(a.offset) : daysFromNow(a.offset);
    await apptColl.insertOne({
      customer_id: customerIds[a.customer - 1],
      nail_design_id: designIds[a.design - 1],
      appointment_date: apptDate,
      appointment_time: a.time,
      status: a.status,
      customer_notes: i % 2 === 0 ? '' : 'Please use a soft nude tone if possible — thank you!',
      admin_notes: '',
      created_at: now,
      updated_at: now,
    });
  }

  // A couple of today's appointments so the admin "Today" panel feels alive
  const todayTimes = ['10:00', '14:00'];
  for (const [i, t] of todayTimes.entries()) {
    await apptColl.insertOne({
      customer_id: customerIds[i],
      nail_design_id: designIds[i],
      appointment_date: today,
      appointment_time: t,
      status: 'accepted',
      customer_notes: '',
      admin_notes: '',
      created_at: now,
      updated_at: now,
    });
  }

  // Rebuild the per-slot counters from the appointments collection so
  // availability matches reality (this is the atomic booking gate).
  const booked = await apptColl
    .aggregate([
      { $match: { status: { $in: ['pending', 'accepted'] } } },
      { $group: { _id: { date: '$appointment_date', time: '$appointment_time' }, n: { $sum: 1 } } },
    ])
    .toArray();
  for (const b of booked) {
    await coll('slot_state').updateOne(
      { _id: `${b._id.date}|${b._id.time}` },
      { $set: { count: b.n } },
      { upsert: true }
    );
  }

  await coll('notifications').insertOne({
    user_id: customerIds[0],
    title: 'Welcome to Blush!',
    message: 'Your account is ready. Browse our nail designs and book your first appointment. 💅',
    type: 'success',
    is_read: false,
    created_at: now,
  });

  console.log(`Seed complete on MongoDB (db: nails, cluster: cluster0.xhqrqbs.mongodb.net)`);
  console.log('  admin@blush.com / admin123 · sophia@example.com / password123');
  await disconnect();
}

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  runSeed({ force: process.argv.includes('--force') }).catch((err) => {
    console.error('Seed failed:', err.message);
    process.exit(1);
  });
}
