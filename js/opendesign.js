/* === NextSignal OpenDesign — 实时数据 + 中文摘要模块 === */
/* 策略：前端直连 GitHub 公开 API 获取实时元数据 + opendesign.json 提供中文摘要缓存 */

const GITHUB_REPO = 'nexu-io/open-design';
const API_BASE = `https://api.github.com/repos/${GITHUB_REPO}`;
const STATIC_FALLBACK = 'data/opendesign.json';
const AUTO_REFRESH_MS = 5 * 60 * 1000;
let odRefreshTimer = null;

let odLiveData = null;
let odStaticData = null;

async function renderOpenDesign() {
  const overviewEl = document.getElementById('od-overview');
  overviewEl.innerHTML = '<div class="loading">正在连接 GitHub API 获取实时数据…</div>';

  try {
    odLiveData = await fetchLiveData();
    odStaticData = state.opendesignData || await loadJSON(STATIC_FALLBACK);
    renderFromLive(odLiveData, odStaticData);
    startAutoRefresh();
    updateHomeODSummary(odLiveData);
  } catch (err) {
    console.warn('GitHub API 不可用，降级到静态缓存:', err.message);
    try {
      odStaticData = state.opendesignData || await loadJSON(STATIC_FALLBACK);
      if (odStaticData) {
        renderFromStatic(odStaticData);
        updateHomeODSummary(odStaticData);
      } else {
        overviewEl.innerHTML = '<div class="error-state"><p>⚠️ 无法获取 OpenDesign 数据</p><button onclick="renderOpenDesign()">重试</button></div>';
      }
    } catch {
      overviewEl.innerHTML = '<div class="error-state"><p>⚠️ 数据加载失败，请检查网络后重试</p><button onclick="renderOpenDesign()">重试</button></div>';
    }
  }
}

/* ---- 实时 API 数据获取 ---- */
async function fetchLiveData() {
  const [repo, release, pulls, issues] = await Promise.all([
    fetch(`${API_BASE}`, {headers: {Accept: 'application/vnd.github.v3+json'}}).then(r => r.ok ? r.json() : null),
    fetch(`${API_BASE}/releases/latest`, {headers: {Accept: 'application/vnd.github.v3+json'}}).then(r => r.ok ? r.json() : null),
    fetch(`${API_BASE}/pulls?state=all&sort=updated&per_page=8`, {headers: {Accept: 'application/vnd.github.v3+json'}}).then(r => r.ok ? r.json() : []),
    fetch(`${API_BASE}/issues?state=open&sort=updated&per_page=10`, {headers: {Accept: 'application/vnd.github.v3+json'}}).then(r => r.ok ? r.json() : [])
  ]);

  if (!repo) throw new Error('Repo API failed');

  const recent_prs = (pulls || []).slice(0, 5).map(pr => ({
    number: pr.number,
    title: pr.title || '',
    state: pr.merged_at ? 'merged' : (pr.state === 'closed' ? 'closed' : 'open'),
    author: pr.user ? pr.user.login : '',
    labels: (pr.labels || []).map(l => l.name),
    url: pr.html_url || `https://github.com/${GITHUB_REPO}/pull/${pr.number}`
  }));

  const recent_issues = (issues || []).slice(0, 7).map(iss => ({
    number: iss.number,
    title: iss.title || '',
    author: iss.user ? iss.user.login : '',
    labels: (iss.labels || []).map(l => l.name),
    comments: iss.comments || 0,
    url: iss.html_url || `https://github.com/${GITHUB_REPO}/issues/${iss.number}`
  }));

  return {
    repo: {
      name: GITHUB_REPO,
      stars: repo.stargazers_count || 0,
      forks: repo.forks_count || 0,
      open_issues: repo.open_issues_count || 0,
      updated: repo.updated_at || '',
      latest_release: release ? {
        version: release.tag_name || '',
        date: (release.published_at || '').substring(0, 10),
        title: release.name || ''
      } : null
    },
    recent_prs,
    recent_issues,
    _fetched_at: new Date().toISOString()
  };
}

