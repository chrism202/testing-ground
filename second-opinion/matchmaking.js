// Shared by the browser and Node tests. Relevance is an editorial catalog field,
// independent of evaluator Elo and agreement/disagreement outcomes.
(function(root) {
  function priority(claim, votes = 0, now = Date.now()) {
    const relevance = Math.max(1, Math.min(5, claim.relevance || 3));
    const age = Math.max(0, (now - Date.parse(claim.sourceDate)) / 86400000);
    const freshness = 0.25 + 0.75 / (1 + age / 90);
    return relevance * freshness / Math.pow(1 + Math.max(0, votes), 0.75);
  }

  function selectClaim(claims, { category = 'all', voted = new Set(), claimVotes = {},
    skipId, now = Date.now(), random = Math.random } = {}) {
    let pool = claims.filter(c => (category === 'all' || c.category === category) && !voted.has(c.id));
    if (pool.length > 1 && skipId) pool = pool.filter(c => c.id !== skipId);
    if (!pool.length) return null;
    const ranked = pool.map(claim => ({ claim, score: priority(claim, claimVotes[claim.id], now) }));
    const best = Math.max(...ranked.map(item => item.score));
    // Randomize within the leading priority band to spread simultaneous visitors
    // across comparably useful questions, without drawing from the entire catalog.
    const candidates = ranked.filter(item => item.score >= best * 0.8);
    return candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))].claim;
  }

  const matchmaking = { priority, selectClaim };
  if (typeof module !== 'undefined' && module.exports) module.exports = matchmaking;
  else root.matchmaking = matchmaking;
})(globalThis);
