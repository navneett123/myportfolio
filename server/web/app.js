// ====== Simple SPA Setup ======
const $app = document.getElementById('app');
document.querySelectorAll('[data-page]').forEach(btn =>
  btn.addEventListener('click', () => setPage(btn.dataset.page))
);

function setPage(p) {
  document.querySelectorAll('[data-page]').forEach(b =>
    b.classList.toggle('active', b.dataset.page === p)
  );
  if (p === 'dashboard') renderDashboard();
  else if (p === 'expenses') renderExpenses();
  else if (p === 'insights') renderInsights();
  else if (p === 'investments') renderInvestments();
  else renderSettings();
}

window.addEventListener('load', () => setPage('dashboard'));

// ====== Helpers ======
const FY = '2025-04-01';
const MONTH_LABELS = ['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar'];

async function getJSON(u) { const r = await fetch(u); return r.json(); }
async function postJSON(u,b) {
  const r = await fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});
  return r.json();
}
async function putJSON(u,b) {
  const r = await fetch(u,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});
  return r.json();
}

const USD = x => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0
}).format(x || 0);

// ====== Render Dashboard ======
async function renderDashboard() {
  $app.innerHTML = `
    <div class="grid grid-3">
      <div class="card kpi"><div>Total Income</div><div class="val" id="k1">—</div></div>
      <div class="card kpi"><div>Total Expenses</div><div class="val" id="k2">—</div></div>
      <div class="card kpi"><div>Savings</div><div class="val" id="k3">—</div></div>
    </div>
    <div class="grid">
      <div class="card"><canvas id="trend" height="220"></canvas></div>
      <div class="card"><div class="pie-wrap"><canvas id="pie"></canvas></div></div>
    </div>
    <div class="card notice">Tip: Fill monthly values in the Expenses tab to see charts here.</div>
  `;

  // Load summary
  let sum = {};
  try { sum = await getJSON(`/api/insights/summary?fyStart=${FY}`) || {}; } catch {}
  const income   = Number(sum.income)   || 0;
  const expenses = Number(sum.expenses) || 0;
  const savings  = Number(sum.savings)  || 0;

  document.getElementById('k1').textContent = USD(income);
  document.getElementById('k2').textContent = USD(expenses);
  document.getElementById('k3').textContent = USD(savings);

  // Line chart
  try {
    const trend = await getJSON(`/api/insights/trend?fyStart=${FY}`) || [];
    const ctx = document.getElementById('trend');
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: trend.map(d => d.label),
        datasets: [
          { label: 'Income',  data: trend.map(d => d.income || 0), borderColor: '#2563eb', tension: 0.3 },
          { label: 'Expenses', data: trend.map(d => d.expenses || 0), borderColor: '#dc2626', tension: 0.3 }
        ]
      },
      options: {
        scales: {
          y: { ticks: { display: false }, grid: { display: false } }, // removes extra tick marks
          x: { grid: { display: false } }
        },
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: { label: (ctx) => `${ctx.dataset.label}: ${USD(ctx.parsed.y)}` }
          }
        }
      }
    });
  } catch (e) { console.error('Trend chart error:', e); }

  // Pie chart
  try {
    const split = await getJSON(`/api/insights/split?fyStart=${FY}`) || {};
    const labels = Object.keys(split);
    const data = Object.values(split);
    const total = data.reduce((a,b)=>a+b,0);

    new Chart(document.getElementById('pie'), {
      type: 'pie',
      data: { labels, datasets: [{ data }] },
      options: {
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const v = ctx.parsed;
                const pct = total ? (v/total*100) : 0;
                return `${ctx.label}: ${USD(v)} (${pct.toFixed(1)}%)`;
              }
            }
          }
        }
      }
    });
  } catch (e) { console.error('Pie chart error:', e); }
}

