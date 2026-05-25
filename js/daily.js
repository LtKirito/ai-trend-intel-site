/* === NextSignal Daily — AI 日报模块 === */

async function renderDaily() {
  if (!state.dailyIndex || state.dailyIndex.length === 0) {
    document.getElementById('dailyPeriodGrid').innerHTML = '<div class="loading">暂无日报数据，等待自动化生成…</div>';
    return;
  }
  
  renderDailyPeriods();
  selectDay(state.currentDay);
}

function renderDailyPeriods() {
  const grid = document.getElementById('dailyPeriodGrid');
  if (!grid) return;

  const monthFilter = document.getElementById('dailyMonth');
  const selectedMonth = monthFilter ? monthFilter.value : '';

  const filtered = selectedMonth
    ? state.dailyIndex.filter(d => d.date.startsWith(selectedMonth))
    : state.dailyIndex;

  grid.innerHTML = filtered.map(item => `
    <button class="period-card ${item.date === state.currentDay ? 'active' : ''}" data-day="${item.date}">
      <strong>${item.label || item.date}</strong>
      <span>${item.count || '—'}</span>
      <span>${item.tags || ''}</span>
    </button>
  `).join('');

  grid.querySelectorAll('[data-day]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.currentDay = btn.dataset.day;
      selectDay(state.currentDay);
    });
  });
}

async function selectDay(dateStr) {
  const data = await loadJSON(`daily-${dateStr}.json`);
  if (!data) {
    document.getElementById('dailyTitle').textContent = dateStr + ' 日报';
    document.getElementById('dailySummary').textContent = '数据加载失败，请稍后重试。';
    document.getElementById('dailyBody').textContent = '';
    document.getElementById('dailyJudgement').textContent = '';
    document.getElementById('dailySignals').innerHTML = '<div class="error-state"><p>⚠️ 无法加载该日期日报数据</p></div>';
    renderDailyPeriods();
    return;
  }

  document.getElementById('dailyTitle').textContent = data.title || (dateStr + ' AI 日报');
  document.getElementById('dailySummary').textContent = data.summary || '';
  document.getElementById('dailyBody').textContent = data.body || '';
  document.getElementById('dailyJudgement').textContent = data.judgement || '';

  const signals = data.signals || [];
  document.getElementById('dailySignals').innerHTML = signals.map(item => `
    <article class="signal">
      <span class="rank">${item.rank || item[0] || ''}</span>
      <div>
        <div class="signal-title">${item.title || item[1] || ''}</div>
        <p class="signal-desc">${item.desc || item[2] || ''}</p>
        ${(item.tags || item[3] || []).length ? `<div class="tag-row">${(item.tags || item[3] || []).map(tag => `<span class="tag">${tag}</span>`).join('')}</div>` : ''}
        ${item.source ? `<div class="meta-line"><a href="${item.source}" target="_blank" rel="noopener">查看来源 →</a></div>` : ''}
      </div>
    </article>
  `).join('');

  renderDailyPeriods();
  updateHomeDailySummary(data);
}

/* ---- Daily Month Filter ---- */
const dailyMonthEl = document.getElementById('dailyMonth');
if (dailyMonthEl) {
  // Populate months from index
  dailyMonthEl.addEventListener('change', () => {
    renderDailyPeriods();
  });
}

/* ---- Copy Daily Link ---- */
const copyDailyBtn = document.getElementById('copyDailyLink');
if (copyDailyBtn) {
  copyDailyBtn.addEventListener('click', async () => {
    const link = `${window.location.origin}${window.location.pathname}#daily&date=${state.currentDay}`;
    await copyText(link);
  });
}
