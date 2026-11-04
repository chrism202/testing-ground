const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function sourcePage(template, catalog) {
  const intro = `<main id="main" class="about-page"><section class="about-hero"><div class="eyebrow">THE FINE PRINT</div><h1>Vibes,<br><em>with receipts.</em></h1><p class="about-lede">${catalog.providers.length} evaluation boards. ${catalog.claims.length} published model rankings.</p><p class="about-introduction">${escape(catalog.seedMethodology.description)}</p><p class="about-introduction">The starting scores reward transparent methods, independent testing and reproducible data, and discount narrow coverage, stale tasks, opaque weighting and known disputes. They are editorial opinions, not a poll.</p><p class="about-introduction">Research updated ${escape(catalog.researchedOn)}. Historical rankings are marked with their original snapshot dates.</p></section><article class="about-story" aria-label="Sources and editorial seed ratings">`;
  const boards = [...catalog.providers].sort((a,b) => b.seedElo-a.seedElo).map(p => {
    const claims = catalog.claims.filter(c => c.providerId === p.id);
    const urls = [...new Set([...p.researchUrls, ...claims.map(c => c.dataUrl).filter(Boolean)])];
    return `<section class="about-chapter" id="${escape(p.id)}"><div class="kicker">${escape((catalog.categories.find(c => c.id === p.category)?.title || p.category).toUpperCase())} / EDITORIAL SEED ${p.seedElo}</div><div class="about-chapter-copy"><h2>${escape(p.name)}</h2><p>${escape(p.seedReason)}</p><ul class="source-links">${urls.map((url,i) => `<li><a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${i===0 ? 'Published leaderboard' : 'Research / data source '+i} ↗</a><small>${escape(new URL(url).hostname)}</small></li>`).join('')}</ul><p class="source-claim-count">${claims.length} curated ranking${claims.length===1?'':'s'} in the arena. Source metrics and Arena credibility scores use separate scales.</p></div></section>`;
  }).join('');
  return template.replace(/<title>.*?<\/title>/, '<title>Sources & starting Elo — Leaderboard Arena</title>')
    .replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="The published leaderboard sources and editorial rationale behind Leaderboard Arena’s initial Elo scores.">')
    .replace(/<main\b[^>]*class="about-page"[^>]*>[\s\S]*?<\/main>/, intro + boards + '</article><section class="about-reality"><div><div class="kicker">NOW IT’S YOUR TURN</div><h2>A second<br><em>opinion?</em></h2></div><a class="button dark" href="/arena">Enter the arena <span aria-hidden="true">→</span></a></section></main>');
}

module.exports = { sourcePage };
