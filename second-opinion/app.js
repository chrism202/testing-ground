const localKey = 'leaderboard-arena-claims-v2';
let catalog, scores = {}, voted = new Set(), category = 'all', current, busy = false;
let pendingRequest;
const $ = selector => document.querySelector(selector);
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const score = provider => scores[provider.id] || { elo: provider.seedElo, votes: 0, agreements: 0 };
const date = iso => new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(iso + 'T12:00:00Z'));
function setStatus(text) { $('#vote-status').textContent = text; }
function controls() {
  $('#agree').disabled = busy || !current;
  $('#disagree').disabled = busy || !current;
  $('#skip').disabled = busy || !current;
  document.querySelectorAll('.tab').forEach(tab => { tab.disabled = busy; });
}
function render() {
  const rows = catalog.providers.filter(p => category === 'all' || p.category === category)
    .sort((a,b) => score(b).elo - score(a).elo || a.name.localeCompare(b.name));
  $('#leaderboard').innerHTML = rows.map((p,i) => {
    const rating = score(p);
    return `<tr data-provider="${escape(p.id)}"><td><span class="rank">${String(i+1).padStart(2,'0')}</span></td><td><a class="provider" href="${escape(p.url)}" target="_blank" rel="noopener noreferrer"><span class="provider-icon icon-${i%4}">${escape(p.name.charAt(0))}</span><span>${escape(p.name)}<small class="provider-category">${escape(p.category)}</small></span><span class="external">↗</span></a></td><td class="description">${escape(p.desc)}<details class="seed-details"><summary>Editorial seed: ${p.seedElo}</summary><p>${escape(p.seedReason)}</p><a href="/sources#${escape(p.id)}">Sources & rationale ↗</a></details></td><td class="votes">${rating.votes}</td><td class="elo">${Math.round(rating.elo)}</td></tr>`;
  }).join('');
  $('#board-mode').textContent = catalog.mode === 'shared' ? 'SHARED STANDINGS' : 'YOUR LOCAL STANDINGS';
  $('#roster-count').textContent = `${catalog.providers.length} LEADERBOARDS · ${catalog.claims.length} PUBLISHED RANKINGS`;
  const total = $('#total-votes');
  if (total) total.textContent = catalog.providers.reduce((sum,p) => sum + score(p).votes, 0).toLocaleString();
}
function matchup(skip = false) {
  const pool = catalog.claims.filter(c => (category === 'all' || c.category === category) && !voted.has(c.id));
  const choices = skip && pool.length > 1 ? pool.filter(c => c.id !== current?.id) : pool;
  current = choices.length ? choices[Math.floor(Math.random()*choices.length)] : null;
  pendingRequest = null;
  $('#claim-details').hidden = !current;
  if (!current) {
    $('#claim-provider').textContent = 'THE PEOPLE HAVE SPOKEN. YOU, SPECIFICALLY.';
    $('#proposition').textContent = 'You’ve called them all.';
    $('#claim-question').textContent = 'Try another category. New published rankings will bring new arguments.';
    setStatus('ALL AVAILABLE RANKINGS IN THIS CATEGORY HAVE YOUR VOTE.');
    controls(); return;
  }
  const provider = catalog.providers.find(p => p.id === current.providerId);
  $('#arena-category').textContent = current.category.toUpperCase() + ' EDITION';
  $('#claim-provider').textContent = provider.name + ' RANKS';
  $('#proposition').innerHTML = `<span>${escape(current.modelA)}</span><small class="ranking-relation">above</small><span>${escape(current.modelB)}</span><span class="period">.</span>`;
  $('#claim-question').textContent = `Do you agree with ${provider.name}’s ranking?`;
  $('#claim-metric').textContent = current.metric;
  $('#claim-evidence').textContent = `${current.scoreA} vs ${current.scoreB}${current.lowerIsBetter ? ' · lower is better' : ' · higher is better'}`;
  $('#claim-source').href = current.sourceUrl;
  $('#claim-date').textContent = 'SNAPSHOT ' + date(current.sourceDate);
  $('#claim-notes').textContent = current.notes;
  setStatus(catalog.mode === 'shared' ? 'YOUR VOTE CHANGES THIS EVALUATOR’S SHARED ELO.' : 'LOCAL PREVIEW · YOUR VOTE CHANGES THIS EVALUATOR’S ELO ON THIS DEVICE.');
  controls();
}
function saveLocal() {
  try { localStorage.setItem(localKey, JSON.stringify({scores, voted:[...voted]})); }
  catch { setStatus('VOTE COUNTED FOR THIS VISIT. THIS BROWSER COULD NOT SAVE IT.'); }
}
async function vote(agree) {
  if (!current || busy) return;
  const claim = current;
  busy = true; controls(); setStatus('SUBMITTING YOUR STRONG OPINION…');
  try {
    if (catalog.mode === 'shared') {
      pendingRequest ||= { requestId: crypto.randomUUID(), claimId: claim.id, agree };
      // After a network error, retry the identical opinion with the same ID.
      if (pendingRequest.agree !== agree) throw new Error('Please retry your previous vote first so it is counted exactly once.');
      const response = await fetch('/api/vote', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(pendingRequest) });
      const result = await response.json();
      if (!response.ok) {
        if (response.status < 500) pendingRequest = null;
        throw new Error(result.error || 'Your vote could not be confirmed. Please retry.');
      }
      scores[result.provider_id] = {elo:result.elo, votes:result.votes, agreements:result.agreements};
    } else {
      const provider = catalog.providers.find(p => p.id === claim.providerId);
      const before = score(provider);
      const expected = 1/(1+10**((1200-before.elo)/400));
      scores[provider.id] = {elo:before.elo+32*((agree?1:0)-expected),votes:before.votes+1,agreements:before.agreements+(agree?1:0)};
    }
    voted.add(claim.id);
    if (catalog.mode === 'local') saveLocal();
    render(); matchup();
    if (current) setStatus('VOTE COUNTED. ANOTHER RANKING, ANOTHER OPINION.');
  } catch (error) { setStatus(error.message); }
  finally { busy = false; controls(); }
}
async function init() {
  try {
    const response = await fetch('/api/leaderboard');
    if (!response.ok) throw new Error('The standings are taking a breather. Reload to try again.');
    catalog = await response.json(); scores = catalog.scores; voted = new Set(catalog.votedClaims);
    if (catalog.mode === 'local') {
      try {
        const saved = JSON.parse(localStorage.getItem(localKey));
        if (saved && typeof saved.scores === 'object' && Array.isArray(saved.voted)) {
          for (const p of catalog.providers) {
            const s = saved.scores[p.id];
            if (s && Number.isFinite(s.elo) && Number.isInteger(s.votes) && s.votes >= 0 && Number.isInteger(s.agreements)) scores[p.id] = s;
          }
          voted = new Set(saved.voted.filter(id => catalog.claims.some(c => c.id === id)));
        }
      } catch {}
    }
    render(); matchup();
    $('#storage-description').textContent = catalog.mode === 'shared'
      ? 'Votes update shared standings. One vote per published ranking per browser; new snapshots get a fresh vote.'
      : 'These are local standings, saved in this browser. One vote per published ranking. Shared voting connects when the database is configured.';
    document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => {
      if (busy) return;
      category = tab.dataset.category;
      document.querySelectorAll('.tab').forEach(t => {t.classList.toggle('active',t===tab);t.setAttribute('aria-selected',String(t===tab));});
      render(); matchup();
    }));
    $('#agree').addEventListener('click',()=>vote(true));
    $('#disagree').addEventListener('click',()=>vote(false));
    $('#skip').addEventListener('click',()=>matchup(true));
  } catch (error) {
    $('#leaderboard').innerHTML = '<tr><td colspan="5">The standings are temporarily unavailable. Please reload to try again.</td></tr>';
    setStatus(error.message); controls();
  }
}
controls(); init();
