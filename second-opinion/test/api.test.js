const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const catalog = require('../data/catalog.json');
const vote = require('../api/vote');
const leaderboard = require('../api/leaderboard');
const { voter } = require('../lib/session');

function request(body, overrides = {}) {
  return Object.assign(Readable.from([body]), {
    method: 'POST',
    headers: { origin: 'https://example.test', host: 'example.test', 'content-type': 'application/json' },
    ...overrides,
  });
}
function response() {
  return {
    headers: {},
    setHeader(key, value) { this.headers[key] = value; },
    writeHead(status, headers) { this.status = status; Object.assign(this.headers, headers); },
    end(value) { this.body = JSON.parse(value); },
  };
}

test('catalog preserves evaluator identity, source context and metric direction', () => {
  assert.ok(catalog.providers.length >= 10 && catalog.providers.length <= 20);
  assert.equal(new Set(catalog.claims.map(c => c.id)).size, catalog.claims.length);
  assert.equal(new Set(catalog.providers.map(p => p.id)).size, catalog.providers.length);
  for (const p of catalog.providers) {
    assert.ok(Number.isFinite(p.seedElo));
    assert.ok(p.seedReason.length > 20);
    assert.ok(catalog.claims.some(c => c.providerId === p.id));
  }
  for (const c of catalog.claims) {
    const p = catalog.providers.find(p => p.id === c.providerId);
    assert.equal(c.category, p.category);
    assert.notEqual(c.modelA, c.modelB);
    assert.equal(new URL(c.sourceUrl).protocol, 'https:');
    assert.ok(c.sourceDate <= c.checkedOn);
    assert.ok(c.metric && c.notes);
    assert.ok(c.lowerIsBetter ? c.scoreA < c.scoreB : c.scoreA > c.scoreB, c.id);
  }
});

test('vote endpoint rejects cross-origin requests, forged claims and malformed JSON', async () => {
  const old = process.env.DATABASE_URL;
  process.env.DATABASE_URL = 'configured-but-must-not-be-queried';
  try {
    let res = response();
    await vote(request('{}', { headers: { origin:'https://attacker.test', host:'example.test' } }), res);
    assert.equal(res.status, 403);
    res = response();
    await vote(request(JSON.stringify({ claimId:'forged', agree:true, requestId:'00000000-0000-4000-8000-000000000000' })), res);
    assert.equal(res.status, 400);
    res = response();
    await vote(request('{'), res);
    assert.equal(res.status, 400);
    res = response();
    await vote(request('{}', { body:'{' }), res);
    assert.equal(res.status, 400);
    res = response();
    await vote(request('{}', { headers:{ origin:'https://example.test',host:'example.test','content-type':'text/plain' } }), res);
    assert.equal(res.status, 415);
    res = response();
    await vote(request('x'.repeat(2049)), res);
    assert.equal(res.status, 413);
  } finally {
    if (old === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = old;
  }
});

test('local development exposes real claims without fabricated community votes', async () => {
  const old = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  try {
    const res = response();
    await leaderboard(request('', { method:'GET' }), res);
    assert.equal(res.status, 200);
    assert.equal(res.body.mode, 'local');
    assert.deepEqual(res.body.scores, {});
    assert.deepEqual(res.body.claimVotes, {});
    assert.equal(res.body.claims.length, catalog.claims.length);
    assert.equal(res.headers['Cache-Control'], 'private, no-store');
  } finally { if (old !== undefined) process.env.DATABASE_URL = old; }
});

test('signed browser identities persist and reject modified cookies', () => {
  const old = process.env.VOTE_SECRET;
  process.env.VOTE_SECRET = 'unit-test-secret-only-not-a-deployment-secret';
  try {
    const first = response();
    const identity = voter(request(''), first);
    const cookie = first.headers['Set-Cookie'].split(';')[0];
    const second = response();
    assert.equal(voter(request('', { headers:{ cookie } }), second), identity);
    assert.equal(second.headers['Set-Cookie'], undefined);
    const modified = cookie.slice(0,-1)+(cookie.endsWith('a')?'b':'a');
    assert.notEqual(voter(request('', { headers:{ cookie:modified } }), response()), identity);
    assert.ok(first.headers['Set-Cookie'].includes('HttpOnly; SameSite=Lax'));
  } finally { if (old===undefined) delete process.env.VOTE_SECRET; else process.env.VOTE_SECRET=old; }
});


test('voice agents and image generation are separate, sourced categories', () => {
  const categories = new Set(catalog.categories.map(c => c.id));
  assert.deepEqual([...categories], ['text', 'speech', 'agents', 'images']);
  for (const p of catalog.providers) assert.ok(categories.has(p.category));
  const agents = catalog.providers.filter(p => p.category === 'agents');
  assert.deepEqual(agents.map(p => p.id), ['aa-speech-agents', 'eva-bench']);
  assert.equal(catalog.providers.filter(p => p.category === 'images').length, 3);
  const metrics = catalog.claims.filter(c => c.category === 'agents').map(c => c.metric);
  for (const metric of ['Human preference · Elo', 'Task success rate (%)', 'EVA-Accuracy · pass@1 (%)', 'EVA-Experience · pass@1 (%)']) {
    assert.ok(metrics.includes(metric));
  }
  for (const c of catalog.claims) {
    for (const stats of [c.modelAStats || [], c.modelBStats || []]) {
      assert.ok(stats.every(s => s.label && typeof s.value === 'string'));
    }
  }
});
