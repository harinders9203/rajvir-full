import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { coll, oid, isoNow, withId } from '../db.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { EMAIL_RE, notify } from '../lib/helpers.js';

const router = Router();

function userShape(u) {
  if (!u) return null;
  return {
    id: u._id.toString(),
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    is_active: u.is_active,
    created_at: u.created_at,
  };
}

async function findUserByEmail(email) {
  return coll('users').findOne(
    { email: String(email).trim() },
    { collation: { locale: 'en', strength: 2 } }
  );
}

const EMAIL_TAKEN = (email) => ({ errors: { email: 'An account with this email already exists.' } });

// POST /auth/signup
router.post('/signup', async (req, res) => {
  const { name, email, phone, password, confirm_password } = req.body || {};

  const errors = {};
  if (!name || !name.trim()) errors.name = 'Full name is required.';
  else if (name.trim().length < 2) errors.name = 'Name must be at least 2 characters.';
  if (!email || !EMAIL_RE.test(String(email).trim())) errors.email = 'Enter a valid email address.';
  if (!phone || String(phone).trim().length < 7) errors.phone = 'Enter a valid phone number.';
  if (!password || String(password).length < 8) errors.password = 'Password must be at least 8 characters.';
  if (password !== confirm_password) errors.confirm_password = 'Passwords do not match.';
  if (Object.keys(errors).length) return res.status(422).json({ errors });

  const cleanEmail = String(email).trim();
  if (await findUserByEmail(cleanEmail)) {
    return res.status(409).json(EMAIL_TAKEN(cleanEmail));
  }

  const hash = bcrypt.hashSync(String(password), 10);
  const now = isoNow();
  let result;
  try {
    result = await coll('users').insertOne({
      name: name.trim(),
      email: cleanEmail,
      phone: String(phone).trim(),
      password_hash: hash,
      role: 'customer',
      is_active: true,
      created_at: now,
      updated_at: now,
    });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json(EMAIL_TAKEN(cleanEmail));
    throw err;
  }
  const user = await coll('users').findOne({ _id: result.insertedId });
  await notify(user._id, 'Welcome to the studio!', `Hi ${user.name.split(' ')[0]}, your account is ready — browse designs and book your first appointment.`, 'success');
  res.status(201).json({ token: signToken(userShape(user)), user: userShape(user) });
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(422).json({ errors: { form: 'Email and password are required.' } });
  }
  const user = await findUserByEmail(String(email).trim());
  const ok = user && bcrypt.compareSync(String(password), user.password_hash);
  if (!ok) {
    return res.status(401).json({ errors: { form: 'Invalid email or password.' } });
  }
  if (!user.is_active) {
    return res.status(403).json({ errors: { form: 'This account has been deactivated.' } });
  }
  res.json({ token: signToken(userShape(user)), user: userShape(user) });
});

// POST /auth/logout — stateless JWT; client discards token. Provided for API parity.
router.post('/logout', requireAuth, (req, res) => {
  res.json({ ok: true });
});

// POST /auth/forgot-password — issues a one-time reset token (demo-safe).
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body || {};
  if (!email || !EMAIL_RE.test(String(email))) {
    return res.status(422).json({ errors: { email: 'Enter a valid email address.' } });
  }
  const user = await findUserByEmail(String(email).trim());
  if (!user) {
    // Do not reveal whether the account exists
    return res.json({ ok: true, message: 'If that email exists, a reset link has been sent.' });
  }
  const resetToken = signToken({ id: user._id.toString(), role: user.role, purpose: 'reset' });
  await notify(
    user._id,
    'Password reset requested',
    `A password reset was requested for your account. If this was you, use the reset link from the email. If not, you can ignore this message.`,
    'warning'
  );
  console.log(`[forgot-password] Reset link for ${user.email}: /reset-password?token=${resetToken}`);
  res.json({ ok: true, message: 'If that email exists, a reset link has been sent.' });
});

// POST /auth/reset-password — completes a password reset.
router.post('/reset-password', async (req, res) => {
  const { token, password, confirm_password } = req.body || {};
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET || 'blush-dev-secret-change-me');
  } catch {
    return res.status(401).json({ errors: { form: 'This reset link is invalid or has expired.' } });
  }
  if (!password || String(password).length < 8) {
    return res.status(422).json({ errors: { password: 'Password must be at least 8 characters.' } });
  }
  if (password !== confirm_password) {
    return res.status(422).json({ errors: { confirm_password: 'Passwords do not match.' } });
  }
  const hash = bcrypt.hashSync(String(password), 10);
  await coll('users').updateOne(
    { _id: oid(payload.id) },
    { $set: { password_hash: hash, updated_at: isoNow() } }
  );
  await notify(payload.id, 'Password updated', 'Your password was changed successfully.', 'success');
  res.json({ ok: true });
});

// GET /auth/me — restore session
router.get('/me', requireAuth, async (req, res) => {
  const user = await coll('users').findOne({ _id: oid(req.user.id) });
  if (!user) return res.status(401).json({ error: 'Account no longer exists.' });
  res.json({ user: userShape(user) });
});

// PUT /profile — update own profile
router.put('/profile', requireAuth, async (req, res) => {
  const { name, phone, email } = req.body || {};
  const errors = {};
  if (!name || String(name).trim().length < 2) errors.name = 'Name must be at least 2 characters.';
  if (!phone || String(phone).trim().length < 7) errors.phone = 'Enter a valid phone number.';
  if (!email || !EMAIL_RE.test(String(email).trim())) errors.email = 'Enter a valid email address.';
  if (Object.keys(errors).length) return res.status(422).json({ errors });

  const cleanEmail = String(email).trim();
  const existing = await coll('users').findOne(
    { email: cleanEmail, _id: { $ne: oid(req.user.id) } },
    { collation: { locale: 'en', strength: 2 } }
  );
  if (existing) return res.status(409).json({ errors: { email: 'This email is already in use.' } });

  await coll('users').updateOne(
    { _id: oid(req.user.id) },
    { $set: { name: String(name).trim(), phone: String(phone).trim(), email: cleanEmail, updated_at: isoNow() } }
  );
  const user = await coll('users').findOne({ _id: oid(req.user.id) });
  res.json({ user: userShape(user) });
});

export default router;
