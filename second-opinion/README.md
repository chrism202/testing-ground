# Leaderboard Arena

A tongue-in-cheek leaderboard for AI leaderboards. Open `index.html` or run `npm start` and visit http://localhost:3000.

## Deploy to Vercel

Set the project's Root Directory to `second-opinion`. The checked-in `vercel.json` selects the Other (static) framework, runs `npm run build`, and publishes `public/`. The build copies only `index.html`, `about.html`, `style.css`, and `app.js`; no server or environment variables are needed. Clean URLs serve the About page at `/about`. Do not select the Node.js framework: `app.js` is browser code, and running it as a server causes `FUNCTION_INVOCATION_FAILED`.

Run `npm run build` locally to check the production files. `public/` is generated and should not be committed.

Each category starts at 1,200 Elo. Agree awards the first provider a win; disagree awards the second provider a win. Scores use K=32 and are stored in browser localStorage, so they are private to that browser and are not shared across visitors. The listed providers and descriptions are illustrative starter data, not researched endorsements or live integrations. Edit `seed` in `app.js` to curate them. A production shared leaderboard needs a persistent database, server-side vote validation, and abuse controls.
