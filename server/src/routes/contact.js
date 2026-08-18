import { Router } from 'express';
import { coll, isoNow } from '../db.js';

const router = Router();

router.post('/contact', async (req, res) => {
  const { name, email, message } = req.body || {};

  if (!String(name || '').trim() || !String(email || '').trim() || !String(message || '').trim()) {
    return res.status(422).json({ error: 'Please fill in all fields.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(String(email).trim())) {
    return res.status(422).json({ error: 'Please enter a valid email address.' });
  }

  const payload = {
    name: String(name).trim(),
    email: String(email).trim(),
    message: String(message).trim(),
    created_at: isoNow(),
    updated_at: isoNow(),
  };

  const result = await coll('contact_messages').insertOne(payload);

  res.status(201).json({
    ok: true,
    id: result.insertedId.toString(),
    message: 'Your message has been saved successfully.',
  });
});

export default router;
