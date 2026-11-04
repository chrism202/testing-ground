const catalog = require('../data/catalog.json');
const { json, readBody } = require('../lib/http');
const { voter, network } = require('../lib/session');
const { database } = require('../lib/database');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Use POST.' });
  }
  try {
    let origin;
    try { origin = new URL(req.headers.origin).host; } catch {}
    if (!origin || origin !== req.headers.host) return json(res, 403, { error: 'Vote from this website.' });
    const body = await readBody(req);
    if (!body || typeof body.agree !== 'boolean' || !catalog.claims.some(c => c.id === body.claimId) ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId || '')) {
      return json(res, 400, { error: 'Choose an existing ranking and agree or disagree.' });
    }
    if (!process.env.DATABASE_URL) return json(res, 503, { error: 'Shared voting is not connected yet.' });
    const identity = voter(req, res);
    const address = network(req);
    const [result] = await database()`SELECT * FROM la_cast_vote(${body.requestId}::uuid, ${identity}, ${address}, ${body.claimId}, ${body.agree})`;
    return json(res, 200, result);
  } catch (error) {
    if (error.code === 'P4000') return json(res, 400, { error: 'That ranking is no longer available.' });
    if (error.status) return json(res, error.status, { error: error.message });
    console.error('Vote failed:', error.code || error.name);
    return json(res, 503, { error: 'Your vote could not be confirmed. Please retry.' });
  }
};
