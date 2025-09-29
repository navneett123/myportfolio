
export const MONTHS_FY = [
  { key: 1, label: 'Apr' },{ key: 2, label: 'May' },{ key: 3, label: 'Jun' },
  { key: 4, label: 'Jul' },{ key: 5, label: 'Aug' },{ key: 6, label: 'Sep' },
  { key: 7, label: 'Oct' },{ key: 8, label: 'Nov' },{ key: 9, label: 'Dec' },
  { key: 10, label: 'Jan' },{ key: 11, label: 'Feb' },{ key: 12, label: 'Mar' }
];
export function assertFYStart(fyStart){ if(!/^\d{4}-04-01$/.test(fyStart)) throw new Error('fyStart must be YYYY-04-01'); }
export function sanitizeNumber(v){ const n = Number(String(v).replace(/[^0-9.\-]/g,'')); return (!isFinite(n)||n<0)?0:Math.round(n*100)/100; }
export const CATEGORY_FIELDS = ['gas','electricity','food','rent','transport','health','education','shopping','misc'];
export function emptyRow(){ return { income:0, gas:0, electricity:0, food:0, rent:0, transport:0, health:0, education:0, shopping:0, misc:0, notes:'' }; }
