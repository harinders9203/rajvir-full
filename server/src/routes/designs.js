import { Router } from 'express';
import { coll, oid, withId } from '../db.js';
import { escRegex } from '../lib/helpers.js';

const router = Router();

const designShape = (d) => {
  const doc = withId(d);
  return { ...doc, is_active: Boolean(doc.is_active) };
};

// GET /nail-designs?category=&q=&min=&max=
router.get('/nail-designs', async (req, res) => {
  const { category, q, min, max, include_inactive } = req.query;
  const filter = {};

  if (include_inactive !== 'true') {
    filter.is_active = true;
  }
  if (category && category !== 'All') {
    filter.category = String(category);
  }
  if (q) {
    const re = new RegExp(escRegex(String(q)), 'i');
    filter.$or = [{ name: re }, { description: re }, { category: re }];
  }
  const price = {};
  if (min !== undefined && min !== '') price.$gte = Number(min);
  if (max !== undefined && max !== '') price.$lte = Number(max);
  if (Object.keys(price).length) filter.price = price;

  const rows = await coll('nail_designs')
    .find(filter)
    .sort({ created_at: -1, _id: -1 })
    .toArray();
  const categories = await coll('nail_designs').distinct('category', { is_active: true });
  categories.sort();
  res.json({ designs: rows.map(designShape), categories });
});

// GET /nail-designs/:id
router.get('/nail-designs/:id', async (req, res) => {
  const row = await coll('nail_designs').findOne({ _id: oid(req.params.id) });
  if (!row) return res.status(404).json({ error: 'Nail design not found.' });
  res.json({ design: designShape(row) });
});

// GET /design-categories
router.get('/design-categories', async (req, res) => {
  const rows = await coll('nail_designs').distinct('category');
  rows.sort();
  res.json({ categories: rows });
});

export default router;
