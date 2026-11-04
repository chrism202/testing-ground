const { createHmac, randomUUID, timingSafeEqual } = require('node:crypto');

function hash(value) {
  if (!process.env.VOTE_SECRET) throw new Error('VOTE_SECRET is required for shared voting.');
  return createHmac('sha256', process.env.VOTE_SECRET).update(value).digest('hex');
}

function voter(req, res) {
  const token = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith('la_voter='))?.slice(9);
  let id;
  if (token) {
    const [candidate, signature] = token.split('.');
    if (/^[a-f0-9-]{36}$/.test(candidate) && /^[a-f0-9]{64}$/.test(signature || '') &&
        timingSafeEqual(Buffer.from(signature), Buffer.from(hash('cookie:' + candidate)))) id = candidate;
  }
  if (!id) {
    id = randomUUID();
    const secure = req.headers['x-forwarded-proto'] === 'https' || process.env.VERCEL ? '; Secure' : '';
    res.setHeader('Set-Cookie', `la_voter=${id}.${hash('cookie:' + id)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000${secure}`);
  }
  return hash('voter:' + id);
}

function network(req) {
  const ip = req.headers['x-vercel-forwarded-for'] || req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
  return hash('network:' + String(ip).split(',')[0].trim());
}

module.exports = { voter, network };
