(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let D = null, P = {};
const TABS = {weekly: '本周更新', year: '年度片单', apple: 'Apple TV 精选', save: '省钱攻略'};
const state = {tab: 'weekly', filter: {weekly: 'all', year: 'all', apple: 'all'}};
const light = hex => { const h = hex.replace('#',''); const [r,g,b] = [0,2,4].map(i => parseInt(h.substr(i,2),16)); return .299*r+.587*g+.114*b > 170; };
const pct = v => v == null ? '' : (String(v).endsWith('%') ? v : v + '%');

/* ---------- small builders ---------- */
function ratings(it, big) {
  const r = (it.ratings || [])[0];
  if (!r || (!r.critics && !r.audience)) return `<span class="rb na">暂无评分</span>`;
  return (r.critics ? `<span class="rb">🍅 ${esc(pct(r.critics))}${big ? ' <small>专业评分</small>' : ''}</span>` : '') +
         (r.audience ? `<span class="rb">🍿 ${esc(pct(r.audience))}${big ? ' <small>观众评分</small>' : ''}</span>` : '');
}
function score(it) { const r = (it.ratings || [])[0]; return r && r.critics ? parseInt(r.critics) : -1; }
function poster(it, opts = {}) {
  const p = P[it.platform] || {name: it.platform, color: '#555'};
  const img = it.poster ? `<img src="${esc(it.poster)}" alt="" loading="${opts.eager ? 'eager' : 'lazy'}" decoding="async" onload="this.classList.add('ld');this.parentNode.classList.add('ok')">`
                        : `<div class="ph" style="background:linear-gradient(160deg,${p.color}66,#0d1013 75%)">${esc(it.title_en || it.title_zh)}</div>`;
  const tag = opts.noTag ? '' : `<span class="ptag ${light(p.color) ? 'l' : ''}" style="background:${p.color}">${esc(p.name)}</span>`;
  const soon = it.status === 'upcoming' && !opts.noSoon ? `<span class="soonb">即将</span>` : '';
  const b = opts.badge ? `<span class="dbg">${esc(opts.badge)}</span>` : '';
  const s = opts.score && score(it) >= 0 ? `<span class="sbg">🍅${score(it)}</span>` : '';
  const nw = it.new && !opts.noNew ? `<span class="newb">NEW</span>` : '';
  return `<div class="pw${it.poster ? '' : ' ok'}">${img}${tag}${soon}${nw}${b}${s}</div>`;
}
const key = (list, it) => `${list}:${it.id}`;
const REG = new Map();          // card key -> item
function reg(list, it) { const k = key(list, it); REG.set(k, {...it, _list: list}); return k; }
function pcard(list, it, o = {}) {
  return `<button class="pc" data-k="${reg(list, it)}">${poster(it, {badge: it.badge || shortDate(it), score: o.score})}
    <div class="tz">${esc(it.title_zh || it.title_en)}</div><div class="mm">${esc(o.mm ? o.mm(it) : (it.kind || (it.tags || [])[0] || ''))}</div></button>`;
}
function gcard(list, it, o = {}) {
  return `<button class="gc" data-k="${reg(list, it)}">${poster(it, {badge: it.badge || shortDate(it), score: o.score})}
    <div class="tz">${esc(it.title_zh || it.title_en)}</div><div class="mm">${esc(o.mm ? o.mm(it) : (it.kind || ''))}</div></button>`;
}
function shortDate(it) { return (it.date_label || '').split(' ')[0]; }
function row(title, list, items, o = {}) {
  if (!items.length) return '';
  return `<div class="sec"><div class="sec-h">${o.color ? `<span class="bar" style="background:${o.color}"></span>` : ''}<h2>${esc(title)}</h2><span class="n">${o.n ?? items.length + ' 部'}</span></div>
    <div class="row">${items.map(it => pcard(list, it, o)).join('')}</div></div>`;
}
function hero(list, items, rankLabel) {
  if (!items.length) return '';
  return `<div class="hero" data-dots>${items.map((it, i) => {
    const bg = it.poster ? `style="background-image:url('${esc(it.poster)}')"` : '';
    return `<button class="hcard" data-k="${reg(list, it)}"><div class="bg" ${bg}></div><div class="in">
      ${it.poster ? `<img src="${esc(it.poster)}" alt="" ${i < 2 ? '' : 'loading="lazy"'} decoding="async">` : ''}
      <div class="tx">${it.new ? `<span class="rkw"><span class="rk">${esc(rankLabel(it, i))}</span><span class="newp">NEW</span></span>` : `<span class="rk">${esc(rankLabel(it, i))}</span>`}<div class="tz">${esc(it.title_zh || it.title_en)}</div>
      <div class="te">${esc(it.title_zh ? it.title_en : '')}</div><div class="bl">${esc(it.blurb || '')}</div><div class="rs">${ratings(it)}</div></div></div></button>`;
  }).join('')}</div><div class="dots">${items.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div>`;
}
function top10(list, items, title) {
  if (!items.length) return '';
  return `<div class="sec"><div class="sec-h"><span class="bar" style="background:var(--acc)"></span><h2>${esc(title)}</h2><span class="n">TOP ${items.length}</span></div>
   <div class="row">${items.map(it => `<button class="tc" data-k="${reg(list, it)}"><span class="num">${it.top}</span>${poster(it, {noSoon: true})}</button>`).join('')}</div></div>`;
}
function chips(tab, keys, labelOf, colorOf) {
  const f = state.filter[tab];
  return `<div class="chips" data-tab="${tab}"><button class="chip ${f === 'all' ? 'on' : ''}" data-f="all">全部</button>${keys.map(k =>
    `<button class="chip ${f === k ? 'on' : ''}" data-f="${k}"><i style="background:${colorOf(k)}"></i>${esc(labelOf(k))}</button>`).join('')}</div>`;
}
function notes(l) {
  const ps = [l.ratings_note, ...(l.footer_notes || [])].filter(Boolean);
  return ps.length ? `<div class="note">${ps.map(p => `<p>${esc(p)}</p>`).join('')}<p>数据生成：${esc(l.generated || D.generated)}</p></div>` : '';
}

/* ---------- views ---------- */
function vWeekly() {
  const l = D.lists.weekly; if (!l) return '<div class="empty">暂无本周数据</div>';
  const f = state.filter.weekly, all = l.items.slice().sort((a, b) => a.date.localeCompare(b.date));
  const tops = all.filter(i => i.top).sort((a, b) => a.top - b.top);
  const vis = all.filter(i => f === 'all' || i.platform === f);
  const plats = Object.keys(P).filter(k => all.some(i => i.platform === k));
  const counts = plats.map(k => `<div class="st"><i style="background:${P[k].color}"></i><b>${all.filter(i => i.platform === k).length}</b><span>${esc(P[k].name)}</span></div>`).join('');
  const nRel = all.filter(i => i.status === 'released').length, nUp = all.length - nRel, td = TODAY.slice(5).replace('-', '/').replace(/^0/, '').replace('/0', '/');
  const sub = /已上线.*即将上线/.test(l.subtitle || '') ? `截至 ${td}：已上线 ${nRel} 部 · 即将上线 ${nUp} 部` : (l.subtitle || '');
  let h = newsBar() + `<div class="sub">${esc(l.range_label)} · ${esc(sub)}</div>`;
  h += hero('weekly', tops, (it, i) => `本周 TOP ${it.top}`);
  h += chips('weekly', plats, k => P[k].name, k => P[k].color);
  h += `<div data-filtered>`;
  h += row('本周已上线', 'weekly', vis.filter(i => i.status === 'released'), {});
  h += row('即将上线', 'weekly', vis.filter(i => i.status === 'upcoming'), {});
  if (f === 'all') {
    h += `<div class="sec"><div class="sec-h"><h2>各平台上新</h2><span class="n">共 ${all.length} 部</span></div><div class="stats">${counts}</div></div>`;
    plats.forEach(k => h += row(P[k].name, 'weekly', all.filter(i => i.platform === k), {color: P[k].color}));
  }
  h += `</div>` + notes(l);
  return h;
}
function vYear() {
  const l = D.lists.year; if (!l) return '<div class="empty">暂无年度数据</div>';
  const f = state.filter.year;
  const rel = l.items.filter(i => i.status !== 'upcoming'), up = l.items.filter(i => i.status === 'upcoming').sort((a, b) => a.date.localeCompare(b.date));
  const tops = rel.filter(i => i.top).sort((a, b) => a.top - b.top);
  const plats = Object.keys(P).filter(k => rel.some(i => i.platform === k));
  const vis = rel.filter(i => f === 'all' || i.platform === f).sort((a, b) => score(b) - score(a));
  let h = `<div class="sub">${esc(l.title)} · ${esc(l.range_label)} · ${esc(l.subtitle || '')}</div>`;
  h += hero('year', tops.slice(0, 3), it => `年度 No.${it.top}`);
  h += top10('year', tops, l.top_title || 'TOP 10');
  h += chips('year', plats, k => P[k].name, k => P[k].color);
  h += `<div data-filtered>`;
  if (f === 'all') plats.forEach(k => h += row(P[k].name, 'year', vis.filter(i => i.platform === k), {color: P[k].color, score: true, mm: it => `${it.kind || ''} · ${it.date_label || ''}`}));
  else h += `<div class="sec"><div class="sec-h"><h2>${esc(P[f].name)} 年度精选</h2><span class="n">${vis.length} 部 · 按评分</span></div><div class="grid">${vis.map(it => gcard('year', it, {score: true, mm: it => `${it.kind || ''} · ${it.date_label || ''}`})).join('')}</div></div>`;
  h += row(l.upcoming_title || '年底还值得期待', 'year', up.filter(i => f === 'all' || i.platform === f), {color: 'var(--soon)', n: l.upcoming_range || '', mm: it => `${P[it.platform]?.name || ''} · ${it.date_label}`});
  h += `</div>` + notes(l);
  return h;
}
function vApple() {
  const l = D.lists.apple; if (!l) return '<div class="empty">暂无 Apple TV 数据</div>';
  const f = state.filter.apple, groups = l.groups || [];
  const tops = l.items.filter(i => i.top).sort((a, b) => a.top - b.top);
  const vis = l.items.filter(i => f === 'all' || i.group === f).sort((a, b) => score(b) - score(a));
  const mm = it => `${it.date_label || ''}${it.awards && it.awards.length ? ' · 🏆' : ''}`;
  let h = `<div class="sub">${esc(l.range_label)} · ${esc(l.subtitle || '')}</div>`;
  h += hero('apple', tops.slice(0, 3), it => `No.${it.top}`);
  h += top10('apple', tops, l.top_title || 'TOP 10');
  h += chips('apple', groups.map(g => g.key), k => groups.find(g => g.key === k).name, k => groups.find(g => g.key === k).color);
  h += `<div data-filtered>`;
  if (f === 'all') groups.forEach(g => h += row(g.name, 'apple', vis.filter(i => i.group === g.key), {color: g.color, score: true, mm}));
  else { const g = groups.find(x => x.key === f); h += `<div class="sec"><div class="sec-h"><span class="bar" style="background:${g.color}"></span><h2>${esc(g.name)}</h2><span class="n">${vis.length} 部 · 按评分</span></div><div class="grid">${vis.map(it => gcard('apple', it, {score: true, mm})).join('')}</div></div>`; }
  const aw = l.items.filter(i => i.awards && i.awards.length).sort((a, b) => b.awards.length - a.awards.length || score(b) - score(a));
  if (f === 'all') h += row('🏆 获奖作品', 'apple', aw, {color: 'var(--acc)', mm: it => it.awards[0]});
  h += `</div>` + notes(l);
  return h;
}
function vSave() {
  const s = D.savings; if (!s) return '<div class="empty">暂无省钱攻略</div>';
  const w = D.lists.weekly;
  let h = `<div class="sub">${esc(s.note)}</div>`;
  if (w) {
    const plats = Object.keys(P).map(k => [k, w.items.filter(i => i.platform === k).length]).filter(x => x[1]).sort((a, b) => b[1] - a[1]);
    h += `<div class="sec"><div class="sec-h"><h2>本周哪家上新多</h2><span class="n">${esc(w.range_label)}</span></div><div class="stats">${plats.map(([k, n]) =>
      `<div class="st"><i style="background:${P[k].color}"></i><b>${n}</b><span>${esc(P[k].name)}</span></div>`).join('')}</div></div>`;
  }
  h += `<div class="sec"><div class="sec-h"><h2>月费一览</h2><span class="n">美国区 · 税前</span></div>${s.plans.map(p => {
    const pl = P[p.platform] || {name: p.platform, color: '#888'};
    return `<div class="plan"><div class="plan-h"><i style="background:${pl.color}"></i>${esc(pl.name)}</div>
      <div class="plan-g"><div><small>带广告</small><b>${esc(p.ads)}</b></div><div><small>无广告</small><b>${esc(p.noads)}</b></div><div><small>年付</small><b style="font-size:12.5px">${esc(p.annual)}</b></div></div>
      ${p.extra || p.top ? `<div class="plan-x">${esc(p.top ? '最高档 ' + p.top : '')}${p.top && p.extra ? ' · ' : ''}${esc(p.extra || '')}</div>` : ''}</div>`;
  }).join('')}</div>`;
  h += `<div class="sec"><div class="sec-h"><h2>省钱技巧</h2></div>${s.tips.map(t => `<div class="tip"><b>${esc(t.t)}</b><p>${esc(t.d)}</p></div>`).join('')}</div>`;
  h += `<div class="note"><p>价格来源（${esc(s.updated)} 核对）：</p>${s.sources.map(x => `<p><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.name)}</a></p>`).join('')}</div>`;
  return h;
}
/* ---------- release status decided on the phone at open time (Asia/Shanghai calendar day) ---------- */
const todaySH = () => new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date());
let TODAY = '';
function deriveStatus() {
  TODAY = todaySH();
  Object.values(D.lists).forEach(l => l.items.forEach(it => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(it.date || '')) it.status = it.date <= TODAY ? 'released' : 'upcoming';
  }));
}
/* ---------- "what's new": per-device seen state (localStorage), tab dots, banner ---------- */
const SEEN_KEY = 'seen-v1', LISTS = ['weekly', 'year', 'apple'];
let S = null;
const items = l => (D.lists[l] && D.lists[l].items) || [];
const saveSeen = () => { try { localStorage.setItem(SEEN_KEY, JSON.stringify(S)); } catch (_) {} };
function initSeen() {
  try { S = JSON.parse(localStorage.getItem(SEEN_KEY)); } catch (_) { S = null; }
  const upd = (D.update && D.update.id) || D.generated;
  if (!S || !S.ids) {            // first launch ever: everything counts as seen except this update's new items
    S = {ids: {}, banner: null};
    LISTS.forEach(l => items(l).forEach(it => { if (!it.new) S.ids[key(l, it)] = 1; }));
  }
  const unseen = new Set();
  LISTS.forEach(l => items(l).forEach(it => { if (!S.ids[key(l, it)]) unseen.add(it.id); }));
  if (S.banner && S.banner.u !== upd) S.banner = null;          // banner belongs to one update
  if (unseen.size) {
    if (!S.banner) S.banner = {u: upd, n: unseen.size, off: false};
    else if (!S.banner.off) S.banner.n = Math.max(S.banner.n, unseen.size);
  }
  S.update = upd; saveSeen();
  document.querySelectorAll('.tabbar button').forEach(b => { if (!b.querySelector('.tdot')) b.insertAdjacentHTML('beforeend', '<i class="tdot"></i>'); });
}
function markSeen(tab) {
  if (!S || !LISTS.includes(tab)) return;
  let ch = false; items(tab).forEach(it => { const k = key(tab, it); if (!S.ids[k]) { S.ids[k] = 1; ch = true; } });
  if (ch) saveSeen(); tabDots();
}
function tabDots() {
  if (!S) return;
  document.querySelectorAll('.tabbar button').forEach(b => {
    const t = b.dataset.tab; b.classList.toggle('has', LISTS.includes(t) && items(t).some(it => !S.ids[key(t, it)]));
  });
}
function newsBar() {
  if (!S || !S.banner || S.banner.off || !S.banner.n) return '';
  const lab = D.update && D.update.label ? ` · ${esc(D.update.label)}` : '';
  return `<div class="nbar" data-nb role="button"><i class="nd"></i><span class="nt">上次看过后新增 <b>${S.banner.n}</b> 部${lab}</span><span class="ng">查看</span><button class="nx" data-nbx aria-label="关闭">×</button></div>`;
}
function jumpToNew() {
  let view = $('#v-weekly'), b = view.querySelector('[data-filtered] .newb');
  if (!b && state.filter.weekly !== 'all') { state.filter.weekly = 'all'; render('weekly'); b = view.querySelector('[data-filtered] .newb'); }
  if (!b) {                                               // nothing new in this tab: go to the first tab still holding new items
    const t = LISTS.find(l => l !== 'weekly' && items(l).some(it => it.new)); if (t) setTab(t);
    view = $('#v-' + (t || 'weekly')); b = view.querySelector('[data-filtered] .newb, .newb'); if (!b) return;
  }
  const card = b.closest('[data-k]'), rowEl = card.closest('.row'), sec = card.closest('.sec') || card;
  const top = sec.getBoundingClientRect().top - view.getBoundingClientRect().top + view.scrollTop - parseFloat(getComputedStyle(view).paddingTop) - ((view.querySelector('.chips') || {}).offsetHeight || 0) + 2;
  view.scrollTo({top: Math.max(0, top), behavior: 'smooth'});
  if (rowEl) rowEl.scrollTo({left: Math.max(0, card.offsetLeft - 18), behavior: 'smooth'});
  card.classList.remove('flash'); void card.offsetWidth; card.classList.add('flash');
}
const VIEWS = {weekly: vWeekly, year: vYear, apple: vApple, save: vSave};
function render(tab) {
  const el = $('#v-' + tab), st = el.scrollTop;
  el.innerHTML = VIEWS[tab]();
  el.scrollTop = st;
  el.querySelectorAll('[data-dots]').forEach(bindDots);
  fitHeroes(el);
}
function fitHeroes(root = document) {
  root.querySelectorAll('.hcard .bl').forEach(bl => {
    bl.style.webkitLineClamp = ''; bl.style.display = '';
    const lh = parseFloat(getComputedStyle(bl).lineHeight) || 18, n = Math.floor((bl.clientHeight + 1) / lh);
    if (n < 1) bl.style.display = 'none'; else { bl.style.webkitLineClamp = String(Math.min(n, 4)); bl.style.maxHeight = (Math.min(n, 4) * lh) + 'px'; }
  });
}
addEventListener('resize', () => fitHeroes());

