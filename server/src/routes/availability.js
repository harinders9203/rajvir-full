import { Router } from 'express';
import { generateSlots, getSettings, hoursForDay, isValidDateString } from '../lib/helpers.js';

const router = Router();

// GET /availability?date=YYYY-MM-DD
router.get('/availability', async (req, res) => {
  const { date } = req.query;
  if (!date || !isValidDateString(String(date))) {
    return res.status(422).json({ error: 'A valid date (YYYY-MM-DD) is required.' });
  }
  const day = new Date(`${date}T00:00:00`).getDay();
  const hours = await hoursForDay(day);
  const settings = await getSettings();
  const slots = await generateSlots(String(date));
  res.json({
    date,
    is_open: Boolean(hours && hours.is_open),
    opening_time: hours ? hours.opening_time : null,
    closing_time: hours ? hours.closing_time : null,
    ...slots,
    settings: {
      appointment_duration: settings.appointment_duration,
      booking_interval: settings.booking_interval,
      max_slots_per_slot: settings.max_slots_per_slot,
      advance_booking_days: settings.advance_booking_days,
    },
  });
});

export default router;
