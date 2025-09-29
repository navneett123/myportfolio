
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MONTHS_FY, assertFYStart, emptyRow } from '../utils/fy.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA = path.join(__dirname, '..', 'data', 'ledger.json');

function loadDB(){ if(!fs.existsSync(DATA)) return {}; return JSON.parse(fs.readFileSync(DATA,'utf8')); }

router.get('/summary', (req,res)=>{
  const fyStart = req.query.fyStart || '2025-04-01'; try{ assertFYStart(fyStart);}catch(e){return res.status(400).json({error:e.message});}
  const db = loadDB(); const rows = db[fyStart] || {}; const cats = ['gas','electricity','food','rent','transport','health','education','shopping','misc'];
  let income=0, expenses=0; const catTotals = Object.fromEntries(cats.map(c=>[c,0]));
  for(let m=1;m<=12;m++){ const r = rows[m] || emptyRow(); income += +r.income||0; const e = cats.reduce((s,k)=> s + (+r[k]||0),0); expenses += e; cats.forEach(c=> catTotals[c] += +r[c]||0); }
  const savings = income - expenses; const savingsRate = income>0 ? (savings/income)*100 : 0; const burnPerDay = (expenses/12)/30; const runwayMonths = burnPerDay>0 ? (Math.max(0,savings)/(burnPerDay*30)) : 0;
  res.json({ income, expenses, savings, savingsRate, burnPerDay, runwayMonths, categoryTotals: catTotals });
});

router.get('/trend', (req,res)=>{
  const fyStart = req.query.fyStart || '2025-04-01'; try{ assertFYStart(fyStart);}catch(e){return res.status(400).json({error:e.message});}
  const db = loadDB(); const rows = db[fyStart] || {}; const cats = ['gas','electricity','food','rent','transport','health','education','shopping','misc']; const data = [];
  for(let m=1;m<=12;m++){ const r = rows[m] || emptyRow(); const e = cats.reduce((s,k)=> s + (+r[k]||0),0); data.push({ month:m, label: MONTHS_FY[m-1].label, income:+r.income||0, expenses:e }); }
  res.json(data);
});

router.get('/split', (req,res)=>{
  const fyStart = req.query.fyStart || '2025-04-01'; try{ assertFYStart(fyStart);}catch(e){return res.status(400).json({error:e.message});}
  const db = loadDB(); const rows = db[fyStart] || {}; const cats = ['gas','electricity','food','rent','transport','health','education','shopping','misc']; const totals = Object.fromEntries(cats.map(c=>[c,0]));
  for(let m=1;m<=12;m++){ const r = rows[m] || emptyRow(); cats.forEach(c=> totals[c] += +r[c]||0); }
  res.json(totals);
});

export default router;
