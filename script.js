let currentTab = 'limited';
let probChart = null;

let bannerConfig = {};
fetch('banners.json')
  .then(r => r.json())
  .then(data => { bannerConfig = data; updateUIForTab(); })
  .catch(err => console.error(err));

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.dataset.active = 'false');
    btn.dataset.active = 'true';
    currentTab = btn.dataset.tab;
    updateUIForTab();
    document.getElementById('resultsSection').classList.add('hidden');
  });
});

function updateUIForTab() {
  const sparkGroup = document.getElementById('sparkGroup');
  const pityMax = currentTab === 'beginner' ? 39 : 79;
  document.getElementById('pity').max = pityMax;
  document.getElementById('pity').value = Math.min(parseInt(document.getElementById('pity').value), pityMax);

  if (currentTab === 'limited') {
    sparkGroup.classList.remove('hidden');
  } else {
    sparkGroup.classList.add('hidden');
  }

  updateDisplays();
}

const pityInput = document.getElementById('pity');
pityInput.addEventListener('input', updateDisplays);

const sparkInput = document.getElementById('spark');
sparkInput.addEventListener('input', updateDisplays);

const oroInput = document.getElementById('oroberryl');
oroInput.addEventListener('input', updateDisplays);

function updateDisplays() {
  document.getElementById('pityDisplay').textContent = pityInput.value;
  document.getElementById('sparkDisplay').textContent = sparkInput.value;

  const oro = parseInt(oroInput.value) || 0;
  const max = Math.floor(oro / 500);
  document.getElementById('maxPulls').textContent = max.toLocaleString();
}

document.getElementById('simulateBtn').addEventListener('click', () => {
  const pity = parseInt(pityInput.value);
  const spark = currentTab === 'limited' ? parseInt(sparkInput.value) : 0;
  const oro = parseInt(oroInput.value) || 0;
  const maxPulls = Math.floor(oro / 500);

  if (maxPulls < 1) return alert("Need at least 500 Oroberyl.");

  const worker = new Worker('worker.js');
  worker.postMessage({ tab: currentTab, pity, spark, maxPulls, simCount: 10000 });

  worker.onmessage = e => {
    const { avg, successRate, histo } = e.data;

    document.getElementById('resultsSection').classList.remove('hidden');

    const featured = currentTab === 'limited' ? bannerConfig.limited.current.featured :
                     currentTab === 'beginner' ? bannerConfig.beginner.featured : bannerConfig.basic.featured;

    const oneIn = avg === Infinity ? 'Never (no guarantee)' : `1 in ${Math.round(avg)}`;

    document.getElementById('keyStats').innerHTML = `
      <div class="bg-[#0f0f1a]/70 p-6 rounded-xl text-center border border-[#e94560]/30">
        <div class="text-sm text-gray-300 mb-2">On average</div>
        <div class="text-4xl font-bold text-[#e94560]">${oneIn}</div>
        <div class="text-base mt-2">pulls results in ${featured}</div>
      </div>
      <div class="bg-[#0f0f1a]/70 p-6 rounded-xl text-center border border-[#e94560]/30">
        <div class="text-sm text-gray-300 mb-2">Chance with your Oroberyl</div>
        <div class="text-4xl font-bold text-[#e94560]">${successRate.toFixed(1)}%</div>
      </div>
    `;

    const warningEl = document.getElementById('warning');
    const warningText = document.getElementById('warningText');
    if (currentTab === 'limited' && (spark + maxPulls) < 120) {
      warningEl.classList.remove('hidden');
      warningText.textContent = `Only ~${spark + maxPulls} pulls possible. Spark (120) does NOT carry over — very risky without enough for guarantee!`;
    } else {
      warningEl.classList.add('hidden');
    }

    const ctx = document.getElementById('probChart').getContext('2d');
    if (probChart) probChart.destroy();
    probChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: histo.map((_,i) => i+1),
        datasets: [{ label: 'Frequency', data: histo, backgroundColor: '#e94560aa', borderColor: '#e94560', borderWidth: 1 }]
      },
      options: {
        scales: { y: { beginAtZero: true }, x: { title: { display: true, text: 'Pulls to target' } } },
        plugins: { legend: { display: false } }
      }
    });

    worker.terminate();
  };
});
