let chart;

// Random between min and max with decimal places
function rand(min, max, dec = 3) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(dec));
}

// Generate random battery data based on health level
function generateSample() {
  // Randomly pick a battery condition each time
  const conditions = ['healthy', 'moderate', 'degraded'];
  const condition = conditions[Math.floor(Math.random() * conditions.length)];

  let startVoltage, startCapacity, startTemp;

  if (condition === 'healthy') {
    startVoltage  = rand(4.05, 4.20);
    startCapacity = rand(1.85, 1.95);
    startTemp     = rand(24.0, 25.5);
  } else if (condition === 'moderate') {
    startVoltage  = rand(3.75, 4.00);
    startCapacity = rand(1.50, 1.75);
    startTemp     = rand(26.0, 28.5);
  } else {
    startVoltage  = rand(3.20, 3.55);
    startCapacity = rand(1.00, 1.30);
    startTemp     = rand(29.5, 33.5);
  }

  let rows = [];
  for (let i = 0; i < 10; i++) {
    const voltage     = parseFloat((startVoltage  - i * rand(0.015, 0.025)).toFixed(3));
    const current     = i === 0 ? rand(-0.001, -0.010, 4) : rand(-1.995, -2.025, 3);
    const temp        = parseFloat((startTemp     + i * rand(0.15, 0.25)).toFixed(2));
    const loadCurrent = i === 0 ? rand(-0.001, -0.005, 4) : rand(-1.990, -2.010, 3);
    const loadVoltage = i === 0 ? 0.0 : rand(2.3, 3.1);
    const time        = parseFloat((i * rand(18, 22))).toFixed(1);
    const capacity    = parseFloat((startCapacity - i * rand(0.005, 0.012)).toFixed(3));

    rows.push(`${voltage} ${current} ${temp} ${loadCurrent} ${loadVoltage} ${time} ${capacity}`);
  }

  // Show what condition was generated
  const labels = {
    healthy:  '⚡ Load Sample Data — 🟢 Healthy Battery',
    moderate: '⚡ Load Sample Data — 🟡 Moderate Degradation',
    degraded: '⚡ Load Sample Data — 🔴 Critical Battery'
  };
  document.querySelector('.sample-btn').textContent = labels[condition];

  return rows.join('\n');
}

function loadSample() {
  document.getElementById('inputData').value = generateSample();
}

function getStatus(soh) {
  if (soh >= 0.8) return { cls: 'good',    text: 'Battery Healthy',       color: 'var(--green)'  };
  if (soh >= 0.6) return { cls: 'warning', text: 'Moderate Degradation',  color: 'var(--yellow)' };
  return               { cls: 'danger',  text: 'Replace Soon',           color: 'var(--red)'    };
}

function getInterpretation(soh, rul) {
  const pct    = (soh * 100).toFixed(1);
  const rulPct = (rul * 100).toFixed(1);
  if (soh >= 0.8) return `Battery is in <strong style="color:var(--green)">excellent health</strong> at ${pct}% capacity. Estimated ${rulPct}% of useful life remaining. No immediate action required.`;
  if (soh >= 0.6) return `Battery shows <strong style="color:var(--yellow)">moderate degradation</strong> at ${pct}% capacity. ${rulPct}% of useful life remaining. Monitor closely and plan for replacement.`;
  return `Battery is in <strong style="color:var(--red)">critical condition</strong> at ${pct}% capacity. Only ${rulPct}% of useful life remaining. <strong>Immediate replacement recommended.</strong>`;
}

async function predict() {
  const raw = document.getElementById('inputData').value.trim();
  if (!raw) { alert('Please enter input data'); return; }

  const rows = raw.split('\n').map(r => r.trim().split(/\s+/).map(Number));
  if (rows.length !== 10) { alert('Enter exactly 10 rows'); return; }

  const btn = document.getElementById('predictBtn');
  btn.textContent = '⏳ PROCESSING...';
  btn.classList.add('loading');
  btn.disabled = true;

  document.getElementById('soh').textContent = '...';
  document.getElementById('rul').textContent = '...';

  try {
    const res = await fetch('http://127.0.0.1:8000/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sequence: rows })
    });

    const data = await res.json();

    if (data.error) {
      document.getElementById('soh').textContent = 'ERR';
      document.getElementById('rul').textContent = 'ERR';
      console.error(data.error);
      return;
    }

    const soh    = data.SOH;
    const rul    = data.RUL;
    const status = getStatus(soh);

    const sohEl = document.getElementById('soh');
    const rulEl = document.getElementById('rul');
    sohEl.textContent = soh.toFixed(4);
    rulEl.textContent = rul.toFixed(4);
    sohEl.className = 'result-box-value animate-in ' + (soh < 0.6 ? 'danger' : soh < 0.8 ? 'warning' : '');
    rulEl.className = 'result-box-value animate-in ' + (rul < 0.2 ? 'danger' : rul < 0.4 ? 'warning' : '');

    document.getElementById('sohBox').classList.add('active');
    document.getElementById('rulBox').classList.add('active');

    document.getElementById('gaugeFill').style.width  = (soh * 100) + '%';
    document.getElementById('gaugeLabel').textContent = (soh * 100).toFixed(1) + '%';

    const badge = document.getElementById('statusBadge');
    badge.className   = 'status-badge ' + status.cls;
    badge.style.display = 'inline-flex';
    document.getElementById('statusText').textContent = status.text;

    document.getElementById('interpretation').innerHTML = getInterpretation(soh, rul);

    updateChart(soh);

  } catch (err) {
    console.error(err);
    document.getElementById('soh').textContent = 'ERR';
    document.getElementById('rul').textContent = 'ERR';
  } finally {
    btn.textContent = '▶ RUN PREDICTION';
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

function updateChart(soh) {
  const ctx = document.getElementById('chart').getContext('2d');
  if (chart) chart.destroy();

  const labels    = Array.from({ length: 20 }, (_, i) => `Cycle ${i + 1}`);
  const trend     = labels.map((_, i) => Math.max(0, soh - i * 0.018 + (Math.random() - 0.5) * 0.005));
  const threshold = labels.map(() => 0.7);

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'SOH Trend',
          data: trend,
          borderColor: '#00ff88',
          backgroundColor: 'rgba(0,255,136,0.05)',
          borderWidth: 2.5,
          pointBackgroundColor: '#00ff88',
          pointRadius: 3,
          pointHoverRadius: 6,
          tension: 0.4,
          fill: true
        },
        {
          label: 'End-of-Life Threshold (70%)',
          data: threshold,
          borderColor: 'rgba(255,68,102,0.6)',
          borderWidth: 1.5,
          borderDash: [6, 4],
          pointRadius: 0,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 1000, easing: 'easeInOutQuart' },
      plugins: {
        legend: {
          labels: { color: '#5a8aaa', font: { size: 12 }, padding: 20 }
        },
        tooltip: {
          backgroundColor: '#0a1520',
          borderColor: '#1a3a55',
          borderWidth: 1,
          titleColor: '#00ff88',
          bodyColor: '#cce8ff',
          padding: 12,
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(4)}`
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#5a8aaa', font: { size: 11 } },
          grid:  { color: 'rgba(26,58,85,0.5)' }
        },
        y: {
          min: 0.3, max: 1.0,
          ticks: { color: '#5a8aaa', font: { size: 11 }, callback: v => (v * 100).toFixed(0) + '%' },
          grid:  { color: 'rgba(26,58,85,0.5)' }
        }
      }
    }
  });
}
