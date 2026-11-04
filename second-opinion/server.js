const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };

http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400);
    return res.end('Bad request');
  }

  if (pathname === '/api/leaderboard' || pathname === '/api/vote') {
    return require('.' + pathname)(req, res);
  }
  const route = pathname.replace(/\/$/, '') || '/';
  if (['/review','/dashboard','/rankings'].includes(route)) {
    res.writeHead(307, { Location:'/' });
    return res.end();
  }
  const { rankingsPage, arenaPage, aboutPage } = require('./lib/pages');
  const catalog = require('./data/catalog.json');
  const about = () => aboutPage(fs.readFileSync(path.join(__dirname, 'about.html'), 'utf8'));
  const pages = {
    '/': () => rankingsPage(catalog),
    '/arena': arenaPage,
    '/about': about,
    '/sources': () => require('./lib/source-page').sourcePage(about(), catalog),
  };
  if (Object.hasOwn(pages, route)) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(pages[route]());
  }
  const file = path.join(__dirname, pathname);
  if (!file.startsWith(__dirname + path.sep)) {
    res.writeHead(403);
    return res.end();
  }

  fs.readFile(file, (err, body) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not found');
    }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(body);
  });
}).listen(process.env.PORT || 3000, () => {
  console.log('Listening on http://localhost:' + (process.env.PORT || 3000));
});
