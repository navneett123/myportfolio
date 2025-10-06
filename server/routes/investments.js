import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const INVEST_FILE = path.join(DATA_DIR, 'investments.json');

function ensure() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(INVEST_FILE)) fs.writeFileSync(INVEST_FILE, JSON.stringify({ items: [] }, null, 2));
}
function readDb() {
  ensure();
  try { return JSON.parse(fs.readFileSync(INVEST_FILE, 'utf8')); }
  catch { return { items: [] }; }
}
function writeDb(db) {
  ensure();
  fs.writeFileSync(INVEST_FILE, JSON.stringify(db, null, 2));
}

/** POST /api/investments/allocate { asset, amountUSD } */
router.post('/allocate', (req, res) => {
  const { asset = 'unknown', amountUSD = 0 } = req.body || {};
  const amt = Math.max(0, Number(amountUSD) || 0);
  if (!amt) return res.status(400).json({ error: 'amountUSD required' });

  const db = readDb();
  db.items.push({ ts: new Date().toISOString(), asset, amountUSD: amt });
  writeDb(db);
  res.json({ ok: true });
});

/** GET /api/investments/total -> { totalUSD, byAsset } */
router.get('/total', (_req, res) => {
  const { items } = readDb();
  const byAsset = {};
  let totalUSD = 0;
  for (const it of items) {
    const k = it.asset || 'unknown';
    byAsset[k] = (byAsset[k] || 0) + (Number(it.amountUSD) || 0);
    totalUSD += Number(it.amountUSD) || 0;
  }
  res.json({ totalUSD, byAsset });
});

/** POST /api/investments/reset -> wipe all investments */
router.post('/reset', (_req, res) => {
  writeDb({ items: [] });
  res.json({ ok: true });
});

export default router;
