(function () {
const state = { data: null, activeTrack: 'All', query: '', expanded: new Set() };

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
function slugClass(track) { return String(track).toLowerCase().replace(/\s+/g, '-'); }

const TRACK_ZH = { 'VLA': 'VLA', 'World Model': '世界模型', 'WAM': 'WAM', 'VLN': 'VLN' };
const trackLabel = (t) => TRACK_ZH[t] || t;

const TREND_ZH = { accelerating: '加速中', emerging: '萌芽', mainstreaming: '主流化', cooling: '降温', uncertain: '不确定', 'medium-high': '中高', high: '高', medium: '中', low: '低' };
const statusZh = (v) => TREND_ZH[v] || v;

function statusClass(value = '') {
  const v = String(value).toLowerCase();
  if (v.includes('已发布') || v.includes('released') || v.includes('支持')) return 'status-good';
  if (v.includes('部分') || v.includes('partial') || v.includes('作者自报') || v.includes('已报告') || v.includes('计划') || v.includes('看') || v.includes('研究') || v.includes('混合')) return 'status-warn';
  if (v.includes('未发布') || v.includes('not')) return 'status-bad';
  return 'status-neutral';
}

/* Parse "2026-06-15" / "2026-06" / "2024-06 → 2025-03" / "2026" into sortable number + display label. */
function parseDate(raw) {
  const s = String(raw || '').trim();
  const matches = [...s.matchAll(/(\d{4})(?:[-/.](\d{1,2}))?(?:[-/.](\d{1,2}))?/g)];
  if (!matches.length) return { sort: 0, label: s || '—', estimated: true };
  const last = matches[matches.length - 1];
  const y = +last[1], m = last[2] ? +last[2] : 0, d = last[3] ? +last[3] : 0;
  const sort = y * 10000 + m * 100 + d;
  let label = `${y}`;
  if (m) label += `-${String(m).padStart(2, '0')}`;
  if (d) label += `-${String(d).padStart(2, '0')}`;
  const estimated = s.includes('估') || s.toLowerCase().includes('est');
  return { sort, label, estimated };
}

function renderMeta() {
  const { meta, works } = state.data;
  const tracks = meta.tracks.map(trackLabel).join(' · ');
  $('#hero-meta').innerHTML = [
    `📅 更新于 ${meta.updated}`,
    `🎯 ${meta.coverage}`,
    `📌 收录 ${works.length} 项工作`,
    `🧭 ${tracks}`
  ].map(x => `<span class="meta-chip">${escapeHtml(x)}</span>`).join('');
}

const BRIEF_ACCENTS = ['vla', 'wm', 'wam', 'vln', 'amber', 'green', 'red'];

function renderBriefs() {
  const el = $('#brief-count');
  if (el) el.textContent = state.data.briefs.length;
  $('#brief-grid').innerHTML = state.data.briefs.map((b, i) => {
    const accent = BRIEF_ACCENTS[i % BRIEF_ACCENTS.length];
    const since = b.since ? `<span class="brief-since" title="该结论最近核对日期">核对 ${escapeHtml(b.since)}</span>` : '';
    return `
    <article class="brief-card" style="--accent: var(--${accent}); --accent-soft: var(--${accent}-soft)">
      <div class="brief-top">
        <span class="brief-idx">${String(i + 1).padStart(2, '0')}</span>
        <span class="brief-icon">${escapeHtml(b.icon)}</span>
        ${since}
      </div>
      <h3 class="brief-claim">${escapeHtml(b.title)}</h3>
      <p class="brief-evidence">${escapeHtml(b.body)}</p>
      <div class="brief-action"><span class="brief-arrow">→</span>${escapeHtml(b.take)}</div>
    </article>`;
  }).join('');
}

function workMatches(w) {
  const trackOk = state.activeTrack === 'All' || (w.track || []).includes(state.activeTrack);
  const text = [w.title, w.date, w.domain, w.status, w.oneLiner, w.method, w.ctoTake, w.evidenceLevel, ...(w.track || []), ...(w.innovation || [])].join(' ').toLowerCase();
  const queryOk = !state.query || text.includes(state.query.toLowerCase());
  return trackOk && queryOk;
}

function sortedWorks() {
  return state.data.works
    .map(w => ({ w, d: parseDate(w.date) }))
    .sort((a, b) => b.d.sort - a.d.sort);
}

function renderRadar() {
  const all = sortedWorks();
  const visible = all.filter(({ w }) => workMatches(w));
  $('#total-count').textContent = state.data.works.length;
  $('#visible-count').textContent = visible.length;

  if (!visible.length) {
    $('#radar-rows').innerHTML = `<div class="empty-row">没有匹配结果，换个关键词或切回「全部」。</div>`;
    return;
  }

  $('#radar-rows').innerHTML = visible.map(({ w, d }) => {
    const open = state.expanded.has(w.id);
    const tracks = (w.track || []).map(t => `<span class="tag ${slugClass(t)}">${escapeHtml(trackLabel(t))}</span>`).join('');
    const code = w.projectStatus && w.projectStatus.code;
    const statusPill = `<span class="status-pill ${statusClass(code)}">${escapeHtml(code || '—')}</span>`;
    return `
      <div class="radar-row" role="row" data-id="${escapeHtml(w.id)}" tabindex="0" aria-expanded="${open}">
        <span class="radar-date">${escapeHtml(d.label)}${d.estimated ? ' <span class="est">估</span>' : ''}</span>
        <span class="radar-title"><span class="chev">▶</span>${escapeHtml(w.title)}</span>
        <span class="radar-track-cell">${tracks}</span>
        <span class="radar-oneliner">${escapeHtml(w.oneLiner)}</span>
        <span class="radar-status-cell">${statusPill}</span>
      </div>
      <div class="radar-detail">
        <div class="radar-detail-inner">
          <div class="detail-block">
            <div class="label">创新点</div>
            <ul class="innovation-list">${(w.innovation || []).map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul>
          </div>
          <div class="detail-block">
            <div class="label">方法思路</div>
            <p class="method-copy">${escapeHtml(w.method)}</p>
          </div>
          <div class="cto-take"><strong>CTO 判断：</strong>${escapeHtml(w.ctoTake)}</div>
          <div class="detail-block">
            <div class="label">证据等级 · ${escapeHtml(w.domain)}</div>
            <p class="method-copy">${escapeHtml(w.evidenceLevel)}</p>
          </div>
          <div class="detail-links">
            ${(w.links || []).map((l, i) => `<a href="${escapeHtml(l)}" target="_blank" rel="noreferrer">来源 ${i + 1} ↗</a>`).join('')}
          </div>
        </div>
      </div>`;
  }).join('');

  $$('.radar-row').forEach(row => {
    const toggle = () => {
      const id = row.dataset.id;
      if (state.expanded.has(id)) state.expanded.delete(id); else state.expanded.add(id);
      renderRadar();
    };
    row.addEventListener('click', toggle);
    row.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  });
}

function renderMethods() {
  $('#method-grid').innerHTML = state.data.methods.map(m => `
    <article class="method-card" data-track="${escapeHtml(m.track)}">
      <p class="section-kicker">${escapeHtml(trackLabel(m.track))}</p>
      <h3>${escapeHtml(m.name)}</h3>
      <p>${escapeHtml(m.definition)}</p>
      <div class="cto-take"><strong>为何重要：</strong>${escapeHtml(m.why)}</div>
      <div class="examples">代表工作：${escapeHtml(m.examples.join(' · '))}</div>
    </article>`).join('');
}

function renderTracker() {
  $('#tracker-body').innerHTML = sortedWorks().map(({ w }) => {
    const ps = w.projectStatus || {};
    const pill = (v) => `<span class="status-pill ${statusClass(v)}">${escapeHtml(v || '未知')}</span>`;
    return `<tr>
      <td><span class="work-name">${escapeHtml(w.title)}</span><br><span>${escapeHtml(w.domain)}</span></td>
      <td>${(w.track || []).map(t => `<span class="tag ${slugClass(t)}">${escapeHtml(trackLabel(t))}</span>`).join(' ')}</td>
      <td>${pill(ps.paper)}</td><td>${pill(ps.code)}</td><td>${pill(ps.weights)}</td>
      <td>${pill(ps.dataset)}</td><td>${pill(ps.benchmark)}</td><td>${escapeHtml(w.evidenceLevel)}</td>
    </tr>`;
  }).join('');
}

function renderTrends() {
  $('#trend-grid').innerHTML = state.data.trends.map(t => `
    <article class="trend-card">
      <div class="trend-meta">
        <span class="status-pill ${t.status === 'uncertain' ? 'status-warn' : 'status-good'}">${escapeHtml(statusZh(t.status))}</span>
        <span class="status-pill status-neutral">可信度：${escapeHtml(statusZh(t.confidence))}</span>
      </div>
      <h3>${escapeHtml(t.title)}</h3>
      <p>${escapeHtml(t.summary)}</p>
      <div class="evidence-line"><strong>证据：</strong>${escapeHtml(t.evidence.join(' · '))}</div>
      <div class="risk-box"><strong>风险：</strong>${escapeHtml(t.risk)}</div>
    </article>`).join('');
}

function renderMatrix() {
  $('#matrix-body').innerHTML = state.data.comparison.map(r => `
    <tr><td><span class="work-name">${escapeHtml(r.track)}</span></td>
      <td>${escapeHtml(r.input)}</td><td>${escapeHtml(r.predicts)}</td>
      <td>${escapeHtml(r.strength)}</td><td>${escapeHtml(r.weakness)}</td>
      <td>${escapeHtml(r.bestUse)}</td><td>${escapeHtml(r.examples)}</td></tr>`).join('');
}

function renderSources() {
  $('#source-grid').innerHTML = state.data.sources.map(u => `<a class="source-card" href="${escapeHtml(u)}" target="_blank" rel="noreferrer">${escapeHtml(u)}</a>`).join('');
}

function bindControls() {
  $('#search-input').addEventListener('input', (e) => { state.query = e.target.value.trim(); renderRadar(); });
  $$('.filter-chip').forEach(btn => btn.addEventListener('click', () => {
    state.activeTrack = btn.dataset.track;
    $$('.filter-chip').forEach(b => b.classList.toggle('active', b === btn));
    renderRadar();
  }));
}

function renderAll() {
  renderMeta(); renderBriefs(); renderRadar(); renderMethods();
  renderTracker(); renderTrends(); renderMatrix(); renderSources(); bindControls();
}

function boot() {
  try { state.data = window.__RADAR_DATA__; renderAll(); }
  catch (error) {
    console.error(error);
    document.body.insertAdjacentHTML('afterbegin', '<div style="padding:16px;background:#be123c;color:white">渲染失败：' + escapeHtml(error.message) + '</div>');
  }
}
boot();
})();
