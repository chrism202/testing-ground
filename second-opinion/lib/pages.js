const { categories } = require('../data/catalog.json');
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true" class="arrow"><path d="M6 18 18 6M6 6h12v12"/></svg>';

function tabs() {
  return `<div class="categories" role="tablist" aria-label="Category">${[{id:'all',label:'All'}, ...categories].map(({id:c,label},i) => `<button class="tab${i===0?' active':''}" data-category="${c}" role="tab" aria-selected="${i===0}" aria-controls="${'results'}">${escape(label)}</button>`).join('')}</div>`;
}

function shell(page, content, script = false) {
  const title = { rankings:'The rankings, ranked.', arena:'The arena', about:'About', sources:'Sources' }[page] || 'Leaderboard Arena';
  const nav = [['rankings','/','Rankings'],['arena','/arena','Arena'],['about','/about','About']];
  return `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#fffaf4"><title>${escape(title)} — Leaderboard Arena</title><meta name="description" content="A second opinion on the AI leaderboards everyone quotes."><link rel="stylesheet" href="/app.css"></head>
<body data-page="${page}"><a class="skip-link" href="#main">Skip to content</a>
<header class="site-header"><div class="header-inner"><a class="brand" href="/" aria-label="Leaderboard Arena home"><span class="brand-mark" aria-hidden="true">LA<span>*</span></span><span>leaderboard<span class="brand-arena">arena</span></span></a><nav class="page-tabs" aria-label="Main navigation">${nav.map(([id,href,label]) => `<a href="${href}"${id!=='about'?' data-category-link':''}${id===page || (page==='sources'&&id==='about')?' aria-current="page"':''}>${label}</a>`).join('')}</nav><a class="header-action" data-category-link href="${page==='arena'?'/':'/arena'}">${page==='arena'?'See the rankings':'Have an opinion?'} ${arrow}</a></div></header>
${content}
<footer class="site-footer"><div class="footer-inner"><a class="footer-brand" href="/">leaderboard arena<span>*</span></a><p>A leaderboard for your leaderboards.<br>More = gooder.</p><div class="footer-links"><a href="/about">The founding grievance ${arrow}</a><a href="/sources">Sources & methodology ${arrow}</a></div><small>© 2026 LEADERBOARD ARENA</small></div></footer>${script?'<script src="/matchmaking.js"></script><script src="/app.js"></script>':''}</body></html>`;
}

function rankingsPage(catalog) {
  return shell('rankings', `<main id="main" class="rankings-page"><section class="page-intro"><div><div class="eyebrow">THE LEADERBOARD LEADERBOARD</div><h1>The rankings,<br><em>ranked.</em></h1><p>A second opinion on the benchmarks everyone quotes.</p></div><div class="intro-aside"><span class="asterisk" aria-hidden="true">*</span><p>Who gave them<br>the clipboard?</p><a href="/arena" data-category-link>Return the favor ${arrow}</a></div></section>
<section class="results-section" aria-label="Leaderboard rankings"><div class="results-toolbar">${tabs()}<div class="view-controls" role="group" aria-label="Results display"><button data-view="chart" aria-pressed="true"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1 2h12v2H1zM1 7h9v2H1zM1 12h6v2H1z"/></svg>Chart</button><button data-view="table" aria-pressed="false"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1 2h3v2H1zM6 2h9v2H6zM1 7h3v2H1zM6 7h9v2H6zM1 12h3v2H1zM6 12h9v2H6z"/></svg>Table</button></div></div>
<p id="category-description" class="category-description" hidden></p><div id="results" class="results-panel" data-view="chart" aria-busy="true"><table class="ranking-table"><caption class="sr-only">AI evaluation leaderboards ranked by Elo score</caption><thead><tr><th scope="col" class="rank-heading">Rank</th><th scope="col">Leaderboard</th><th scope="col" class="rating-heading"><span>Elo</span><div id="chart-axis" class="chart-axis" aria-hidden="true"><span>0</span><span>400</span><span>800</span><span>1,200</span><span>1,600</span></div></th><th scope="col" class="votes-heading">Votes</th></tr></thead><tbody id="leaderboard"><tr><td colspan="4" class="loading-cell">Loading rankings…</td></tr></tbody></table></div><div class="results-footer"><span id="roster-count">${catalog.providers.length} leaderboards</span><a href="/arena" data-category-link>Take it up with the arena ${arrow}</a></div></section></main>`, true);
}

function arenaPage() {
  return shell('arena', `<main id="main" class="arena-page"><section class="page-intro arena-intro"><div><div class="eyebrow">THE CROSS-EXAMINATION</div><h1>They made the call.<br><em>You call it.</em></h1><p>One published ranking. One strong opinion.</p></div><span class="intro-stamp" aria-hidden="true">YOUR<br>SECOND<br>OPINION *</span></section>
<div class="arena-toolbar">${tabs()}<span class="arena-toolbar-label" id="arena-category"></span></div>
<p id="category-description" class="category-description" hidden></p><section id="results" class="arena-results" aria-busy="true"><div id="arena" class="arena-card"><div class="claim-heading"><div class="claim-publisher"><span id="claim-mark" class="provider-mark" aria-hidden="true">LA</span><div><div id="claim-provider" class="claim-provider">Loading a ranking…</div><div id="claim-metric" class="claim-metric"></div></div></div><a id="claim-source" class="source-link" target="_blank" rel="noopener noreferrer" hidden>View source ${arrow}</a></div>
<h2 id="proposition" class="sr-only"></h2><div id="claim-details" hidden><div class="model-comparison"><article class="model-card ranked-higher"><div class="model-position"><span>01</span> RANKED HIGHER</div><h3 id="model-a"></h3><div class="model-score"><div class="source-score-track"><span id="model-a-bar"></span></div><strong id="model-a-score"></strong></div><dl id="model-a-stats" class="model-stats" hidden></dl></article><div class="comparison-divider" aria-hidden="true">&gt;</div><article class="model-card ranked-lower"><div class="model-position"><span>02</span> RANKED LOWER</div><h3 id="model-b"></h3><div class="model-score"><div class="source-score-track"><span id="model-b-bar"></span></div><strong id="model-b-score"></strong></div><dl id="model-b-stats" class="model-stats" hidden></dl></article></div><div class="claim-context"><span id="claim-direction"></span><span id="claim-date"></span><details class="claim-context-details"><summary>Context ${arrow}</summary><p id="claim-notes"></p></details></div></div>
<div class="arena-verdict"><p id="claim-question">Does that ranking check out?</p><div class="vote-buttons"><button id="agree" class="button dark" disabled>Agree ${arrow}</button><button id="disagree" class="button light" disabled>Disagree ${arrow}</button></div><button id="skip" class="skip-ranking" disabled>Skip this ranking <span aria-hidden="true">→</span></button></div><div id="vote-status" class="vote-status" role="status" aria-live="polite"></div></div></section></main>`, true);
}

function aboutPage(template) {
  const main = template.match(/<main class="about-page">([\s\S]*?)<\/main>/)?.[1] || '';
  return shell('about', `<main id="main" class="about-page">${main}</main>`);
}

module.exports = { rankingsPage, arenaPage, aboutPage, shell, arrow };
