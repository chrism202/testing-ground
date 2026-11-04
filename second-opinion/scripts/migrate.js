const fs = require('node:fs');
const path = require('node:path');
const { database } = require('../lib/database');
const catalog = require('../data/catalog.json');

async function migrate() {
  const sql = database();
  await sql.query(fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf8'));
  await sql.transaction([
    ...catalog.providers.map(p => sql`INSERT INTO la_evaluators(id, seed_elo, elo) VALUES (${p.id}, ${p.seedElo}, ${p.seedElo}) ON CONFLICT (id) DO NOTHING`),
    sql`UPDATE la_claims SET active = false`,
    ...catalog.claims.map(c => sql`INSERT INTO la_claims(id, evaluator_id, snapshot) VALUES (${c.id}, ${c.providerId}, ${JSON.stringify(c)}::jsonb) ON CONFLICT (id) DO UPDATE SET active = true, snapshot = EXCLUDED.snapshot`),
  ]);
  console.log(`Database ready: ${catalog.providers.length} evaluation boards, ${catalog.claims.length} sourced rankings. Existing votes preserved.`);
}

if (require.main === module) migrate().catch(error => {
  console.error('Database migration failed:', error.code || error.name);
  process.exitCode = 1;
});

module.exports = { migrate };