/* ---------- tabs (each view keeps its own scroll position) ---------- */
function setTab(tab, push = true) {
  if (!TABS[tab]) tab = 'weekly';
  state.tab = tab;
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('on', v.id === 'v-' + tab));
  document.querySelectorAll('.tabbar button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  $('#ttl').textContent = TABS[tab];
  markSeen(tab);
  onScroll();
  if (push) history.replaceState(null, '', '#' + tab);
}
$('#tabbar').addEventListener('click', e => {
  // taps on the bar's padding still pick the nearest tab (part of the bar may sit in the iOS strip)
  const bs = [...document.querySelectorAll('.tabbar button')];
  const b = e.target.closest('button') || bs[Math.min(bs.length - 1, Math.max(0, Math.floor(e.clientX / (innerWidth / bs.length))))]; if (!b) return;
  if (b.dataset.tab === state.tab) $('#v-' + state.tab).scrollTo({top: 0, behavior: 'smooth'});
  else setTab(b.dataset.tab);
});
function onScroll() { $('#top').classList.toggle('sc', $('#v-' + state.tab).scrollTop > 4); }
document.querySelectorAll('.view').forEach(v => v.addEventListener('scroll', onScroll, {passive: true}));

/* ---------- filters + card taps (delegated) ---------- */
$('#views').addEventListener('click', e => {
  if (e.target.closest('[data-nbx]')) { if (S && S.banner) { S.banner.off = true; saveSeen(); } const nb = $('.nbar'); if (nb) nb.remove(); return; }
  if (e.target.closest('[data-nb]')) { jumpToNew(); return; }
  const c = e.target.closest('.chip');
  if (c) {
    const tab = c.parentNode.dataset.tab; state.filter[tab] = c.dataset.f;
    const view = $('#v-' + tab), chipsTop = c.parentNode.offsetTop;
    render(tab);
    const nc = view.querySelector('.chips');
    if (view.scrollTop > chipsTop) view.scrollTop = nc.offsetTop;   // keep chips in view after filtering
    const on = nc.querySelector('.chip.on'); if (on) nc.scrollLeft = on.offsetLeft - 18;
    return;
  }
  const k = e.target.closest('[data-k]'); if (k) openSheet(REG.get(k.dataset.k));
});
function bindDots(hero) {
  const dots = hero.nextElementSibling; if (!dots) return;
  hero.addEventListener('scroll', () => {
    const i = Math.round(hero.scrollLeft / (hero.firstElementChild.offsetWidth + 12));
    [...dots.children].forEach((d, j) => d.classList.toggle('on', j === i));
  }, {passive: true});
}

