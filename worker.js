// worker.js - Background simulation

self.onmessage = e => {
  const { tab, pity: startPity, spark: startSpark, maxPulls, simCount } = e.data;

  const pullsToTarget = [];

  for (let i = 0; i < simCount; i++) {
    const pulls = simulateOneRun(tab, startPity, startSpark, maxPulls);
    if (pulls !== Infinity) pullsToTarget.push(pulls);
  }

  if (pullsToTarget.length === 0) {
    self.postMessage({ avgToFeatured: Infinity, successRate: 0, histo: new Array(121).fill(0) });
    return;
  }

  const avg = pullsToTarget.reduce((a,b)=>a+b,0) / pullsToTarget.length;
  const success = pullsToTarget.filter(p => p <= maxPulls).length / simCount * 100;

  // Histogram up to 120+
  const histo = new Array(121).fill(0);
  pullsToTarget.forEach(p => {
    const bin = Math.min(p, 120);
    histo[bin]++;
  });

  self.postMessage({ avgToFeatured: avg, successRate: success, histo });
};

function simulateOneRun(tab, startPity, startSpark, maxPulls) {
  let pity = startPity;
  let spark = startSpark;
  let pulls = 0;

  const isLimited = tab === 'limited';
  const isBeginner = tab === 'beginner';

  const hardPity = isBeginner ? 40 : 80;
  const sparkTarget = isLimited ? 120 : Infinity;

  while (pulls < maxPulls) {
    pulls++;
    if (isLimited) spark++;

    // Spark / beginner hard guarantee
    if (spark >= sparkTarget || (isBeginner && pulls >= hardPity)) {
      return pulls; // target achieved
    }

    // Normal 6★ roll
    let rate = get6StarRate(pity);
    if (Math.random() < rate) {
      pity = 0;

      if (isLimited) {
        if (Math.random() < 0.5) return pulls; // won 50/50
        // lost → continue
      } else {
        return pulls; // any 6★ is target for basic/beginner
      }
    } else {
      pity++;
    }

    // Hard pity
    if (pity >= hardPity) {
      pity = 0;
      if (isLimited) {
        if (Math.random() < 0.5) return pulls;
      } else {
        return pulls;
      }
    }
  }

  return Infinity; // failed
}

function get6StarRate(pity) {
  if (pity < 65) return 0.008;
  const extra = (pity - 64) * 0.05;
  return Math.min(1, 0.008 + extra);
}
