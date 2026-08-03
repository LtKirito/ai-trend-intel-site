/* === NextSignal Home — 首页模块 === */

function renderHome() {
  // Update stats
  updateHomeStats();
  
  // Update top cards
  renderHomeCards();
}

function updateHomeStats() {
  // Daily count
  const dailyCount = document.getElementById('homeDailyCount');
  if (dailyCount && state.dailyIndex) {
    dailyCount.textContent = state.dailyIndex.length || '—';
  }

  // Weekly count
  const weeklyCount = document.getElementById('homeWeeklyCount');
  if (weeklyCount && state.weeklyIndex) {
    weeklyCount.textContent = state.weeklyIndex.length || '—';
  }

  // Monthly count
  const monthlyCount = document.getElementById('homeMonthlyCount');
  if (monthlyCount && state.monthlyIndex) {
    monthlyCount.textContent = state.monthlyIndex.length || '—';
  }

  // OpenDesign count
  const odCount = document.getElementById('homeODCount');
  if (odCount && state.opendesignData) {
    const prs = state.opendesignData.recent_prs || [];
    const issues = state.opendesignData.recent_issues || [];
    odCount.textContent = prs.length + issues.length || '—';
  }
}

function updateHomeDailySummary(data) {
  const el = document.getElementById('homeDailyCard');
  if (!el || !data) return;
  el.innerHTML = `
    <div class="card-head">
      <div><div class="kicker">最新日报</div><h3>${data.title || 'AI 日报'}</h3></div>
      <span class="tag accent">${state.currentDay || ''}</span>
    </div>
    <p class="card-desc">${data.summary || ''}</p>
    <div class="tag-row">${(data.tags || []).map(t => `<span class="tag">${t}</span>`).join('')}</div>
  `;
}

function updateHomeWeeklySummary(data) {
  const el = document.getElementById('homeWeeklyCard');
  if (!el || !data) return;
  el.innerHTML = `
    <div class="card-head">
      <div><div class="kicker">最新周报</div><h3>${data.title || 'GitHub 周报'}</h3></div>
      <span class="tag accent">${state.currentWeek || ''}</span>
    </div>
    <p class="card-desc">${data.summary || ''}</p>
    <div class="meta-line">
      <span class="mono" style="color:var(--success)">${data.count || ''} 个项目</span>
      <span>${data.theme || ''}</span>
    </div>
  `;
}

function updateHomeMonthlySummary(data) {
  const el = document.getElementById('homeMonthlyCard');
  if (!el || !data) return;
  const coverage = data.coverage || {};
  el.innerHTML = `
    <div class="card-head">
      <div><div class="kicker">最新月报</div><h3>${data.title || 'AI 月报'}</h3></div>
      <span class="tag accent">${state.currentMonth || ''}</span>
    </div>
    <p class="card-desc">${data.summary || ''}</p>
    <div class="meta-line">
      <span class="mono" style="color:var(--success)">${coverage.daily_count || 0} 份日报</span>
      <span>${(data.trend_lines || []).length} 条趋势线</span>
    </div>
  `;
}

function updateHomeODSummary(data) {
  const el = document.getElementById('homeODCard');
  if (!el || !data) return;
  const repo = data.repo || {};
  const trends = data.trends || {};
  el.innerHTML = `
    <div class="card-head">
      <div><div class="kicker">OpenDesign 动态</div><h3>${trends.direction || '追踪中'}</h3></div>
      <span class="tag accent">v${repo.latest_release ? repo.latest_release.version : '—'}</span>
    </div>
    <p class="card-desc">Stars: ${formatNumber(repo.stars)} · Open PRs: ${repo.open_prs || '—'} · Issues: ${repo.open_issues || '—'}</p>
    <div class="tag-row">${(trends.affected_modules || []).map(m => `<span class="tag">${m}</span>`).join('')}</div>
  `;
}

function renderHomeCards() {
  // Cards get updated as modules load
  setTimeout(() => {
    // Try to load latest daily for home card
    if (state.dailyIndex && state.dailyIndex.length > 0) {
      loadJSON(`daily-${state.dailyIndex[0].date}.json`).then(updateHomeDailySummary);
    }
    if (state.weeklyIndex && state.weeklyIndex.length > 0) {
      loadJSON(`weekly-${state.weeklyIndex[0].week}.json`).then(updateHomeWeeklySummary);
    }
    if (state.monthlyIndex && state.monthlyIndex.length > 0) {
      loadJSON(`monthly-${state.monthlyIndex[0].month}.json`).then(updateHomeMonthlySummary);
    }
  }, 200);
}
