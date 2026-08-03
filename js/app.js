/* === NextSignal App — 核心路由与数据引擎 === */

const CONFIG = {
  dataPath: 'data/',
  screens: ['home', 'daily', 'github', 'monthly', 'opendesign'],
  defaultScreen: 'home'
};

let state = {
  currentScreen: CONFIG.defaultScreen,
  dailyIndex: null,
  weeklyIndex: null,
  monthlyIndex: null,
  opendesignData: null,
  currentDay: null,
  currentWeek: null,
  currentMonth: null
};

/* ---- Toast ---- */
function showToast(text) {
  const toast = document.getElementById('toast');
  toast.textContent = text;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1600);
}

/* ---- Copy --- */
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const t = document.createElement('textarea');
    t.value = text; t.style.position = 'fixed'; t.style.opacity = '0';
    document.body.appendChild(t); t.select();
    document.execCommand('copy'); t.remove();
  }
  showToast('已复制链接');
}

/* ---- Screen Navigation ---- */
function showScreen(name) {
  state.currentScreen = name;
  CONFIG.screens.forEach(s => {
    const el = document.getElementById(`screen-${s}`);
    if (el) el.classList.toggle('active', s === name);
  });
  document.querySelectorAll('.nav button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.viewLink === name);
  });
  document.getElementById('topbar').classList.remove('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---- Data Loading ---- */
async function loadJSON(filename) {
  try {
    const res = await fetch(CONFIG.dataPath + filename);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`Failed to load ${filename}:`, err);
    return null;
  }
}

async function initApp() {
  // Load indices
  state.dailyIndex = await loadJSON('daily-index.json');
  state.weeklyIndex = await loadJSON('weekly-index.json');
  state.monthlyIndex = await loadJSON('monthly-index.json');
  
  // Set default selections to latest
  if (state.dailyIndex && state.dailyIndex.length > 0) {
    state.currentDay = state.dailyIndex[0].date;
  }
  if (state.weeklyIndex && state.weeklyIndex.length > 0) {
    state.currentWeek = state.weeklyIndex[0].week;
  }
  if (state.monthlyIndex && state.monthlyIndex.length > 0) {
    state.currentMonth = state.monthlyIndex[0].month;
  }
  
  // Render initial state
  renderHome();
  renderDaily();
  renderGithub();
  renderMonthly();
  
  // Load OpenDesign data on demand
  state.opendesignData = await loadJSON('opendesign.json');
  renderOpenDesign();

  // Hide loading indicators
  document.querySelectorAll('.loading').forEach(el => el.style.display = 'none');
}

/* ---- Navigation Bindings ---- */
document.querySelectorAll('[data-view-link]').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.viewLink;
    if (target) {
      showScreen(target);
      if (target === 'daily') renderDaily();
      if (target === 'github') renderGithub();
      if (target === 'monthly') renderMonthly();
      if (target === 'opendesign') renderOpenDesign();
    }
  });
});

/* ---- Mobile Menu ---- */
const mobileMenu = document.getElementById('mobileMenu');
if (mobileMenu) {
  mobileMenu.addEventListener('click', () => {
    const topbar = document.getElementById('topbar');
    const isOpen = topbar.classList.toggle('open');
    mobileMenu.setAttribute('aria-expanded', String(isOpen));
  });
}

/* ---- Global Search ---- */
const search = document.getElementById('globalSearch');
if (search) {
  search.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const q = search.value.toLowerCase();
      // Find matching screen
      const screens = { daily: 'daily日报', github: 'github周报周', monthly: 'monthly月报月度', opendesign: 'opendesign专题' };
      for (const [key, val] of Object.entries(screens)) {
        if (val.includes(q)) { showScreen(key); break; }
      }
    }
  });
}

/* ---- Hash Routing ---- */
function parseHashScreen() {
  return window.location.hash.replace('#', '').split('&')[0];
}

window.addEventListener('hashchange', () => {
  const hash = parseHashScreen();
  if (CONFIG.screens.includes(hash)) {
    showScreen(hash);
    if (hash === 'daily') renderDaily();
    if (hash === 'github') renderGithub();
    if (hash === 'monthly') renderMonthly();
    if (hash === 'opendesign') renderOpenDesign();
  }
});

// Handle initial hash
if (window.location.hash) {
  const hash = parseHashScreen();
  if (CONFIG.screens.includes(hash)) state.currentScreen = hash;
}

/* ---- Init on DOM ready ---- */
document.addEventListener('DOMContentLoaded', initApp);
