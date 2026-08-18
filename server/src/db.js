import { MongoClient, ObjectId } from 'mongodb';

const DEFAULT_URI =
  process.env.MONGODB_URI ||
  'mongodb://singhharinder662_db_user:PASSWORD@ac-q1axzju-shard-00-00.xhqrqbs.mongodb.net:27017,ac-q1axzju-shard-00-01.xhqrqbs.mongodb.net:27017,ac-q1axzju-shard-00-02.xhqrqbs.mongodb.net:27017/?replicaSet=atlas-vymrr4-shard-0&authSource=admin&tls=true&retryWrites=true';

export const client = new MongoClient(DEFAULT_URI, {
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000,
  maxPoolSize: 20,
});

/** The connected database handle (null until connect() resolves). */
export let db = null;

export { ObjectId };

/** Safe ObjectId factory — returns null for invalid ids (callers treat as not-found). */
export function oid(id) {
  if (!id) return null;
  try {
    return new ObjectId(String(id));
  } catch {
    return null;
  }
}

/** Map a Mongo document to an API shape that includes a string `id`. */
export function withId(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { ...rest, id: _id === undefined || _id === null ? undefined : _id.toString() };
}

export function coll(name) {
  if (!db) throw new Error('Database not connected yet.');
  return db.collection(name);
}

/** ISO timestamp used across the API (matches what the client already parses). */
export function isoNow() {
  return new Date().toISOString();
}

const DEFAULT_SETTINGS = {
  salon_name: 'Blush Nail Studio',
  logo_url: '',
  tagline: 'Beautiful Nails. Beautiful You.',
  phone: '+1 (555) 012-3456',
  email: 'hello@blushnails.com',
  address: '24 Rosewood Avenue, Beverly Hills, CA 90210',
  instagram: 'https://instagram.com',
  facebook: 'https://facebook.com',
  tiktok: 'https://tiktok.com',
  appointment_duration: 60,
  booking_interval: 60,
  max_slots_per_slot: 1,
  advance_booking_days: 60,
  allow_cancellation: true,
  updated_at: new Date().toISOString(),
};

/** Create collections + indexes. Idempotent. */
export async function migrate() {
  const users = coll('users');
  const designs = coll('nail_designs');
  const appointments = coll('appointments');
  const notifications = coll('notifications');
  const contactMessages = coll('contact_messages');

  await Promise.all([
    // case-insensitive unique email
    users.createIndex({ email: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } }),
    // A customer cannot hold the same slot twice while it is pending/accepted.
    appointments.createIndex(
      { customer_id: 1, appointment_date: 1, appointment_time: 1 },
      { unique: true, partialFilterExpression: { status: { $in: ['pending', 'accepted'] } } }
    ),
    appointments.createIndex({ appointment_date: 1, appointment_time: 1 }),
    appointments.createIndex({ status: 1 }),
    appointments.createIndex({ customer_id: 1 }),
    appointments.createIndex({ nail_design_id: 1 }),
    designs.createIndex({ category: 1 }),
    designs.createIndex({ is_active: 1 }),
    notifications.createIndex({ user_id: 1, is_read: 1 }),
    notifications.createIndex({ user_id: 1, created_at: -1 }),
    contactMessages.createIndex({ created_at: -1 }),
  ]);

  // Singleton salon settings document
  await coll('salon_settings').updateOne(
    { _id: 1 },
    { $setOnInsert: DEFAULT_SETTINGS },
    { upsert: true }
  );

  // One document per weekday (0 = Sunday), keyed by _id = day_of_week
  const hours = coll('business_hours');
  for (let d = 0; d <= 6; d++) {
    await hours.updateOne(
      { _id: d },
      {
        $setOnInsert: {
          opening_time: '10:00',
          closing_time: d === 0 ? '17:00' : '19:00',
          is_open: true,
        },
      },
      { upsert: true }
    );
  }
}

export async function connect() {
  await client.connect();
  db = client.db(process.env.MONGODB_DB || 'nails');
  await migrate();
  return db;
}

export async function disconnect() {
  await client.close();
}
