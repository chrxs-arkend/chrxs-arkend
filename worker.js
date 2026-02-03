self.onmessage = e => {
  const { tab, pity: startPity, spark: startSpark, maxPulls, simCount } = e.data;

  const results = [];

  for (let i = 0; i < simCount; i++) {
    const pulls = runSimulation(tab, startPity, startSpark, maxPulls);
    if (pulls !== Infinity) results.push(pulls);
  }

  let avg = results.length ? results.reduce((a,b)=>a+b,0) / results.length : Infinity;
  let success = results.filter(p => p <= maxPulls).length / simCount * 100;

  const histo = new Array(121).fill(0);
  results.forEach(p => { const bin = Math.min(p, 120); histo[bin]++; });

  self.postMessage({ avg, successRate: success, histo });
};

function runSimulation(tab, startPity, startSpark, maxPulls) {
  let pity = startPity;
  let spark = startSpark;
  let pulls = 0;

  const isLimited = tab === 'limited';
  const hardPity = tab === 'beginner' ? 40 : 80;
  const sparkTarget = isLimited ? 120 : Infinity;

  while (pulls < maxPulls) {
    pulls++;
    if (isLimited) spark++;

    if (spark >= sparkTarget || (tab === 'beginner' && pulls >= hardPity)) {
      return pulls;
    }

    let rate = pity < 65 ? 0.008 : Math.min(1, 0.008 + (pity - 64) * 0.05);

    if (Math.random() < rate) {
      pity = 0;

      if (isLimited) {
        if (Math.random() < 0.5) return pulls; // win 50/50
      } else {
        return pulls; // any 6★ counts
      }
    } else {
      pity++;
    }

    if (pity >= hardPity) {
      pity = 0;
      if (isLimited) {
        if (Math.random() < 0.5) return pulls;
      } else {
        return pulls;
      }
    }
  }

  return Infinity;
}
