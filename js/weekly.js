/* === NextSignal Weekly — GitHub 星标周报模块 === */

async function renderGithub() {
  if (!state.weeklyIndex || state.weeklyIndex.length === 0) {
    document.getElementById('weekPeriodGrid').innerHTML = '<div class="loading">暂无周报数据，等待首次生成…</div>';
    return;
  }

  renderWeekPeriods();
  selectWeek(state.currentWeek);
}

function renderWeekPeriods() {
  const grid = document.getElementById('weekPeriodGrid');
  if (!grid) return;

  const yearFilter = document.getElementById('githubYear');
  const quarterFilter = document.getElementById('githubQuarter');

  let filtered = state.weeklyIndex;
  if (yearFilter && yearFilter.value) {
    filtered = filtered.filter(w => w.week.startsWith(yearFilter.value));
  }
  if (quarterFilter && quarterFilter.value !== 'all') {
    const qMap = { q1: ['W01','W02','W03','W04','W05','W06','W07','W08','W09','W10','W11','W12','W13'],
                   q2: ['W14','W15','W16','W17','W18','W19','W20','W21','W22','W23','W24','W25','W26'],
                   q3: ['W27','W28','W29','W30','W31','W32','W33','W34','W35','W36','W37','W38','W39'],
                   q4: ['W40','W41','W42','W43','W44','W45','W46','W47','W48','W49','W50','W51','W52'] };
    const weeks = qMap[quarterFilter.value] || [];
    filtered = filtered.filter(w => {
      const wn = w.week.split('-W')[1];
      return weeks.includes('W' + wn);
    });
  }

  grid.innerHTML = filtered.map(item => `
    <button class="period-card ${item.week === state.currentWeek ? 'active' : ''}" data-week="${item.week}">
      <strong>${item.label || item.week}</strong>
      <span>${item.count || '—'}</span>
      <span>${item.theme || ''}</span>
    </button>
  `).join('');

  grid.querySelectorAll('[data-week]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.currentWeek = btn.dataset.week;
      selectWeek(state.currentWeek);
    });
  });
}

async function selectWeek(weekStr) {
  const data = await loadJSON(`weekly-${weekStr}.json`);
  if (!data) {
    document.getElementById('weekSummaryTitle').textContent = weekStr + ' GitHub 周报';
    document.getElementById('weekSummaryText').textContent = '数据加载失败，请稍后重试。';
    document.getElementById('githubTable').innerHTML = '<tr><td colspan="7" class="error-state">⚠️ 无法加载该周周报数据</td></tr>';
    document.getElementById('githubCards').innerHTML = '';
    updateCategoryBars([]);
    renderWeekPeriods();
    return;
  }

  document.getElementById('weekSummaryTitle').textContent = data.title || (weekStr + ' GitHub 星级周报');
  document.getElementById('weekSummaryText').textContent = data.summary || '';

  const categoryFilter = document.getElementById('categoryFilter');
  const selectedCat = categoryFilter ? categoryFilter.value : 'all';
  const rows = data.rows || [];
  const filteredRows = selectedCat === 'all' ? rows : rows.filter(r => r.category === selectedCat);

  document.getElementById('githubTable').innerHTML = filteredRows.map(row => `
    <tr>
      <td class="mono">${row.rank || ''}</td>
      <td>
        <div class="project-name">${row.name || ''}</div>
        <div class="project-desc">${row.why || ''}</div>
      </td>
      <td><span class="tag accent">${row.category || ''}</span></td>
      <td class="mono">${row.stars || ''}</td>
      <td class="mono" style="color:var(--success)">${row.growth || ''}</td>
      <td>${row.why || ''}</td>
      <td><button class="copy-btn" data-copy="${row.url || ''}" onclick="copyText('${row.url || ''}');this.classList.add('copied');this.textContent='已复制';setTimeout(()=>{this.classList.remove('copied');this.textContent='复制链接'},1400)">复制链接</button></td>
    </tr>
  `).join('');

  document.getElementById('githubCards').innerHTML = rows.slice(0, 3).map(row => `
    <article class="card clickable" onclick="window.open('${row.url || '#'}','_blank')">
      <div class="card-head">
        <div>
          <div class="kicker">Top ${row.rank}</div>
          <h3>${row.name || ''}</h3>
        </div>
        <span class="tag accent">${row.category || ''}</span>
      </div>
      <p class="card-desc">${row.why || ''}</p>
      <div class="meta-line">
        <span class="mono">${row.stars} stars</span>
        <span class="mono" style="color:var(--success)">${row.growth}</span>
      </div>
    </article>
  `).join('');

  updateCategoryBars(rows);
  renderWeekPeriods();
  updateHomeWeeklySummary(data);
}

function updateCategoryBars(rows) {
  const counts = { Agent: 0, DevTools: 0, Infra: 0, Multimodal: 0 };
  rows.forEach(row => {
    const cat = row.category;
    if (counts[cat] !== undefined) counts[cat]++;
  });
  const max = Math.max(1, ...Object.values(counts));

  Object.entries(counts).forEach(([key, value]) => {
    const bar = document.getElementById(`bar${key}`);
    const count = document.getElementById(`count${key}`);
    if (bar) bar.style.width = `${Math.max(12, (value / max) * 100)}%`;
    if (count) count.textContent = value;
  });
}

/* ---- Filters ---- */
const categoryFilter = document.getElementById('categoryFilter');
if (categoryFilter) {
  categoryFilter.addEventListener('change', () => selectWeek(state.currentWeek));
}

const githubYear = document.getElementById('githubYear');
const githubQuarter = document.getElementById('githubQuarter');
if (githubYear) githubYear.addEventListener('change', renderWeekPeriods);
if (githubQuarter) githubQuarter.addEventListener('change', renderWeekPeriods);

/* ---- Copy Week Link ---- */
const copyWeekBtn = document.getElementById('copyWeekLink');
if (copyWeekBtn) {
  copyWeekBtn.addEventListener('click', async () => {
    const link = `${window.location.origin}${window.location.pathname}#github&week=${state.currentWeek}`;
    await copyText(link);
  });
}
