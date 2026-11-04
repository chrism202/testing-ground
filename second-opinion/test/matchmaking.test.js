const { test } = require('node:test');
const assert = require('node:assert/strict');
const { priority, selectClaim } = require('../matchmaking');
const catalog = require('../data/catalog.json');

const now = Date.parse('2026-11-04T12:00:00Z');
const claim = (id, overrides = {}) => ({
  id, category: 'text', relevance: 3, sourceDate: '2026-11-03', ...overrides,
});

test('an unjudged frontier pair outranks a niche pair with ten votes, regardless of input order', () => {
  const frontier = claim('opus-astra', { relevance: 5 });
  const niche = claim('step-k2', { relevance: 2 });
  for (const claims of [[niche, frontier], [frontier, niche]]) {
    for (const random of [() => 0, () => 0.99]) {
      assert.equal(selectClaim(claims, { now, claimVotes: { 'step-k2': 9 }, random }).id, frontier.id);
    }
  }
});

test('coverage changes selection as votes arrive and allows less prominent claims to surface', () => {
  const claims = [claim('prominent', { relevance: 5 }), claim('specialist', { relevance: 2 })];
  assert.equal(selectClaim(claims, { now, random: () => 0 }).id, 'prominent');
  assert.equal(selectClaim(claims, { now, claimVotes: { prominent: 20 }, random: () => 0 }).id, 'specialist');
});

test('source freshness matters; changing the checked date does not refresh a historical claim', () => {
  const recent = claim('recent');
  const old = claim('old', { sourceDate: '2025-03-20', checkedOn: '2026-11-04' });
  assert.ok(priority(recent, 0, now) > priority(old, 0, now));
  assert.equal(selectClaim([old, recent], { now }).id, 'recent');
});

test('category and completed history take precedence over priority; skip avoids the current claim', () => {
  const claims = [claim('done', { relevance: 5 }), claim('speech', { category: 'speech', relevance: 5 }),
    claim('current'), claim('next', { relevance: 1 })];
  const options = { now, category: 'text', voted: new Set(['done']), skipId: 'current' };
  assert.equal(selectClaim(claims, options).id, 'next');
  assert.equal(selectClaim([claim('current')], { ...options }).id, 'current');
  assert.equal(selectClaim(claims, { voted: new Set(claims.map(c => c.id)) }), null);
});

test('equally useful claims are spread across visitors instead of always picking the first', () => {
  const claims = [claim('first'), claim('second'), claim('third')];
  assert.deepEqual([0, 0.4, 0.99].map(value => selectClaim(claims, { now, random: () => value }).id),
    ['first', 'second', 'third']);
});

test('the actual catalog prioritizes unjudged Opus–Astra over already-covered niche and historical claims', () => {
  assert.ok(catalog.claims.every(c => Number.isInteger(c.relevance) && c.relevance >= 1 && c.relevance <= 5));
  const frontier = catalog.claims.find(c => c.id.startsWith('epoch-eci-astra-opus'));
  const historical = catalog.claims.find(c => c.id.startsWith('stanford-helm-gemini'));
  const niche = catalog.claims.find(c => c.id.startsWith('aa-terminalbench-fable-effort'));
  assert.equal(selectClaim([historical, niche, frontier], {
    now, claimVotes: { [niche.id]: 9 }, random: () => 0,
  }).id, frontier.id);
});
