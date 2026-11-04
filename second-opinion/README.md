# Leaderboard Arena

A tongue-in-cheek leaderboard for AI leaderboards. Run `npm ci` and `npm start`, then visit http://localhost:3000.

## Deploy to Vercel

Set the project's Root Directory to `second-opinion`. The checked-in `vercel.json` selects the Other framework, runs `npm run build`, and publishes `public/` plus the Node functions in `api/`. Clean URLs serve `/about`, `/sources`, `/dashboard`, and `/review`. Do not select the Node.js framework: `app.js` is browser code, and running it as a server causes `FUNCTION_INVOCATION_FAILED`.

Run `npm run build` locally to check the production files. `public/` is generated and should not be committed.

## Ranking claims and starting scores

The arena asks whether the visitor agrees with a particular evaluator's published ordering of two models. A vote changes only that evaluator's Elo-style credibility score; the original model scores remain unchanged. Updates use K=32 against a fixed 1,200 reference. Starting Elo scores are subjective editorial priors, not a measurement of public sentiment, and add no fabricated votes. See [SOURCES.md](SOURCES.md) and `data/catalog.json` for the research, initial ratings, exact model configurations, source metrics, dates, and caveats. The initial 18 evaluation boards contain 35 manually curated claims. This is a snapshot, not an automated live scraper.

The two working design alternatives are `/dashboard` (benchmark dashboard) and `/review` (editorial review desk). They share the same API, standings, and voting controls.

## Database and shared voting

Provision Neon Postgres through Vercel Marketplace, then connect `DATABASE_URL` to the deployment environment. Configure a random, server-only `VOTE_SECRET` of at least 32 bytes as a sensitive Vercel environment variable. Use separate database resources and voting secrets for preview and production.

With `DATABASE_URL` configured, the build applies additive, repeatable schema/seed migrations and runs database checks inside a subtransaction that rolls back all fixtures. Rebuilding preserves existing scores and votes. The API stores signed anonymous browser identities and hashed network identifiers, validates ranking IDs on the server, prevents duplicate browser votes for the same ranking snapshot, supports idempotent request retries, and limits each network to 60 votes per hour. This is basic anonymous voting protection; clearing cookies and changing networks can still bypass identity limits. Cookie secrets stay on the server. There is no login or claim that each browser corresponds to one unique person.

Without a database, local development uses a separate browser-local score key. Earlier provider-versus-provider prototype scores are not imported into the new ranking-claim system. When a configured database is unavailable, shared voting reports an error instead of silently switching to local scores.

Run `npm test` for API/catalog checks. The production build additionally runs SQL integration checks whenever `DATABASE_URL` is present. The generated static output contains no database credentials or server source.
