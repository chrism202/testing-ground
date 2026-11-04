function json(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) {
    throw Object.assign(new Error('Send JSON.'), { status: 415 });
  }
  if (req.body !== undefined) {
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    if (Buffer.byteLength(body) > 2048) throw Object.assign(new Error('Request too large.'), { status: 413 });
    try { return JSON.parse(body); }
    catch { throw Object.assign(new Error('Invalid JSON.'), { status: 400 }); }
  }
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (Buffer.byteLength(raw) > 2048) throw Object.assign(new Error('Request too large.'), { status: 413 });
  }
  try { return JSON.parse(raw); }
  catch { throw Object.assign(new Error('Invalid JSON.'), { status: 400 }); }
}

module.exports = { json, readBody };
