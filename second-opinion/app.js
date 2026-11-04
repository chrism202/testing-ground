const localKey = 'leaderboard-arena-claims-v2';
const $ = selector => document.querySelector(selector);
const isArena = document.body.dataset.page === 'arena';
const arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true" class="arrow"><path d="M6 18 18 6M6 6h12v12"/></svg>';
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const score = provider => scores[provider.id] || { elo: provider.seedElo, votes: 0, agreements: 0 };
const number = value => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
const date = iso => new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(iso + 'T12:00:00Z'));
let catalog, scores = {}, claimVotes = {}, voted = new Set(), category = 'all', current, busy = false;
let pendingRequest, statusTimer;

function setStatus(text, temporary = false) {
  const status = $('#vote-status');
  if (!status) return;
  clearTimeout(statusTimer);
  status.textContent = text;
  if (temporary) statusTimer = setTimeout(() => { status.textContent = ''; }, 2500);
}
function controls() {
  if (isArena) {
    $('#agree').disabled = busy || !current;
    $('#disagree').disabled = busy || !current;
    $('#skip').disabled = busy || !current;
    $('#agree').textContent = busy && pendingRequest?.agree ? 'Sending…' : 'Agree';
    $('#disagree').textContent = busy && pendingRequest?.agree === false ? 'Sending…' : 'Disagree';
  }
  document.querySelectorAll('.tab').forEach(tab => { tab.disabled = busy; });
}
function renderRankings() {
  if (!$('#leaderboard')) return;
  const rows = catalog.providers.filter(p => category === 'all' || p.category === category)
    .sort((a,b) => score(b).elo - score(a).elo || a.name.localeCompare(b.name));
  const maximum = Math.ceil(Math.max(1600, ...rows.map(p => score(p).elo)) / 200) * 200;
  $('#chart-axis').innerHTML = Array.from({length:5}, (_,i) => `<span>${number(maximum*i/4)}</span>`).join('');
  $('#leaderboard').innerHTML = rows.map((provider,index) => {
    const rating = score(provider);
    const percent = Math.max(0, Math.min(100, rating.elo/maximum*100));
    const color = /^#[0-9a-f]{6}$/i.test(provider.color) ? provider.color : '#e43b29';
    return `<tr data-provider="${escape(provider.id)}" style="--provider-color:${color}"><td class="rank-cell"><span class="rank">${String(index+1).padStart(2,'0')}</span></td><td class="provider-cell"><a class="provider" href="${escape(provider.url)}" target="_blank" rel="noopener noreferrer"><span class="provider-mark" aria-hidden="true">${escape(provider.mark || provider.name.charAt(0))}</span><span class="provider-label"><span class="provider-name">${escape(provider.name)}</span><span class="provider-category">${escape(provider.category)}</span></span><span class="provider-external">${arrow}</span></a></td><td class="rating-cell"><div class="rating-value"><div class="score-track" aria-hidden="true"><span class="score-bar" style="width:${percent}%"></span></div><strong class="elo">${Math.round(rating.elo).toLocaleString('en-US')}</strong></div></td><td class="votes">${rating.votes.toLocaleString('en-US')}</td></tr>`;
  }).join('');
  $('#roster-count').textContent = `${rows.length} leaderboard${rows.length===1?'':'s'}`;
}
async function matchup(skip = false, refresh = true) {
  if (!isArena) return;
  busy = true; controls();
  try {
    if (refresh && catalog.mode === 'shared') {
      const response = await fetch('/api/leaderboard');
      if (!response.ok) throw new Error('The next ranking could not be loaded. Please reload to try again.');
      const latest = await response.json();
      if (latest.mode !== 'shared') throw new Error('Shared voting is unavailable. Please reload to try again.');
      scores = latest.scores;
      claimVotes = latest.claimVotes;
      for (const id of latest.votedClaims) voted.add(id);
    }
    current = matchmaking.selectClaim(catalog.claims, {
      category, voted, claimVotes, skipId: skip ? current?.id : undefined,
    });
    pendingRequest = null;
    setStatus('');
    $('#claim-details').hidden = !current;
    $('#claim-source').hidden = !current;
    $('#claim-mark').hidden = !current;
    $('#arena').classList.toggle('is-complete', !current);
    if (!current) {
      $('#claim-provider').textContent = 'You’ve called them all.';
      $('#claim-metric').textContent = 'Try another category, or take a look at the rankings.';
      $('#proposition').textContent = 'No more rankings in this category.';
      $('#claim-question').innerHTML = `<a href="/" class="complete-link">See the rankings ${arrow}</a>`;
      $('#arena-category').textContent = '';
      return true;
    }
    const provider = catalog.providers.find(p => p.id === current.providerId);
    const color = /^#[0-9a-f]{6}$/i.test(provider.color) ? provider.color : '#e43b29';
    $('#arena').style.setProperty('--provider-color', color);
    $('#claim-mark').textContent = provider.mark || provider.name.charAt(0);
    $('#arena-category').textContent = current.category;
    $('#claim-provider').textContent = provider.name;
    $('#proposition').textContent = `${provider.name} ranks ${current.modelA} above ${current.modelB}.`;
    $('#model-a').textContent = current.modelA;
    $('#model-b').textContent = current.modelB;
    const maximum = Math.max(current.scoreA, current.scoreB, 0.001) * 1.12;
    for (const [letter,value] of [['a',current.scoreA],['b',current.scoreB]]) {
      $('#model-'+letter+'-score').textContent = number(value);
      $('#model-'+letter+'-bar').style.width = Math.max(0, Math.min(100, value/maximum*100))+'%';
    }
    $('#claim-question').textContent = 'Does that ranking check out?';
    $('#claim-metric').textContent = current.metric;
    $('#claim-source').href = current.sourceUrl;
    $('#claim-direction').textContent = current.lowerIsBetter ? 'Lower is better' : 'Higher is better';
    $('#claim-date').textContent = date(current.sourceDate);
    $('#claim-notes').textContent = current.notes;
    $('#claim-notes').closest('details').open = false;
    return true;
  } catch (error) {
    current = null;
    $('#claim-details').hidden = true;
    $('#claim-source').hidden = true;
    $('#claim-mark').hidden = true;
    $('#claim-provider').textContent = 'A brief recess.';
    $('#claim-metric').textContent = 'Please reload to try again.';
    setStatus(error.message);
    return false;
  } finally { busy = false; controls(); }
}
function saveLocal() {
  try { localStorage.setItem(localKey, JSON.stringify({scores, voted:[...voted]})); return true; }
  catch { return false; }
}
async function vote(agree) {
  if (!current || busy) return;
  const claim = current;
  busy = true; controls(); setStatus('');
  let saved = true;
  try {
    if (catalog.mode === 'shared') {
      pendingRequest ||= { requestId: crypto.randomUUID(), claimId: claim.id, agree };
      if (pendingRequest.agree !== agree) throw new Error('Please retry your previous vote first.');
      controls();
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
    claimVotes[claim.id] = (claimVotes[claim.id] || 0) + 1;
    if (catalog.mode === 'local') saved = saveLocal();
    const advanced = await matchup();
    if (advanced) setStatus(saved ? 'Noted.' : 'Your browser couldn’t save this vote.', saved);
  } catch (error) { setStatus(error.message); }
  finally { busy = false; controls(); }
}
async function init() {
  try {
    const response = await fetch('/api/leaderboard');
    if (!response.ok) throw new Error('The rankings are unavailable. Please reload to try again.');
    catalog = await response.json(); scores = catalog.scores; claimVotes = catalog.claimVotes || {}; voted = new Set(catalog.votedClaims);
    if (catalog.mode === 'local') {
      try {
        const saved = JSON.parse(localStorage.getItem(localKey));
        if (saved && typeof saved.scores === 'object' && saved.scores && Array.isArray(saved.voted)) {
          for (const p of catalog.providers) {
            const s = saved.scores[p.id];
            if (s && Number.isFinite(s.elo) && Number.isInteger(s.votes) && s.votes >= 0 && Number.isInteger(s.agreements) && s.agreements >= 0 && s.agreements <= s.votes) scores[p.id] = s;
          }
          voted = new Set(saved.voted.filter(id => catalog.claims.some(c => c.id === id)));
          claimVotes = Object.fromEntries([...voted].map(id => [id, 1]));
        }
      } catch {}
    }
    renderRankings(); await matchup(false, false);
    $('#results').setAttribute('aria-busy','false');
    document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => {
      if (busy) return;
      category = tab.dataset.category;
      document.querySelectorAll('.tab').forEach(t => {t.classList.toggle('active',t===tab);t.setAttribute('aria-selected',String(t===tab));});
      renderRankings(); matchup();
    }));
    document.querySelectorAll('[data-view]').forEach(button => {
      if (button.tagName !== 'BUTTON') return;
      button.addEventListener('click', () => {
        $('#results').dataset.view = button.dataset.view;
        document.querySelectorAll('button[data-view]').forEach(b => b.setAttribute('aria-pressed',String(b===button)));
      });
    });
    if (isArena) {
      $('#agree').addEventListener('click',()=>vote(true));
      $('#disagree').addEventListener('click',()=>vote(false));
      $('#skip').addEventListener('click',()=>matchup(true));
    }
  } catch (error) {
    $('#results').setAttribute('aria-busy','false');
    if ($('#leaderboard')) $('#leaderboard').innerHTML = '<tr><td colspan="4" class="loading-cell">The rankings are temporarily unavailable. Please reload to try again.</td></tr>';
    if (isArena) {
      $('#claim-provider').textContent = 'A brief recess.';
      $('#claim-metric').textContent = 'Please reload to try again.';
      setStatus(error.message);
    }
    controls();
  }
}
controls(); init();
