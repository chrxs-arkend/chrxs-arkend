self.onmessage = e => {
  const { mode, bannerType, sparkTarget, pity: startPity, spark: startSpark, maxPulls, targetPulls, simCount } = e.data;
  let result = {};
  let histo = new Array(121).fill(0);
  let warning = null;

  if (mode === 'forward') {
    const pullsToTarget = [];

    for (let i = 0; i < simCount; i++) {
      const pulls = simulateRun(bannerType, startPity, startSpark, maxPulls, sparkTarget);
      if (pulls !== Infinity) pullsToTarget.push(pulls);
    }

    const avg = pullsToTarget.length ? pullsToTarget.reduce((a,b)=>a+b,0) / pullsToTarget.length : Infinity;
    const success = pullsToTarget.filter(p => p <= maxPulls).length / simCount * 100;

    pullsToTarget.forEach(p => {
      if (p <= 120) histo[p]++;
      else histo[120]++;
    });

    const oneIn = avg === Infinity ? 'Never (no guarantee)' : `1 in ${Math.round(avg)}`;
    const featured = bannerType === 'limited' ? 'the featured character' : bannerType === 'beginner' ? 'a beginner 6★' : 'a standard 6★';

    result = {
      main: oneIn,
      sub: `pulls results in ${featured} on average`
    };

    if (bannerType === 'limited' && (startSpark + maxPulls) < sparkTarget) {
      warning = `⚠️ Risky: You can only reach ${startSpark + maxPulls} pulls. Spark (${sparkTarget}) does NOT carry over to the next banner!`;
    }
  } else {
    // Reverse: how much currency needed for target pulls
    const pullsNeeded = targetPulls - startSpark;
    const oroNeeded = pullsNeeded * 500;
    const premiumNeeded = Math.ceil(oroNeeded / 500);

    result = {
      main: `${premiumNeeded.toLocaleString()} Premium`,
      sub: `(${oroNeeded.toLocaleString()} Oroberyl) needed for ${targetPulls} pulls from current pity/spark`
    };

    if (bannerType === 'limited' && targetPulls > startSpark + 200) {
      warning = `Note: Spark is only ${sparkTarget} — anything beyond is not guaranteed.`;
    }
  }

  self.postMessage({ result, histo, warning });
};

function simulateRun(type, startPity, startSpark, maxPulls, sparkTarget) {
  let pity = startPity;
  let spark = startSpark;
  let pulls = 0;

  const isLimited = type === 'limited';
  const hardPity = type === 'beginner' ? 40 : 80;

  while (pulls < maxPulls) {
    pulls++;
    if (isLimited) spark++;

    if (spark >= sparkTarget) return pulls;

    let rate = pity < 65 ? 0.008 : Math.min(1, 0.008 + (pity - 64) * 0.05);

    if (Math.random() < rate) {
      pity = 0;
      if (!isLimited || Math.random() < 0.5) return pulls;
    } else {
      pity++;
    }

    if (pity >= hardPity) {
      pity = 0;
      if (!isLimited || Math.random() < 0.5) return pulls;
    }
  }

  return Infinity;
}
