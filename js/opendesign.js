/* === NextSignal OpenDesign — OpenDesign 专题追踪模块 === */

async function renderOpenDesign() {
  if (!state.opendesignData) {
    state.opendesignData = await loadJSON('opendesign.json');
  }

  if (!state.opendesignData) {
    document.getElementById('od-overview').innerHTML = '<div class="loading">正在加载 OpenDesign 数据…</div>';
    return;
  }

  const d = state.opendesignData;
  const repo = d.repo || {};
  const prs = d.recent_prs || [];
  const issues = d.recent_issues || [];
  const trends = d.trends || {};

  // Overview card
  document.getElementById('od-overview').innerHTML = `
    <div class="card-head">
      <div>
        <div class="kicker">仓库概览 · nexu-io/open-design</div>
        <h3>OpenDesign v${repo.latest_release ? repo.latest_release.version : '—'}</h3>
      </div>
      <button class="button primary" onclick="refreshOpenDesign()">刷新数据</button>
    </div>
    <div class="stat-card">
      <div class="stat-card-item">
        <div class="stat-card-value">${formatNumber(repo.stars)}</div>
        <div class="stat-card-label">Stars</div>
        <div class="stat-card-meta">+${formatNumber(repo.forks)} Forks</div>
      </div>
      <div class="stat-card-item">
        <div class="stat-card-value">${repo.open_prs || '—'}</div>
        <div class="stat-card-label">Open PRs</div>
        <div class="stat-card-meta">${prs.filter(p => p.state === 'merged').length} 近期合并</div>
      </div>
      <div class="stat-card-item">
        <div class="stat-card-value">${repo.open_issues || '—'}</div>
        <div class="stat-card-label">Open Issues</div>
        <div class="stat-card-meta">最新版本: ${repo.latest_release ? repo.latest_release.date : '—'}</div>
      </div>
    </div>
    <p class="card-desc" style="margin-top:0">${trends.direction || '正在追踪 OpenDesign 项目动态…'}</p>
    <div class="meta-line">
      <a href="https://github.com/nexu-io/open-design" target="_blank" rel="noopener">GitHub 仓库 →</a>
      <a href="https://open-design.ai" target="_blank" rel="noopener">官方网站 →</a>
    </div>
  `;

  // PR timeline
  document.getElementById('od-prs').innerHTML = prs.length > 0 ? prs.map(pr => `
    <div class="timeline-item">
      <span class="time">PR #${pr.number}</span>
      <div>
        <div class="signal-title"><a href="${pr.url || '#'}" target="_blank" rel="noopener">${pr.title || ''}</a></div>
        <p class="signal-desc">${pr.impact || ''}</p>
        <div class="tag-row">
          <span class="tag ${pr.state === 'merged' ? 'success' : pr.state === 'open' ? 'accent' : 'warn'}">${pr.state || '—'}</span>
          ${(pr.labels || []).map(l => `<span class="tag">${l}</span>`).join('')}
          ${pr.author ? `<span class="tag">by ${pr.author}</span>` : ''}
        </div>
      </div>
    </div>
  `).join('') : '<div class="timeline-item"><span class="time">—</span><div><p class="signal-desc">暂无 PR 数据，等待更新…</p></div></div>';

  // Issue timeline
  document.getElementById('od-issues').innerHTML = issues.length > 0 ? issues.map(issue => `
    <div class="timeline-item">
      <span class="time">Issue #${issue.number}</span>
      <div>
        <div class="signal-title"><a href="${issue.url || '#'}" target="_blank" rel="noopener">${issue.title || ''}</a></div>
        <p class="signal-desc">${issue.summary || ''}</p>
        <div class="tag-row">
          ${(issue.labels || []).map(l => `<span class="tag">${l}</span>`).join('')}
          ${issue.author ? `<span class="tag">by ${issue.author}</span>` : ''}
          ${issue.comments ? `<span class="tag">${issue.comments} comments</span>` : ''}
        </div>
      </div>
    </div>
  `).join('') : '<div class="timeline-item"><span class="time">—</span><div><p class="signal-desc">暂无 Issue 数据，等待更新…</p></div></div>';

  // Sidebar trends
  document.getElementById('od-trends').innerHTML = `
    <div class="kicker">趋势摘要</div>
    <p class="card-desc">${trends.direction || '—'}</p>
    <div style="margin-top:12px">
      <div class="kicker" style="margin-top:12px">影响模块</div>
      <div class="tag-row">${(trends.affected_modules || []).map(m => `<span class="tag accent">${m}</span>`).join('') || '<span class="tag">—</span>'}</div>
    </div>
    <div style="margin-top:12px">
      <div class="kicker">风险</div>
      <div class="tag-row">${(trends.risks || []).map(r => `<span class="tag warn">${r}</span>`).join('') || '<span class="tag">无</span>'}</div>
    </div>
    <div style="margin-top:12px">
      <div class="kicker">可行动建议</div>
      <div class="tag-row">${(trends.actions || []).map(a => `<span class="tag">${a}</span>`).join('') || '<span class="tag">—</span>'}</div>
    </div>
    <div style="margin-top:12px">
      <div class="kicker">下周观察</div>
      <p class="card-desc">${trends.next_week || '—'}</p>
    </div>
  `;

  updateHomeODSummary(d);
}

async function refreshOpenDesign() {
  const btn = document.querySelector('#od-overview .button');
  if (btn) { btn.textContent = '刷新中…'; btn.disabled = true; }
  state.opendesignData = await loadJSON('opendesign.json');
  renderOpenDesign();
  if (btn) { btn.textContent = '刷新数据'; btn.disabled = false; }
  showToast('OpenDesign 数据已刷新');
}

function formatNumber(n) {
  if (!n) return '—';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}
