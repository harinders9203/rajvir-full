import { Router } from 'express';
import { withId } from '../db.js';
import { getSettings, getHours } from '../lib/helpers.js';

const router = Router();

// GET /settings — public salon info + business hours (drives the customer site)
router.get('/settings', async (req, res) => {
  const s = await getSettings();
  const hours = await getHours();
  res.json({
    settings: {
      ...withId(s),
      allow_cancellation: Boolean(s.allow_cancellation),
    },
    hours: hours.map((h) => ({
      day_of_week: h._id,
      opening_time: h.opening_time,
      closing_time: h.closing_time,
      is_open: Boolean(h.is_open),
    })),
  });
});

export default router;