// ====== Render Expenses ======
async function renderExpenses() {
  const ledger = await getJSON(`/api/ledger?fyStart=${FY}`);
  const fields = ['income','gas','electricity','food','rent','transport','health','education','shopping','misc'];

  $app.innerHTML = `
    <div class="card controls">
      <button id="export" class="ghost">Export CSV</button>
      <input type="file" id="csv" accept=".csv" />
      <button id="import" class="primary">Import CSV</button>
    </div>
    <div class="card">
      <table class="table"><thead><tr>
        <th>Month</th>${fields.map(f=>`<th>${f[0].toUpperCase()+f.slice(1)}</th>`).join('')}<th>Notes</th><th></th>
      </tr></thead><tbody id="rows"></tbody></table>
    </div>
  `;

  const $rows = document.getElementById('rows');
  for(let m=1;m<=12;m++){
    const r = ledger[m] || {};
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${MONTH_LABELS[m-1]}</strong></td>
      ${fields.map(f=>`<td><input data-field="${f}" data-month="${m}" value="${r[f] ?? 0}"/></td>`).join('')}
      <td><input data-field="notes" data-month="${m}" value="${r.notes ?? ''}"/></td>
      <td><button class="ghost" data-save="${m}">Save</button></td>`;
    $rows.appendChild(tr);
  }

  $rows.addEventListener('click', async e=>{
    const b=e.target.closest('[data-save]');
    if(!b) return;
    const m=b.dataset.save;
    const row={};
    $rows.querySelectorAll(`input[data-month="${m}"]`).forEach(i=> row[i.dataset.field]=i.value);
    row.fyStart=FY;
    await putJSON(`/api/ledger/${m}`, row);
    alert('Saved '+MONTH_LABELS[m-1]);
  });

  document.getElementById('export').onclick=()=> window.location=`/api/ledger/export/csv?fyStart=${FY}`;
  document.getElementById('import').onclick=async()=>{
    const f=document.getElementById('csv').files[0];
    if(!f) return alert('Choose a CSV');
    const fd=new FormData(); fd.append('file',f);
    const r=await fetch(`/api/ledger/import/csv?fyStart=${FY}`,{method:'POST',body:fd});
    const js=await r.json();
    if(js.ok){ alert('Import done'); renderExpenses(); }
    else alert('Import failed');
  };
}

// ====== Render Insights ======
async function renderInsights() { await renderDashboard(); }

// ====== Render Investments ======
async function renderInvestments() {
  const sum = await getJSON(`/api/insights/summary?fyStart=${FY}`);
  const invested = await getJSON('/api/investments/total');

  let totalSavings = Number(sum.savings || 0);
  let totalAllocated = Number(invested.totalUSD || 0);
  let sessionAllocated = 0;

  const available = () => Math.max(0, totalSavings - totalAllocated - sessionAllocated);

  const assets = [
    { key:'gold', name:'Gold', band:'Low–Med • 6–10%', note:'Inflation hedge; ETFs/SGBs', icon:'🥇', color:'#fff7c5' },
    { key:'bonds', name:'Bonds / Debt', band:'Low • 6–8%', note:'Govt/AAA debt funds', icon:'💵', color:'#dfe8ff' },
    { key:'mf', name:'Mutual Funds', band:'Med • 10–14%', note:'Index / large & flexi-cap', icon:'📊', color:'#cdefff' },
    { key:'equity', name:'Equity (Direct)', band:'Med–High • 12–18%', note:'Blue chips / diversified', icon:'📈', color:'#d8ffe3' },
    { key:'reits', name:'Real Estate (REITs)', band:'Med • 8–12%', note:'Listed REITs', icon:'🏠', color:'#ffdada' }
  ];

  $app.innerHTML = `
    <div class="inv-top">
      <div class="inv-title"><strong>Investments</strong>
        <span class="muted">Allocate only from available savings (USD)</span>
      </div>
      <div class="inv-pills">
        <div class="pill"><div class="pill-k">Available</div><div id="invAvail" class="pill-v">${USD(available())}</div></div>
        <div class="pill"><div class="pill-k">Allocated (session)</div><div id="invAlloc" class="pill-v">${USD(sessionAllocated)}</div></div>
        <div class="pill"><div class="pill-k">Allocated (total)</div><div id="invTotal" class="pill-v">${USD(totalAllocated)}</div></div>
      </div>
    </div>

    <div class="inv-wrap">
      ${assets.map(a => `
        <article class="inv-card" data-key="${a.key}" style="background:${a.color}">
          <header class="card-head">
            <div class="card-title"><span>${a.icon}</span>${a.name}</div>
            <span class="badge">${a.band}</span>
          </header>
          <p class="muted">${a.note}</p>
          <div class="ctrl">
            <button class="btn minus">−</button>
            <input type="number" class="amt" placeholder="$ amount">
            <button class="btn plus">+</button>
          </div>
          <button class="btn invest">Invest</button>
          <div class="msg muted"></div>
        </article>
      `).join('')}
    </div>

    <div id="invToast" class="inv-toast" style="display:none"></div>
  `;

  const availEl = document.getElementById('invAvail');
  const allocEl = document.getElementById('invAlloc');
  const totalEl = document.getElementById('invTotal');
  const toast = document.getElementById('invToast');

  const say = (msg, ok=true) => {
    toast.textContent = msg;
    toast.style.background = ok ? '#16a34a' : '#dc2626';
    toast.style.display = 'block';
    setTimeout(() => toast.style.display='none', 1200);
  };

  const refresh = () => {
    availEl.textContent = USD(available());
    allocEl.textContent = USD(sessionAllocated);
    totalEl.textContent = USD(totalAllocated);
  };

  document.querySelectorAll('.inv-card').forEach(card => {
    const input = card.querySelector('.amt');
    const plus = card.querySelector('.plus');
    const minus = card.querySelector('.minus');
    const invest = card.querySelector('.invest');
    const msg = card.querySelector('.msg');

    plus.onclick = () => {
      const room = available();
      if (room <= 0) return say('No savings left', false);
      input.value = Math.min(room, (+input.value || 0) + 100);
    };
    minus.onclick = () => input.value = Math.max(0, (+input.value || 0) - 100);

    invest.onclick = async () => {
      const amount = Math.floor(+input.value || 0);
      if (amount <= 0) return say('Enter valid amount', false);
      if (amount > available()) return say('Exceeds savings', false);

      await postJSON('/api/investments/allocate', { asset: card.dataset.key, amountUSD: amount });
      sessionAllocated += amount;
      totalAllocated += amount;
      totalSavings -= amount;
      input.value = '';
      msg.textContent = `Invested ${USD(amount)} ✅`;
      refresh();
      say('Investment successful');
    };
  });

  refresh();
}

// ====== Render Settings ======
function renderSettings() {
  $app.innerHTML = `<div class="card"><div class="notice">FY fixed (Apr–Mar). Extend backend for custom settings.</div></div>`;
}