/* ---- 实时数据渲染（含中文缓存配对） ---- */
function renderFromLive(d, zhCache) {
  const repo = d.repo || {};
  const prs = d.recent_prs || [];
  const issues = d.recent_issues || [];
  const prMap = zhCache?.pr_map || {};
  const issueMap = zhCache?.issue_map || {};

  // Overview
  document.getElementById('od-overview').innerHTML = `
    <div class="card-head">
      <div>
        <div class="kicker">仓库概览 · nexu-io/open-design <span class="tag success" style="margin-left:8px">🔴 实时</span></div>
        <h3>${repo.latest_release ? repo.latest_release.version : '—'}</h3>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <span class="tag" style="font-size:11px">${new Date(d._fetched_at).toLocaleTimeString('zh-CN')}</span>
        <button class="button primary" onclick="renderOpenDesign()">🔄 刷新</button>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-card-item">
        <div class="stat-card-value">${formatNumber(repo.stars)}</div>
        <div class="stat-card-label">Stars</div>
        <div class="stat-card-meta">+${formatNumber(repo.forks)} Forks</div>
      </div>
      <div class="stat-card-item">
        <div class="stat-card-value">${prs.length}</div>
        <div class="stat-card-label">近期 PR</div>
        <div class="stat-card-meta">${prs.filter(p => p.state === 'merged').length} 已合并</div>
      </div>
      <div class="stat-card-item">
        <div class="stat-card-value">${repo.open_issues}</div>
        <div class="stat-card-label">Open Issues</div>
        <div class="stat-card-meta">最新: ${repo.latest_release ? repo.latest_release.date : '—'}</div>
      </div>
    </div>
    ${zhCache?.overview_summary ? `<div class="od-summary"><h4>📊 仓库动态总结</h4><p>${zhCache.overview_summary}</p></div>` : ''}
    <div class="meta-line">
      <a href="https://github.com/nexu-io/open-design" target="_blank" rel="noopener">GitHub 仓库 ↗</a>
      <a href="https://open-design.ai" target="_blank" rel="noopener">官方网站 ↗</a>
      <span style="color:var(--fg-dim)">来源：GitHub 公开 API（实时）</span>
    </div>
  `;

  // PR timeline (中文优先)
  document.getElementById('od-prs').innerHTML = prs.length > 0 ? prs.map(pr => {
    const zh = prMap[pr.number] || (zhCache?.recent_prs || []).find(p => p.number === pr.number)?.impact || null;
    return `
    <div class="timeline-item">
      <span class="time">PR #${pr.number}</span>
      <div>
        <div class="signal-title">
          ${zh ? `<span class="zh-title">${escapeHtml(zh)}</span>` : `<span class="zh-title-fallback">${escapeHtml(pr.title)}</span>`}
          <a href="${pr.url}" target="_blank" rel="noopener" class="en-original">[原文]</a>
        </div>
        <div class="tag-row">
          <span class="tag ${pr.state === 'merged' ? 'success' : pr.state === 'open' ? 'accent' : ''}">${pr.state}</span>
          ${(pr.labels || []).slice(0, 3).map(l => `<span class="tag">${l}</span>`).join('')}
          ${pr.author ? `<span class="tag">by ${pr.author}</span>` : ''}
        </div>
      </div>
    </div>`;
  }).join('') : '<div class="timeline-item"><span class="time">—</span><div><p class="signal-desc">暂无 PR 数据</p></div></div>';

  // Issue timeline (中文优先)
  document.getElementById('od-issues').innerHTML = issues.length > 0 ? issues.map(iss => {
    const zh = issueMap[iss.number] || (zhCache?.recent_issues || []).find(i => i.number === iss.number)?.summary || null;
    return `
    <div class="timeline-item">
      <span class="time">#${iss.number}</span>
      <div>
        <div class="signal-title">
          ${zh ? `<span class="zh-title">${escapeHtml(zh)}</span>` : `<span class="zh-title-fallback">${escapeHtml(iss.title)}</span>`}
          <a href="${iss.url}" target="_blank" rel="noopener" class="en-original">[原文]</a>
        </div>
        <div class="tag-row">
          ${(iss.labels || []).slice(0, 3).map(l => `<span class="tag ${l.includes('bug')?'danger':l.includes('feature')||l.includes('enhancement')?'accent':''}">${l}</span>`).join('')}
          ${iss.author ? `<span class="tag">by ${iss.author}</span>` : ''}
          ${iss.comments > 0 ? `<span class="tag">💬 ${iss.comments}</span>` : ''}
        </div>
      </div>
    </div>`;
  }).join('') : '<div class="timeline-item"><span class="time">—</span><div><p class="signal-desc">暂无 Issue 数据</p></div></div>';

  // Sidebar: trends
  if (zhCache?.trends) {
    renderTrends(zhCache.trends);
  } else {
    document.getElementById('od-trends').innerHTML = '<div class="card"><div class="kicker">趋势分析</div><p class="card-desc">等待 AI 分析更新…</p></div>';
  }

  // Sidebar: zh-cards for PRs
  renderZhCards('odPrCards', prs, prMap, 'PR', true);
  renderZhCards('odIssueCards', issues, issueMap, 'Issue', false);
}

