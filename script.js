// script.js - UI logic, tabs, inputs, triggers simulation

let currentTab = 'limited'; // default
let probChart = null;

// Load banner data
let bannerConfig = {};
fetch('banners.json')
  .then(r => r.json())
  .then(data => {
    bannerConfig = data;
    updateBannerSpecificUI();
  })
  .catch(err => console.error('Failed to load banners.json', err));

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.dataset.active = 'false');
    btn.dataset.active = 'true';
    currentTab = btn.dataset.tab;
    updateBannerSpecificUI();
    hideResults();
  });
});

function updateBannerSpecificUI() {
  const sparkGroup = document.getElementById('sparkGroup');
  const pityMax = currentTab === 'beginner' ? 39 : 79; // beginner caps early

  document.getElementById('pity').max = pityMax;
  if (currentTab === 'limited') {
    sparkGroup.classList.remove('hidden');
    document.getElementById('spark').max = 119;
  } else {
    sparkGroup.classList.add('hidden');
  }

  // Reset sliders to safe defaults
  document.getElementById('pity').value = 0;
  document.getElementById('spark').value = 0;
  updateDisplays();
}

const pityInput = document.getElementById('pity');
const pityDisplay = document.getElementById('pityDisplay');
pityInput.addEventListener('input', updateDisplays);

const sparkInput = document.getElementById('spark');
const sparkDisplay = document.getElementById('sparkDisplay');
sparkInput.addEventListener('input', updateDisplays);

const oroInput = document.getElementById('oroberryl');
oroInput.addEventListener('input', updateDisplays);

function updateDisplays() {
  pityDisplay.textContent = pityInput.value;
  sparkDisplay.textContent = sparkInput.value;

  const oro = parseInt(oroInput.value) || 0;
  const maxPulls = Math.floor(oro / 500);
  document.getElementById('maxPulls').textContent = maxPulls.toLocaleString();

  hideResults(); // clear old results when changing inputs
}

function hideResults() {
  document.getElementById('resultsSection').classList.add('hidden');
}

// Single / 10-pull fun test
function performPulls(count = 1) {
  let pity = parseInt(pityInput.value);
  let spark = currentTab === 'limited' ? parseInt(sparkInput.value) : 0;
  const history = document.getElementById('pullHistory') || document.createElement('div'); // placeholder if you add history later

  for (let i = 0; i < count; i++) {
    let got6Star = false;
    let gotFeatured = false;

    if (currentTab === 'limited' && spark + 1 >= 120) {
      got6Star = true;
      gotFeatured = true;
    } else {
      let rate = get6StarRate(pity);
      if (Math.random() < rate) {
        got6Star = true;
        if (currentTab === 'limited' && Math.random() < 0.5) {
          gotFeatured = true;
        }
      }
    }

    pity = got6Star ? 0 : pity + 1;
    if (currentTab === 'limited') spark++;

    // Cap beginner
    if (currentTab === 'beginner' && pity >= 39) pity = 39; // simplistic
  }

  pityInput.value = pity;
  if (currentTab === 'limited') sparkInput.value = spark;
  updateDisplays();

  // You can expand this with confetti / history log later
  console.log(`Performed ${count} pulls → New pity: ${pity}, spark: ${spark}`);
}

document.getElementById('singlePullBtn')?.addEventListener('click', () => performPulls(1)); // add buttons if you want fun mode
// For now we focus on odds calc – add fun buttons in HTML if desired

// Main simulation
document.getElementById('simulateBtn')?.addEventListener('click', () => {
  const pity = parseInt(pityInput.value);
  const spark = currentTab === 'limited' ? parseInt(sparkInput.value) : 0;
  const oro = parseInt(oroInput.value) || 0;
  const maxPulls = Math.floor(oro / 500);

  if (maxPulls < 1) {
    alert("You need at least 500 Oroberyl to simulate pulls.");
    return;
  }

  const simCount = 10000;

  const worker = new Worker('worker.js');
  worker.postMessage({
    tab: currentTab,
    pity,
    spark,
    maxPulls,
    simCount
  });

  worker.onmessage = e => {
    const { avgToFeatured, successRate, histo } = e.data;

    document.getElementById('resultsSection').classList.remove('hidden');

    const oneInX = avgToFeatured === Infinity ? 'Never (no guarantee)' : `1 in ${Math.round(avgToFeatured)}`;
    const featuredName = currentTab === 'limited' ? 'featured character' :
                         currentTab === 'beginner' ? '6★ from beginner pool' : 'standard 6★';

    document.getElementById('keyStats').innerHTML = `
      <div class="bg-[#0f0f1a]/70 p-5 rounded-xl text-center border border-[#e94560]/30">
        <div class="text-sm text-gray-300 mb-1">On average</div>
        <div class="text-3xl font-bold text-[#e94560]">${oneInX}</div>
        <div class="text-sm mt-2">pulls results in the ${featuredName}</div>
      </div>

      <div class="bg-[#0f0f1a]/70 p-5 rounded-xl text-center border border-[#e94560]/30">
        <div class="text-sm text-gray-300 mb-1">Chance within your Oroberyl</div>
        <div class="text-3xl font-bold text-[#e94560]">${successRate.toFixed(1)}%</div>
      </div>
    `;

    // Warning for limited
    const warningEl = document.getElementById('warning');
    const warningText = document.getElementById('warningText');
    if (currentTab === 'limited' && (spark + maxPulls) < 120) {
      warningEl.classList.remove('hidden');
      warningText.textContent = `You can only reach ~${spark + maxPulls} pulls on this banner. Spark DOES NOT carry over — high risk of no guarantee!`;
    } else {
      warningEl.classList.add('hidden');
    }

    // Chart
    const ctx = document.getElementById('probChart').getContext('2d');
    if (probChart) probChart.destroy();
    probChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: histo.map((_,i) => i+1),
        datasets: [{
          label: 'Frequency',
          data: histo,
          backgroundColor: '#e94560aa',
          borderColor: '#e94560',
          borderWidth: 1
        }]
      },
      options: {
        scales: {
          y: { beginAtZero: true, title: { display: true, text: 'Occurrences' } },
          x: { title: { display: true, text: 'Pulls to get target' } }
        },
        plugins: { legend: { display: false } }
      }
    });

    worker.terminate();
  };
});
