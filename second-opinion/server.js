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
  if (pathname === '/sources' || pathname === '/sources/') {
    const catalog = require('./data/catalog.json');
    const { sourcePage } = require('./lib/source-page');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(sourcePage(fs.readFileSync(path.join(__dirname, 'about.html'), 'utf8'), catalog));
  }
  if (pathname === '/dashboard' || pathname === '/review') {
    const { designPage } = require('./lib/design-page');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(designPage(pathname.slice(1), require('./data/catalog.json')));
  }

  // Match Vercel's clean URL for the static About page during local development.
  const routes = { '/': 'index.html', '/about': 'about.html', '/about/': 'about.html' };
  const file = path.join(__dirname, routes[pathname] || pathname);
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