/* ---- 静态降级渲染 ---- */
function renderFromStatic(d) {
  const repo = d.repo || {};
  const prs = d.recent_prs || [];
  const issues = d.recent_issues || [];
  const prMap = d.pr_map || {};
  const issueMap = d.issue_map || {};
  const trends = d.trends || {};

  document.getElementById('od-overview').innerHTML = `
    <div class="card-head">
      <div>
        <div class="kicker">仓库概览 · nexu-io/open-design <span class="tag warn" style="margin-left:8px">📦 缓存</span></div>
        <h3>${repo.latest_release ? repo.latest_release.version : '—'}</h3>
      </div>
      <button class="button primary" onclick="renderOpenDesign()">🔄 刷新</button>
    </div>
    <div class="stat-card">
      <div class="stat-card-item">
        <div class="stat-card-value">${formatNumber(repo.stars)}</div>
        <div class="stat-card-label">Stars</div>
      </div>
      <div class="stat-card-item">
        <div class="stat-card-value">${prs.length}</div>
        <div class="stat-card-label">近期 PR</div>
      </div>
      <div class="stat-card-item">
        <div class="stat-card-value">${repo.open_issues}</div>
        <div class="stat-card-label">Open Issues</div>
      </div>
    </div>
    ${d.overview_summary ? `<div class="od-summary"><h4>📊 仓库动态总结</h4><p>${d.overview_summary}</p></div>` : ''}
    <div class="meta-line"><span style="color:var(--warn)">⚠️ 使用缓存数据，点击刷新获取实时数据</span></div>
  `;

  document.getElementById('od-prs').innerHTML = prs.length > 0 ? prs.map(pr => {
    const zh = pr.impact || prMap[pr.number] || '';
    return `
    <div class="timeline-item">
      <span class="time">PR #${pr.number}</span>
      <div>
        <div class="signal-title">${zh ? `<span class="zh-title">${escapeHtml(zh)}</span>` : pr.title}
        <a href="${pr.url}" target="_blank" class="en-original">[原文]</a></div>
        <div class="tag-row">
          <span class="tag ${pr.state === 'merged' ? 'success' : 'accent'}">${pr.state}</span>
          ${(pr.labels || []).slice(0, 3).map(l => `<span class="tag">${l}</span>`).join('')}
        </div>
      </div>
    </div>`;
  }).join('') : '';

  document.getElementById('od-issues').innerHTML = issues.length > 0 ? issues.map(iss => {
    const zh = iss.summary || issueMap[iss.number] || '';
    return `
    <div class="timeline-item">
      <span class="time">#${iss.number}</span>
      <div>
        <div class="signal-title">${zh ? `<span class="zh-title">${escapeHtml(zh)}</span>` : iss.title}
        <a href="${iss.url}" target="_blank" class="en-original">[原文]</a></div>
        <div class="tag-row">${(iss.labels || []).slice(0, 3).map(l => `<span class="tag">${l}</span>`).join('')}${iss.comments > 0 ? `<span class="tag">💬 ${iss.comments}</span>` : ''}</div>
      </div>
    </div>`;
  }).join('') : '';

  renderTrends(trends);
  renderZhCards('odPrCards', prs, prMap, 'PR', true);
  renderZhCards('odIssueCards', issues, issueMap, 'Issue', false);
}

