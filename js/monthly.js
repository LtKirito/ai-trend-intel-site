/* === NextSignal Monthly — AI 月报模块 === */

async function renderMonthly() {
  if (!state.monthlyIndex || state.monthlyIndex.length === 0) {
    const grid = document.getElementById('monthlyPeriodGrid');
    if (grid) grid.innerHTML = '<div class="loading">暂无月报数据，等待生成…</div>';
    return;
  }

  renderMonthPeriods();
  selectMonth(state.currentMonth);
}

function renderMonthPeriods() {
  const grid = document.getElementById('monthlyPeriodGrid');
  if (!grid) return;

  grid.innerHTML = state.monthlyIndex.map(item => `
    <button class="period-card ${item.month === state.currentMonth ? 'active' : ''}" data-month="${item.month}">
      <strong>${item.label || item.month}</strong>
      <span>${item.count || '—'}</span>
      <span>${item.tags || ''}</span>
    </button>
  `).join('');

  grid.querySelectorAll('[data-month]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.currentMonth = btn.dataset.month;
      selectMonth(state.currentMonth);
    });
  });
}

async function selectMonth(monthStr) {
  const data = await loadJSON(`monthly-${monthStr}.json`);
  if (!data) {
    document.getElementById('monthlyTitle').textContent = monthStr + ' AI 月报';
    document.getElementById('monthlySummary').textContent = '数据加载失败，请稍后重试。';
    document.getElementById('monthlyConclusions').innerHTML = '<div class="error-state">无法加载该月月报数据</div>';
    document.getElementById('monthlyTrends').innerHTML = '';
    document.getElementById('monthlyTools').innerHTML = '';
    document.getElementById('monthlyVideos').innerHTML = '';
    document.getElementById('monthlyNoise').innerHTML = '';
    document.getElementById('monthlyTracking').innerHTML = '';
    renderMonthPeriods();
    return;
  }

  document.getElementById('monthlyTitle').textContent = data.title || (monthStr + ' AI 月报');
  document.getElementById('monthlySummary').textContent = data.summary || '';

  const coverage = data.coverage || {};
  document.getElementById('monthlyCoverage').innerHTML = `
    <div class="stat"><span class="stat-value">${coverage.daily_count || 0}</span><span class="stat-label">日报数量</span></div>
    <div class="stat"><span class="stat-value">${coverage.weekly_count || 0}</span><span class="stat-label">周报数量</span></div>
    <div class="stat"><span class="stat-value">${(data.trend_lines || []).length}</span><span class="stat-label">趋势线</span></div>
    <div class="stat"><span class="stat-value">${coverage.source_count || 0}</span><span class="stat-label">来源数量</span></div>
  `;
  document.getElementById('monthlyMissing').textContent = (coverage.missing_dates || []).length
    ? `覆盖缺口：${coverage.missing_dates.join('、')}`
    : '覆盖缺口：无';

  const conclusions = data.conclusions || [];
  document.getElementById('monthlyConclusions').innerHTML = conclusions.length
    ? `<ul class="conclusions-list">${conclusions.map((c, i) => `<li><span class="c-num">${i + 1}.</span>${c}</li>`).join('')}</ul>`
    : '<div class="loading">—</div>';

  const trends = data.trend_lines || [];
  document.getElementById('monthlyTrends').innerHTML = trends.map(item => {
    const rankClass = item.rank === 'M0' ? 'danger' : item.rank === 'M1' ? 'warn' : 'accent';
    const sources = item.sources || [];
    return `
      <article class="signal">
        <span class="rank" style="color:var(--${rankClass})">${item.rank || ''}</span>
        <div>
          <div class="signal-title">${item.title || ''}</div>
          <div class="signal-desc">${item.why || ''}</div>
          <div class="signal-why"><strong>事实依据：</strong>${(item.evidence || []).slice(0, 3).join('；')}</div>
          <div class="signal-actions">
            <div class="action-fact">${item.action_fact || ''}</div>
            <div class="action-judge">${item.action_judge || ''}</div>
          </div>
          ${item.risks ? `<div class="signal-why"><strong>风险：</strong>${item.risks}</div>` : ''}
          <div class="tag-row">${(item.tags || []).map(t => `<span class="tag">${t}</span>`).join('')}</div>
          ${sources.length ? `<div class="signal-sources">${sources.slice(0, 5).map((url, i) => `<a href="${url}" target="_blank" rel="noopener">来源${i + 1} ↗</a>`).join('')}</div>` : ''}
        </div>
      </article>`;
  }).join('');

  const tools = data.top_tools || [];
  document.getElementById('monthlyTools').innerHTML = tools.length ? tools.map(t => `
    <tr>
      <td><strong>${t.name || ''}</strong></td>
      <td><span class="tag">${t.type || ''}</span></td>
      <td>${t.monthly_change || ''}</td>
      <td>${t.audience || ''}</td>
      <td>${t.action || ''}</td>
      <td>${(t.sources || [])[0] ? `<a href="${t.sources[0]}" target="_blank">链接 ↗</a>` : '—'}</td>
    </tr>
  `).join('') : '<tr><td colspan="6" style="color:var(--fg-dim)">—</td></tr>';

  const workflows = data.agent_workflows || [];
  document.getElementById('monthlyWorkflows').innerHTML = workflows.length
    ? workflows.map(x => `<li>${x}</li>`).join('')
    : '<li style="color:var(--fg-dim)">—</li>';

  const patterns = data.opendesign_patterns || [];
  document.getElementById('monthlyDesignPatterns').innerHTML = patterns.length
    ? patterns.map(x => `<li>${x}</li>`).join('')
    : '<li style="color:var(--fg-dim)">—</li>';

  const videos = data.video_topics || [];
  document.getElementById('monthlyVideos').innerHTML = videos.length ? videos.map(v => `
    <tr>
      <td><strong>${v.title || ''}</strong></td>
      <td>${v.hook || ''}</td>
      <td>${v.angle || ''}</td>
      <td>${v.materials || ''}</td>
      <td><span class="tag ${(v.difficulty || '') === '低' ? 'success' : (v.difficulty || '') === '高' ? 'danger' : 'warn'}">${v.difficulty || ''}</span></td>
    </tr>
  `).join('') : '<tr><td colspan="5" style="color:var(--fg-dim)">—</td></tr>';

  const noise = data.noise_review || [];
  document.getElementById('monthlyNoise').innerHTML = noise.length ? noise.map(n => `
    <div class="noise-item">
      <strong>${n.item || ''}</strong>
      <div class="reason">${n.reason || ''}</div>
      <div class="desc">${n.watch_next_month ? '下月继续观察' : '不进入主线'}</div>
    </div>
  `).join('') : '<div class="loading" style="color:var(--fg-dim)">—</div>';

  const tracking = data.tracking_next_month || [];
  document.getElementById('monthlyTracking').innerHTML = tracking.length ? tracking.map(t => `
    <li><span class="name">${t.item || ''}</span><div class="desc">${t.reason || ''}<br><strong>验证方式：</strong>${t.verification || ''}</div></li>
  `).join('') : '<li style="color:var(--fg-dim)">—</li>';

  renderMonthPeriods();
  updateHomeMonthlySummary(data);
}

const copyMonthBtn = document.getElementById('copyMonthLink');
if (copyMonthBtn) {
  copyMonthBtn.addEventListener('click', async () => {
    const link = `${window.location.origin}${window.location.pathname}#monthly&month=${state.currentMonth}`;
    await copyText(link);
  });
}
