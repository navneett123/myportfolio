import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const INVEST_FILE = path.join(DATA_DIR, 'investments.json');

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(INVEST_FILE)) fs.writeFileSync(INVEST_FILE, JSON.stringify({ items: [] }, null, 2));
}
function readInvestments() {
  ensureFile();
  try { return JSON.parse(fs.readFileSync(INVEST_FILE, 'utf8')); }
  catch { return { items: [] }; }
}
function writeInvestments(data) {
  ensureFile();
  fs.writeFileSync(INVEST_FILE, JSON.stringify(data, null, 2));
}

// POST /api/investments/allocate  { asset, amountUSD }
router.post('/allocate', (req, res) => {
  const { asset = 'unknown', amountUSD = 0 } = req.body || {};
  const amt = Math.max(0, Number(amountUSD) || 0);
  if (!amt) return res.status(400).json({ error: 'amountUSD required' });

  const db = readInvestments();
  db.items.push({ ts: new Date().toISOString(), asset, amountUSD: amt });
  writeInvestments(db);
  res.json({ ok: true });
});

// GET /api/investments/total  -> { totalUSD, byAsset: { gold: 100, ... } }
router.get('/total', (_req, res) => {
  const db = readInvestments();
  const byAsset = {};
  let total = 0;
  for (const it of db.items) {
    const k = it.asset || 'unknown';
    byAsset[k] = (byAsset[k] || 0) + (Number(it.amountUSD) || 0);
    total += Number(it.amountUSD) || 0;
  }
  res.json({ totalUSD: total, byAsset });
});

router.get('/list', (_req, res) => {
  const db = readInvestments();
  res.json(db.items.sort((a,b)=>a.ts<b.ts?-1:1));
});

export default router;
