# Second Opinion

A tongue-in-cheek leaderboard for AI leaderboards. Open `index.html` or run `npm start` and visit http://localhost:3000. The static files can be deployed to Vercel with no build command or environment variables.

Each category starts at 1,200 Elo. Agree awards the first provider a win; disagree awards the second provider a win. Scores use K=32 and are stored in browser localStorage, so they are private to that browser and are not shared across visitors. The listed providers and descriptions are illustrative starter data, not researched endorsements or live integrations. Edit `seed` in `app.js` to curate them. A production shared leaderboard needs a persistent database, server-side vote validation, and abuse controls.
