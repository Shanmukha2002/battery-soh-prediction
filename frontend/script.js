let chart;

// Real NASA battery discharge data (B0005)
// Correct column order: ambient_temp voltage current temperature load_current load_voltage time
const SAMPLES = {
  healthy: `24.000 4.191 -0.001 24.326 -0.001 4.206 16.781
24.000 3.975 -2.013 24.389 -1.998 3.062 35.703
24.000 3.952 -2.014 24.545 -1.998 3.030 53.781
24.000 3.934 -2.011 24.731 -1.998 3.011 71.922
24.000 3.920 -2.013 24.910 -1.998 2.991 90.094
24.000 3.908 -2.014 25.106 -1.998 2.977 108.281
24.000 3.897 -2.012 25.317 -1.998 2.967 126.453
24.000 3.887 -2.018 25.509 -1.998 2.959 144.641
24.000 3.879 -2.013 25.704 -1.998 2.951 162.844
24.000 3.871 -2.013 25.887 -1.998 2.943 181.016`,

  moderate: `24.000 4.198 -0.000 23.409 0.001 4.213 9.391
24.000 3.995 -2.014 23.421 -1.998 2.969 19.547
24.000 3.977 -2.013 23.487 -1.998 2.966 28.891
24.000 3.962 -2.012 23.582 -1.998 2.959 38.250
24.000 3.950 -2.013 23.697 -1.998 2.950 47.610
24.000 3.940 -2.011 23.794 -1.998 2.943 56.954
24.000 3.930 -2.011 23.885 -1.998 2.928 66.266
24.000 3.922 -2.013 23.999 -1.998 2.913 75.672
24.000 3.914 -2.013 24.101 -1.998 2.905 85.032
24.000 3.907 -2.013 24.194 -1.998 2.899 94.391`,

  degraded: `24.000 4.184 -0.002 23.590 0.001 4.199 9.437
24.000 3.959 -2.013 23.622 -1.998 3.000 19.593
24.000 3.936 -2.014 23.689 -1.998 2.970 28.922
24.000 3.919 -2.012 23.792 -1.998 2.949 38.312
24.000 3.904 -2.011 23.899 -1.998 2.933 47.672
24.000 3.890 -2.012 24.015 -1.998 2.920 57.062
24.000 3.879 -2.012 24.120 -1.998 2.899 66.406
24.000 3.868 -2.014 24.244 -1.998 2.885 75.734
24.000 3.859 -2.012 24.377 -1.998 2.874 85.093
24.000 3.850 -2.012 24.492 -1.998 2.865 94.468`
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

// SOH thresholds based on real NASA battery range (0.70 to 1.0)
function getStatus(soh) {
  if (soh >= 0.90) return { cls: 'good',    text: 'Battery Healthy'      };
  if (soh >= 0.80) return { cls: 'warning', text: 'Moderate Degradation' };
  return                  { cls: 'danger',  text: 'Replace Soon'         };
}

function getInterpretation(soh, rul) {
  const pct    = (soh * 100).toFixed(1);
  const rulPct = (rul * 100).toFixed(1);
  if (soh >= 0.90) return `Battery is in <strong style="color:var(--green)">excellent health</strong> at ${pct}% capacity. Estimated ${rulPct}% of useful life remaining. No immediate action required.`;
  if (soh >= 0.80) return `Battery shows <strong style="color:var(--yellow)">moderate degradation</strong> at ${pct}% capacity. ${rulPct}% of useful life remaining. Monitor closely and plan for replacement.`;
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
    sohEl.className = 'result-box-value animate-in ' + (soh < 0.80 ? 'danger' : soh < 0.90 ? 'warning' : '');
    rulEl.className = 'result-box-value animate-in ' + (rul < 0.30 ? 'danger' : rul < 0.60 ? 'warning' : '');

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
          min: 0.65, max: 1.05,
          ticks: { color: '#5a8aaa', font: { size: 11 }, callback: v => (v * 100).toFixed(0) + '%' },
          grid:  { color: 'rgba(26,58,85,0.5)' }
        }
      }
    }
  });
}
