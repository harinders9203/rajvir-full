import { Router } from 'express';
import { coll, oid, withId } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

const shape = (n) => ({ ...withId(n), is_read: Boolean(n.is_read) });

// GET /notifications — current user's notifications
router.get('/notifications', requireAuth, async (req, res) => {
  const rows = await coll('notifications')
    .find({ user_id: oid(req.user.id) })
    .sort({ created_at: -1, _id: -1 })
    .limit(50)
    .toArray();
  const unread = await coll('notifications').countDocuments({
    user_id: oid(req.user.id),
    is_read: false,
  });
  res.json({ notifications: rows.map(shape), unread });
});

// PUT /notifications/:id/read
router.put('/notifications/:id/read', requireAuth, async (req, res) => {
  const result = await coll('notifications').updateOne(
    { _id: oid(req.params.id), user_id: oid(req.user.id) },
    { $set: { is_read: true } }
  );
  if (result.matchedCount === 0) return res.status(404).json({ error: 'Notification not found.' });
  res.json({ ok: true });
});

// PUT /notifications/read-all
router.put('/notifications/read-all', requireAuth, async (req, res) => {
  await coll('notifications').updateMany(
    { user_id: oid(req.user.id), is_read: false },
    { $set: { is_read: true } }
  );
  res.json({ ok: true });
});

/* ------------------------- admin variants ------------------------- */

// GET /admin/notifications
router.get('/admin/notifications', requireAuth, requireAdmin, async (req, res) => {
  const rows = await coll('notifications')
    .find({ user_id: oid(req.user.id) })
    .sort({ created_at: -1, _id: -1 })
    .limit(50)
    .toArray();
  const unread = await coll('notifications').countDocuments({
    user_id: oid(req.user.id),
    is_read: false,
  });
  res.json({ notifications: rows.map(shape), unread });
});

router.put('/admin/notifications/:id/read', requireAuth, requireAdmin, async (req, res) => {
  await coll('notifications').updateOne(
    { _id: oid(req.params.id), user_id: oid(req.user.id) },
    { $set: { is_read: true } }
  );
  res.json({ ok: true });
});

router.put('/admin/notifications/read-all', requireAuth, requireAdmin, async (req, res) => {
  await coll('notifications').updateMany(
    { user_id: oid(req.user.id), is_read: false },
    { $set: { is_read: true } }
  );
  res.json({ ok: true });
});

export default router;
