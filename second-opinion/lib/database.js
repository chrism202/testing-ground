const { neon } = require('@neondatabase/serverless');

let connection;
function database() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  return connection ||= neon(process.env.DATABASE_URL);
}

async function standings() {
  const rows = await database()`SELECT id, elo, seed_elo, votes, agreements FROM la_evaluators`;
  return Object.fromEntries(rows.map(row => [row.id, {
    elo: row.elo, seedElo: row.seed_elo, votes: row.votes, agreements: row.agreements,
  }]));
}

module.exports = { database, standings };
