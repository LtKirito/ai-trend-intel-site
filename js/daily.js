/* === NextSignal Daily — AI 日报模块 === */

async function renderDaily() {
  if (!state.dailyIndex || state.dailyIndex.length === 0) {
    document.getElementById('dailyPeriodGrid').innerHTML = '<div class="loading">暂无日报数据，等待自动化生成…</div>';
    return;
  }
  
  populateDailyMonths();
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
    document.getElementById('dailyTools').innerHTML = '';
    document.getElementById('dailyVideos').innerHTML = '';
    document.getElementById('dailyNoise').innerHTML = '';
    document.getElementById('dailyTracking').innerHTML = '';
    renderDailyPeriods();
    return;
  }

  document.getElementById('dailyTitle').textContent = data.title || (dateStr + ' AI 日报');
  document.getElementById('dailySummary').textContent = data.summary || '';
  document.getElementById('dailyBody').textContent = data.body || '';
  document.getElementById('dailyJudgement').textContent = data.judgement || '';

  // Conclusions
  renderDailyConclusions(data.conclusions || []);

  // Signals (enhanced)
  const signals = data.signals || [];
  document.getElementById('dailySignals').innerHTML = signals.map(item => {
    const rankClass = (item.rank || '') === 'P0' ? 'danger' : (item.rank === 'P1' ? 'warn' : 'accent');
    const sources = item.sources || (item.source ? [item.source] : []);
    return `
    <article class="signal">
      <span class="rank" style="color:var(--${rankClass})">${item.rank || ''}</span>
      <div>
        <div class="signal-title">${item.title || ''}</div>
        <div class="signal-desc">${item.summary || item.desc || ''}</div>
        ${item.why ? `<div class="signal-why"><strong>为什么重要：</strong>${item.why}</div>` : ''}
        ${item.action_fact || item.action_judge ? `<div class="signal-actions">
          ${item.action_fact ? `<div class="action-fact">${item.action_fact}</div>` : ''}
          ${item.action_judge ? `<div class="action-judge">${item.action_judge}</div>` : ''}
        </div>` : ''}
        <div class="tag-row">${(item.tags || []).map(t => `<span class="tag">${t}</span>`).join('')}</div>
        ${sources.length ? `<div class="signal-sources">${sources.map((url, i) => `<a href="${url}" target="_blank" rel="noopener">来源${i+1} ↗</a>`).join('')}</div>` : ''}
      </div>
    </article>`;
  }).join('');

  // Tools
  const tools = data.tools || [];
  document.getElementById('dailyTools').innerHTML = tools.length > 0 ? tools.map(t => `
    <tr>
      <td><strong>${t.name || ''}</strong></td>
      <td><span class="tag">${t.type || ''}</span></td>
      <td>${t.highlight || ''}</td>
      <td>${t.audience || ''}</td>
      <td>${t.action || ''}</td>
      <td>${t.url ? `<a href="${t.url}" target="_blank">链接 ↗</a>` : '—'}</td>
    </tr>
  `).join('') : '<tr><td colspan="6" style="color:var(--fg-dim)">—</td></tr>';

  // Video Topics
  const videos = data.video_topics || [];
  document.getElementById('dailyVideos').innerHTML = videos.length > 0 ? videos.map(v => `
    <tr>
      <td><strong>${v.title || ''}</strong></td>
      <td>${v.hook || ''}</td>
      <td>${v.angle || ''}</td>
      <td>${v.materials || ''}</td>
      <td><span class="tag ${(v.difficulty||'')==='低'?'success':(v.difficulty||'')==='高'?'danger':'warn'}">${v.difficulty || ''}</span></td>
    </tr>
  `).join('') : '<tr><td colspan="5" style="color:var(--fg-dim)">—</td></tr>';

  // Noise
  const noise = data.noise_items || [];
  document.getElementById('dailyNoise').innerHTML = noise.length > 0 ? noise.map(n => `
    <div class="noise-item">
      <strong>${n.item || ''}</strong>
      <div class="reason">❌ ${n.reason || ''}</div>
    </div>
  `).join('') : '<div class="loading" style="color:var(--fg-dim)">—</div>';

  // Tracking
  const tracking = data.tracking_items || [];
  document.getElementById('dailyTracking').innerHTML = tracking.length > 0 ? tracking.map(t => `
    <li><span class="name">${t.item || ''}</span><div class="desc">${t.reason || ''}</div></li>
  `).join('') : '<li style="color:var(--fg-dim)">—</li>';

  renderDailyPeriods();
  updateHomeDailySummary(data);
}

/* ---- Render Conclusions ---- */
function renderDailyConclusions(conclusions) {
  const bodyEl = document.getElementById('dailyBody');
  if (!conclusions.length) return;
  const list = conclusions.map((c, i) => `<li><span class="c-num">${i+1}.</span>${c}</li>`).join('');
  bodyEl.innerHTML = `<ul class="conclusions-list">${list}</ul>`;
}

/* ---- Daily Month Filter ---- */
function populateDailyMonths() {
  const dailyMonthEl = document.getElementById('dailyMonth');
  if (!dailyMonthEl || !state.dailyIndex) return;

  const monthLabels = new Map();
  state.dailyIndex.forEach(item => {
    const month = (item.date || '').slice(0, 7);
    if (!month || monthLabels.has(month)) return;
    const [year, monthNum] = month.split('-');
    monthLabels.set(month, `${year} 年 ${Number(monthNum)} 月`);
  });

  dailyMonthEl.innerHTML = Array.from(monthLabels, ([value, label]) =>
    `<option value="${value}">${label}</option>`
  ).join('');
}

const dailyMonthEl = document.getElementById('dailyMonth');
if (dailyMonthEl) {
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
