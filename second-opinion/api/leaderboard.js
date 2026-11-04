const catalog = require('../data/catalog.json');
const { json } = require('../lib/http');
const { voter } = require('../lib/session');
const { database, standings } = require('../lib/database');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { error: 'Use GET.' });
  }
  if (!process.env.DATABASE_URL) {
    return json(res, 200, { ...catalog, mode: 'local', scores: {}, votedClaims: [] });
  }
  try {
    const identity = voter(req, res);
    const [scores, votes] = await Promise.all([
      standings(),
      database()`SELECT claim_id FROM la_votes WHERE voter_hash = ${identity}`,
    ]);
    return json(res, 200, { ...catalog, mode: 'shared', scores, votedClaims: votes.map(v => v.claim_id) });
  } catch (error) {
    console.error('Leaderboard unavailable:', error.code || error.name);
    return json(res, 503, { error: 'The standings are taking a breather. Please try again shortly.' });
  }
};
