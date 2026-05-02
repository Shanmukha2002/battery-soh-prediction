let chart;

// Real NASA battery discharge data (B0005)
const SAMPLES = {
  healthy: `4.191 -0.001 24.326 -0.001 4.206 16.781 1.856
3.975 -2.013 24.389 -1.998 3.062 35.703 1.856
3.952 -2.014 24.545 -1.998 3.030 53.781 1.856
3.934 -2.011 24.731 -1.998 3.011 71.922 1.856
3.920 -2.013 24.910 -1.998 2.991 90.094 1.856
3.908 -2.014 25.106 -1.998 2.977 108.281 1.856
3.897 -2.012 25.317 -1.998 2.967 126.453 1.856
3.887 -2.018 25.509 -1.998 2.959 144.641 1.856
3.879 -2.013 25.704 -1.998 2.951 162.844 1.856
3.871 -2.013 25.887 -1.998 2.943 181.016 1.856`,

  moderate: `4.197 0.001 23.814 0.001 4.213 9.360 1.575
3.996 -2.011 23.841 -1.998 2.965 19.485 1.575
3.978 -2.011 23.913 -1.998 2.969 28.860 1.575
3.964 -2.013 23.994 -1.998 2.963 38.235 1.575
3.953 -2.012 24.100 -1.998 2.954 47.594 1.575
3.942 -2.011 24.196 -1.998 2.946 56.922 1.575
3.933 -2.013 24.302 -1.998 2.933 66.250 1.575
3.924 -2.011 24.402 -1.998 2.919 75.703 1.575
3.917 -2.014 24.496 -1.998 2.912 85.063 1.575
3.910 -2.012 24.607 -1.998 2.906 94.422 1.575`,

  degraded: `4.196 0.002 24.278 0.001 4.211 9.453 1.391
3.982 -2.015 24.307 -1.998 2.963 19.610 1.391
3.961 -2.012 24.377 -1.998 2.966 28.985 1.391
3.944 -2.011 24.478 -1.998 2.955 38.344 1.391
3.930 -2.010 24.573 -1.998 2.943 47.735 1.391
3.917 -2.014 24.681 -1.998 2.933 57.032 1.391
3.906 -2.012 24.792 -1.998 2.915 66.391 1.391
3.896 -2.009 24.909 -1.998 2.901 75.766 1.391
3.887 -2.015 25.021 -1.998 2.893 85.094 1.391
3.879 -2.012 25.135 -1.998 2.886 94.516 1.391`
};

const CONDITIONS = ['healthy', 'moderate', 'degraded'];
const BTN_LABELS = {
  healthy:  '⚡ Load Sample Data — 🟢 Healthy Battery',
  moderate: '⚡ Load Sample Data — 🟡 Moderate Degradation',
  degraded: '⚡ Load Sample Data — 🔴 Critical Battery'
};

function rand() {} // unused, kept for compatibility

function loadSample() {
  const condition = CONDITIONS[Math.floor(Math.random() * CONDITIONS.length)];
  document.getElementById('inputData').value = SAMPLES[condition];
  document.querySelector('.sample-btn').textContent = BTN_LABELS[condition];
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