/* ---------- detail bottom sheet with drag-to-dismiss ---------- */
const sheet = $('#sheet'), scrim = $('#scrim'), body = $('#sheetBody');
function openSheet(it) {
  if (!it) return;
  const p = P[it.platform] || {name: it.platform, color: '#555'};
  const lst = D.lists[it._list] || {};
  const grp = (lst.groups || []).find(g => g.key === it.group);
  const status = it.status === 'upcoming' ? `<span class="pill soon">即将上线</span>` : `<span class="pill ok">已上线</span>`;
  const r = (it.ratings || [])[0];
  let host = ''; try { host = new URL(it.link).hostname.replace('www.', ''); } catch (_) {}
  body.innerHTML = `<button class="d-close" id="dClose" aria-label="关闭"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
   <div class="d-head"><div class="bg" ${it.poster ? `style="background-image:url('${esc(it.poster)}')"` : ''}></div>${poster(it, {eager: true, noSoon: true})}
    <div class="tx"><div class="tz">${esc(it.title_zh || it.title_en)}</div><div class="te">${esc(it.title_zh ? it.title_en : '暂无通用中文名')}</div>
     <div class="d-meta"><span class="pill" style="background:${p.color};color:${light(p.color) ? '#111' : '#fff'}">${esc(p.name)}</span>${it.kind ? `<span class="pill">${esc(it.kind)}</span>` : ''}${status}
     ${grp ? `<span class="pill">${esc(grp.name)}</span>` : ''}${it.region ? `<span class="pill rg">${esc(it.region)}</span>` : ''}</div>
     <div class="d-meta"><span class="pill">📅 ${esc(it.date_label || it.date)}</span>${it.top ? `<span class="pill" style="color:var(--acc)">TOP ${it.top}</span>` : ''}</div></div></div>
   <div class="d-sec"><h3>评分</h3><div class="d-rt">${ratings(it, true)}</div>
    ${it.awards && it.awards.length ? `<h3>获奖</h3><div class="d-aw">${it.awards.map(a => `<span class="aw">🏆 ${esc(a)}</span>`).join('')}</div>` : ''}
    <h3>简介</h3><p class="d-bl">${esc(it.blurb || '')}</p>
    ${it.tags && it.tags.length ? `<h3>标签</h3><div class="d-tags">${it.tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}</div>
   ${it.link ? `<a class="d-btn" href="${esc(it.link)}" target="_blank" rel="noopener">打开详情页 ↗</a><div class="d-src">${esc(host)}${r && r.url && r.url !== it.link ? ` · <a href="${esc(r.url)}" target="_blank" rel="noopener" style="color:#6fb3ff">烂番茄</a>` : ''}</div>` : ''}
   <div class="d-src" style="margin-top:14px">来自「${esc(lst.title || '')}${lst.range_label ? ' ' + esc(lst.range_label) : ''}」</div>`;
  body.scrollTop = 0;
  sheet.style.transform = '';
  requestAnimationFrame(() => { sheet.classList.add('on'); scrim.classList.add('on'); });
  if (!history.state || !history.state.sheet) history.pushState({sheet: 1}, '', location.hash);
  $('#dClose').onclick = () => closeSheet();
}
function closeSheet(fromPop) {
  if (!sheet.classList.contains('on')) return;
  sheet.classList.remove('on'); scrim.classList.remove('on'); sheet.style.transform = '';
  if (!fromPop && history.state && history.state.sheet) history.back();
}
scrim.addEventListener('click', () => closeSheet());
window.addEventListener('popstate', () => { closeSheet(true); closeSearch(true); });
(() => {   // drag down from the grab bar / header, or from the body when it is scrolled to the top
  let y0 = null, dy = 0, t0 = 0, fromBody = false;
  const start = (e, isBody) => {
    if (isBody && body.scrollTop > 0) return;
    y0 = e.touches[0].clientY; dy = 0; t0 = Date.now(); fromBody = isBody;
  };
  const move = e => {
    if (y0 == null) return;
    dy = e.touches[0].clientY - y0;
    if (fromBody && (dy < 0 || body.scrollTop > 0)) { if (dy < 0) y0 = null; return; }
    if (dy > 0) { e.preventDefault(); sheet.classList.add('drag'); sheet.style.transform = `translate3d(0,${dy}px,0)`; scrim.style.opacity = Math.max(0, 1 - dy / 500); }
  };
  const end = () => {
    if (y0 == null) return;
    sheet.classList.remove('drag'); scrim.style.opacity = '';
    const v = dy / Math.max(1, Date.now() - t0);
    if (dy > 120 || v > 0.6) closeSheet(); else sheet.style.transform = '';
    y0 = null;
  };
  $('#grab').addEventListener('touchstart', e => start(e, false), {passive: true});
  body.addEventListener('touchstart', e => start(e, true), {passive: true});
  sheet.addEventListener('touchmove', move, {passive: false});
  sheet.addEventListener('touchend', end); sheet.addEventListener('touchcancel', end);
})();

/* ---------- search ---------- */
const sBox = $('#search'), q = $('#q'), sRes = $('#sRes');
function allItems() {
  const out = [], seen = new Set();
  for (const [lk, l] of Object.entries(D.lists)) for (const it of l.items) {
    const k = (it.title_en || '') + '|' + it.platform; if (seen.has(k)) continue; seen.add(k); out.push([lk, it]);
  }
  return out;
}
function doSearch() {
  const s = q.value.trim().toLowerCase();
  if (!s) { sRes.innerHTML = `<div class="s-hint">在本周更新、年度片单和 Apple TV 精选里搜索，共 ${allItems().length} 部</div>`; return; }
  const hits = allItems().filter(([, it]) => [it.title_zh, it.title_en, it.blurb, (it.tags || []).join(' '), (it.awards || []).join(' '), P[it.platform]?.name, it.kind]
    .join(' ').toLowerCase().includes(s)).slice(0, 60);
  sRes.innerHTML = hits.length ? hits.map(([lk, it]) => `<button class="s-it" data-k="${reg(lk, it)}">${poster(it, {noTag: true, noSoon: true})}
    <div><div class="tz">${esc(it.title_zh || it.title_en)}</div><div class="te">${esc(it.title_zh ? it.title_en : '')}</div>
    <div class="mm">${esc([P[it.platform]?.name, it.kind, it.date_label, D.lists[lk].title].filter(Boolean).join(' · '))}</div><div class="mm">${score(it) >= 0 ? '🍅 ' + score(it) + '%' : '暂无评分'}</div></div></button>`).join('')
    : `<div class="s-hint">没有找到「${esc(q.value)}」</div>`;
}
function openSearch() { sBox.classList.add('on'); sBox.setAttribute('aria-hidden', 'false'); doSearch(); setTimeout(() => q.focus(), 60); history.pushState({search: 1}, '', location.hash); }
function closeSearch(fromPop) { if (!sBox.classList.contains('on')) return; sBox.classList.remove('on'); sBox.setAttribute('aria-hidden', 'true'); q.blur(); if (!fromPop && history.state && history.state.search) history.back(); }
$('#btnSearch').addEventListener('click', openSearch);
$('#sClose').addEventListener('click', () => closeSearch());
q.addEventListener('input', doSearch);
sRes.addEventListener('click', e => { const k = e.target.closest('[data-k]'); if (k) openSheet(REG.get(k.dataset.k)); });

/* ---------- iOS Safari: one-time add-to-home-screen hint ---------- */
(() => {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  let seen = false; try { seen = localStorage.getItem('a2hs-seen') === '1'; } catch (_) {}
  if (ios && !standalone && !seen) setTimeout(() => $('#a2hs').classList.add('on'), 900);
  $('#a2hsX').addEventListener('click', () => { $('#a2hs').classList.remove('on'); try { localStorage.setItem('a2hs-seen', '1'); } catch (_) {} });
})();

/* ---------- boot ---------- */
fetch('data.json', {cache: 'no-cache'}).then(r => r.json()).then(d => {
  D = d; P = d.platforms;
  deriveStatus();
  initSeen();
  Object.keys(VIEWS).forEach(render);
  setTab((location.hash || '#weekly').slice(1), false);
}).catch(() => { $('#v-weekly').innerHTML = '<div class="empty">数据加载失败，请检查网络后重试</div>'; setTab('weekly', false); });
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  // when an updated service worker takes over an already-controlled page, reload once so new HTML/CSS show immediately
  const hadCtl = !!navigator.serviceWorker.controller; let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadCtl && !reloaded) { reloaded = true; location.reload(); } });
  navigator.serviceWorker.register('sw.js', {updateViaCache: 'none'}).then(r => r.update()).catch(() => {});
}
})();