/* ---- 中文摘要卡片（侧栏） ---- */
function renderZhCards(containerId, items, map, prefix, isPR) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const mapped = items.map(item => {
    const zh = map[item.number];
    return { number: item.number, zh: zh || null, labels: (item.labels || []).slice(0, 3), comments: item.comments, url: item.url };
  });
  el.innerHTML = mapped.length > 0 ? mapped.map(m => `
    <div class="zh-card ${m.zh ? '' : 'zh-card-pending'}">
      <a href="${m.url}" target="_blank" rel="noopener">
        <span class="zh-card-num">${prefix} #${m.number}</span>
        <span class="zh-card-text">${m.zh ? escapeHtml(m.zh) : '查看详情 →'}</span>
      </a>
      <div class="tag-row">${m.labels.map(l => `<span class="tag">${l}</span>`).join('')}${m.comments > 0 ? `<span class="tag">💬 ${m.comments}</span>` : ''}</div>
    </div>
  `).join('') : '<div class="zh-card"><span class="zh-card-text" style="color:var(--fg-dim)">暂无数据</span></div>';
}

/* ---- 趋势面板 ---- */
function renderTrends(trends) {
  const t = trends || {};
  document.getElementById('od-trends').innerHTML = `
    <div class="kicker">趋势分析</div>
    <p class="card-desc">${t.direction || '等待 AI 分析更新…'}</p>
    ${(t.affected_modules || []).length ? `<div style="margin-top:12px"><div class="kicker">影响模块</div><div class="tag-row">${t.affected_modules.map(m => `<span class="tag accent">${m}</span>`).join('')}</div></div>` : ''}
    ${(t.risks || []).length ? `<div style="margin-top:12px"><div class="kicker">风险</div><div class="tag-row">${t.risks.map(r => `<span class="tag warn">${r}</span>`).join('')}</div></div>` : ''}
    ${(t.actions || []).length ? `<div style="margin-top:12px"><div class="kicker">建议</div><div class="tag-row">${t.actions.map(a => `<span class="tag">${a}</span>`).join('')}</div></div>` : ''}
    ${t.next_week ? `<div style="margin-top:12px"><div class="kicker">下周观察</div><p class="card-desc">${t.next_week}</p></div>` : ''}
  `;
}

/* ---- 自动刷新 ---- */
function startAutoRefresh() {
  if (odRefreshTimer) clearInterval(odRefreshTimer);
  odRefreshTimer = setInterval(async () => {
    if (state.currentScreen !== 'opendesign') return;
    try {
      odLiveData = await fetchLiveData();
      odStaticData = state.opendesignData || await loadJSON(STATIC_FALLBACK);
      renderFromLive(odLiveData, odStaticData);
    } catch {}
  }, AUTO_REFRESH_MS);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (odRefreshTimer) clearInterval(odRefreshTimer);
  } else if (state.currentScreen === 'opendesign') {
    startAutoRefresh();
  }
});

function formatNumber(n) {
  if (!n && n !== 0) return '—';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
