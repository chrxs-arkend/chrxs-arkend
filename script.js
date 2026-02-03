let currentBanner = null;
let mode = 'forward'; // 'forward' or 'reverse'
let chartInstance = null;

const bannerSelect = document.getElementById('bannerSelect');
const bannerInfo = document.getElementById('bannerInfo');
const sparkContainer = document.getElementById('sparkContainer');
const targetPullsContainer = document.getElementById('targetPullsContainer');
const calculateBtn = document.getElementById('calculateBtn');
const resultsArea = document.getElementById('resultsArea');
const warningBox = document.getElementById('warningBox');

// Populate banner dropdown
fetch('banners.json')
  .then(r => r.json())
  .then(banners => {
    banners.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.id;
      opt.textContent = `${b.name} (${b.banner})`;
      bannerSelect.appendChild(opt);
    });
    bannerSelect.value = 'laevatain'; // default
    updateBanner();
  });

// Banner change
bannerSelect.addEventListener('change', updateBanner);

function updateBanner() {
  fetch('banners.json')
    .then(r => r.json())
    .then(banners => {
      currentBanner = banners.find(b => b.id === bannerSelect.value);
      bannerInfo.innerHTML = `
        <div>
          <div class="text-sm text-gray-400">Banner</div>
          <div class="text-xl font-medium">${currentBanner.banner}</div>
        </div>
        <div class="text-right">
          <div class="text-sm text-gray-400">Featured</div>
          <div class="text-xl font-medium text-[#e94560]">${currentBanner.featured}</div>
        </div>
      `;

      sparkContainer.classList.toggle('hidden', !currentBanner.spark);
      if (currentBanner.spark) {
        document.getElementById('spark').max = currentBanner.spark - 1;
      }

      updateDisplays();
      resultsArea.classList.add('hidden');
    });
}

// Mode toggle
document.getElementById('modeForward').addEventListener('click', () => setMode('forward'));
document.getElementById('modeReverse').addEventListener('click', () => setMode('reverse'));

function setMode(newMode) {
  mode = newMode;
  document.getElementById('modeForward').dataset.active = newMode === 'forward';
  document.getElementById('modeReverse').dataset.active = newMode === 'reverse';

  targetPullsContainer.classList.toggle('hidden', newMode !== 'reverse');
  sparkContainer.classList.toggle('hidden', newMode === 'reverse' || !currentBanner?.spark);

  updateDisplays();
  resultsArea.classList.add('hidden');
}

// Live updates
['oro', 'premium', 'pity', 'spark', 'targetPulls'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', updateDisplays);
});

function updateDisplays() {
  const pity = document.getElementById('pity');
  const spark = document.getElementById('spark');
  document.getElementById('pityVal').textContent = pity.value;
  if (spark) document.getElementById('sparkVal').textContent = spark.value;

  const oro = parseInt(document.getElementById('oro').value) || 0;
  const premium = parseInt(document.getElementById('premium').value) || 0;
  const totalOro = oro + (premium * 500);
  const maxPulls = Math.floor(totalOro / 500);

  if (mode === 'forward') {
    document.getElementById('maxPulls')?.remove(); // if exists from old version
  }
}

// Calculate button
calculateBtn.addEventListener('click', () => {
  if (!currentBanner) return alert('Select a banner first');

  const pity = parseInt(document.getElementById('pity').value);
  const spark = currentBanner.spark ? parseInt(document.getElementById('spark').value) : 0;
  const oro = parseInt(document.getElementById('oro').value) || 0;
  const premium = parseInt(document.getElementById('premium').value) || 0;
  const totalOro = oro + (premium * 500);
  const maxPullsForward = Math.floor(totalOro / 500);

  const worker = new Worker('worker.js');

  if (mode === 'forward') {
    worker.postMessage({
      mode: 'forward',
      bannerType: currentBanner.type,
      sparkTarget: currentBanner.spark || Infinity,
      pity,
      spark,
      maxPulls: maxPullsForward,
      simCount: 10000
    });
  } else {
    const target = parseInt(document.getElementById('targetPulls').value);
    if (target < 1) return alert('Enter a valid target pull count');
    worker.postMessage({
      mode: 'reverse',
      bannerType: currentBanner.type,
      sparkTarget: currentBanner.spark || Infinity,
      pity,
      spark,
      targetPulls: target
    });
  }

  worker.onmessage = e => {
    const { result, histo, warning } = e.data;
    resultsArea.classList.remove('hidden');

    if (warning) {
      warningBox.classList.remove('hidden');
      warningBox.innerHTML = warning;
    } else {
      warningBox.classList.add('hidden');
    }

    document.getElementById('mainResult').textContent = result.main;
    document.getElementById('subResult').textContent = result.sub;

    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(document.getElementById('distChart'), {
      type: 'bar',
      data: {
        labels: histo.map((_, i) => i + 1),
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
          x: { title: { display: true, text: 'Pulls Required' } }
        },
        plugins: { legend: { display: false } }
      }
    });

    worker.terminate();
  };
});
