
import express from 'express';
const router = express.Router();

function fvSIP({ sip, annualRatePct, years }){ const r=(annualRatePct||0)/100; const i=r/12; const n=(years||0)*12; if(i===0) return sip*n; return sip*(((Math.pow(1+i,n)-1)/i)*(1+i)); }
function fvReal({ fv, inflationPct, years }){ const i=(inflationPct||0)/100; return fv / Math.pow(1+i,(years||0)); }
function requiredSIP({ target, annualRatePct, years }){ const r=(annualRatePct||0)/100; const i=r/12; const n=(years||0)*12; if(i===0) return target/n; return (target*i)/(((Math.pow(1+i,n)-1))*(1+i)); }

router.post('/sip/fv', (req,res)=>{ const { sip=0, annualRatePct=0, years=0 } = req.body||{}; res.json({ fv: fvSIP({ sip:+sip, annualRatePct:+annualRatePct, years:+years }) }); });
router.post('/sip/fv-real', (req,res)=>{ const { fv=0, inflationPct=0, years=0 } = req.body||{}; res.json({ fvReal: fvReal({ fv:+fv, inflationPct:+inflationPct, years:+years }) }); });
router.post('/sip/required', (req,res)=>{ const { target=0, annualRatePct=0, years=0 } = req.body||{}; res.json({ sip: requiredSIP({ target:+target, annualRatePct:+annualRatePct, years:+years }) }); });

export default router;
