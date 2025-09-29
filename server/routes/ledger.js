
import fs from 'fs';
import path from 'path';
import express from 'express';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { assertFYStart, sanitizeNumber, emptyRow } from '../utils/fy.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA = path.join(__dirname, '..', 'data', 'ledger.json');

function loadDB(){ if(!fs.existsSync(DATA)) return {}; return JSON.parse(fs.readFileSync(DATA,'utf8')); }
function saveDB(db){ fs.writeFileSync(DATA, JSON.stringify(db, null, 2)); }

router.get('/', (req, res) => {
  const fyStart = req.query.fyStart || '2025-04-01';
  try { assertFYStart(fyStart); } catch(e){ return res.status(400).json({ error: e.message }); }
  const db = loadDB();
  if (!db[fyStart]) { db[fyStart] = {}; for (let m=1;m<=12;m++) db[fyStart][m] = emptyRow(); saveDB(db); }
  res.json(db[fyStart]);
});

router.put('/:month', (req, res) => {
  const fyStart = req.body.fyStart || '2025-04-01';
  const month = Number(req.params.month);
  try { assertFYStart(fyStart); } catch(e){ return res.status(400).json({ error: e.message }); }
  if (!(month>=1 && month<=12)) return res.status(400).json({ error: 'month must be 1..12 (1=Apr)' });

  const db = loadDB(); if (!db[fyStart]) db[fyStart] = {};
  const prev = db[fyStart][month] || emptyRow();
  db[fyStart][month] = {
    income: sanitizeNumber(req.body.income ?? req.body.income_total ?? prev.income),
    gas: sanitizeNumber(req.body.gas ?? req.body.exp_gas ?? prev.gas),
    electricity: sanitizeNumber(req.body.electricity ?? req.body.exp_electricity ?? prev.electricity),
    food: sanitizeNumber(req.body.food ?? req.body.exp_food ?? prev.food),
    rent: sanitizeNumber(req.body.rent ?? req.body.exp_rent ?? prev.rent),
    transport: sanitizeNumber(req.body.transport ?? req.body.exp_transport ?? prev.transport),
    health: sanitizeNumber(req.body.health ?? req.body.exp_health ?? prev.health),
    education: sanitizeNumber(req.body.education ?? req.body.exp_education ?? prev.education),
    shopping: sanitizeNumber(req.body.shopping ?? req.body.exp_shopping ?? prev.shopping),
    misc: sanitizeNumber(req.body.misc ?? req.body.exp_misc ?? prev.misc),
    notes: String(req.body.notes ?? prev.notes).slice(0,200)
  };
  saveDB(db);
  res.json({ ok:true, month, row: db[fyStart][month] });
});

router.put('/bulk', (req, res) => {
  const fyStart = req.body.fyStart || '2025-04-01';
  try { assertFYStart(fyStart); } catch(e){ return res.status(400).json({ error: e.message }); }
  const rows = req.body.rows || {};
  const db = loadDB(); if (!db[fyStart]) db[fyStart] = {};
  for (const k of Object.keys(rows)) {
    const m = Number(k); if(!(m>=1 && m<=12)) continue;
    const v = rows[k]; const prev = db[fyStart][m] || emptyRow();
    db[fyStart][m] = {
      income: sanitizeNumber(v.income ?? prev.income),
      gas: sanitizeNumber(v.gas ?? prev.gas),
      electricity: sanitizeNumber(v.electricity ?? prev.electricity),
      food: sanitizeNumber(v.food ?? prev.food),
      rent: sanitizeNumber(v.rent ?? prev.rent),
      transport: sanitizeNumber(v.transport ?? prev.transport),
      health: sanitizeNumber(v.health ?? prev.health),
      education: sanitizeNumber(v.education ?? prev.education),
      shopping: sanitizeNumber(v.shopping ?? prev.shopping),
      misc: sanitizeNumber(v.misc ?? prev.misc),
      notes: String(v.notes ?? prev.notes).slice(0,200)
    };
  }
  saveDB(db);
  res.json({ ok:true });
});

const upload = multer({ storage: multer.memoryStorage() });
router.post('/import/csv', upload.single('file'), (req, res) => {
  const fyStart = req.query.fyStart || '2025-04-01';
  try { assertFYStart(fyStart); } catch(e){ return res.status(400).json({ error: e.message }); }
  if (!req.file) return res.status(400).json({ error: 'file required' });

  const text = req.file.buffer.toString('utf8').trim();
  const lines = text.split(/\r?\n/);
  const header = lines.shift().split(',');
  const need = ['Month','Income','Gas','Electricity','Food','Rent','Transport','Health','Education','Shopping','Misc','Notes'];
  const idx = {}; need.forEach(h => idx[h] = header.indexOf(h));
  const map = {'Apr':1,'May':2,'Jun':3,'Jul':4,'Aug':5,'Sep':6,'Oct':7,'Nov':8,'Dec':9,'Jan':10,'Feb':11,'Mar':12};

  const db = loadDB(); if (!db[fyStart]) db[fyStart] = {};
  for (const line of lines) {
    if (!line.trim()) continue;
    const c = line.split(',');
    const m = map[c[idx['Month']]]; if (!m) continue;
    db[fyStart][m] = {
      income: +c[idx['Income']]||0, gas: +c[idx['Gas']]||0, electricity: +c[idx['Electricity']]||0,
      food: +c[idx['Food']]||0, rent: +c[idx['Rent']]||0, transport: +c[idx['Transport']]||0,
      health: +c[idx['Health']]||0, education: +c[idx['Education']]||0, shopping: +c[idx['Shopping']]||0,
      misc: +c[idx['Misc']]||0, notes: (c[idx['Notes']]||'').slice(0,200)
    };
  }
  saveDB(db);
  res.json({ ok:true });
});

router.get('/export/csv', (req, res) => {
  const fyStart = req.query.fyStart || '2025-04-01';
  try { assertFYStart(fyStart); } catch(e){ return res.status(400).json({ error: e.message }); }
  const db = loadDB(); const rows = db[fyStart] || {};
  const head = 'Month,Income,Gas,Electricity,Food,Rent,Transport,Health,Education,Shopping,Misc,Notes';
  const label = {1:'Apr',2:'May',3:'Jun',4:'Jul',5:'Aug',6:'Sep',7:'Oct',8:'Nov',9:'Dec',10:'Jan',11:'Feb',12:'Mar'};
  const out = [head];
  for (let m=1;m<=12;m++){
    const r = rows[m] || emptyRow();
    out.push([label[m], r.income, r.gas, r.electricity, r.food, r.rent, r.transport, r.health, r.education, r.shopping, r.misc, `"${(r.notes||'').replace(/"/g,'\"')}"`].join(','));
  }
  res.setHeader('Content-Type','text/csv');
  res.setHeader('Content-Disposition',`attachment; filename="ledger-${fyStart}.csv"`);
  res.send(out.join('\n'));
});

export default router;
