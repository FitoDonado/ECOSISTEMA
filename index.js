/* index.js */

let activeYear = null;
let activeTrim = null;

const TRIMESTRES = ['I', 'II', 'III', 'IV'];

function init() {
  ensureCurrentYear();
  renderYears();
  renderTrimestres();
}

function renderYears() {
  const years = getYears();
  const container = document.getElementById('yearTabs');
  if (!activeYear || !years.includes(activeYear)) activeYear = years[0];
  container.innerHTML = '';
  years.forEach(y => {
    const btn = document.createElement('button');
    btn.className = 'year-tab' + (y === activeYear ? ' active' : '');
    btn.textContent = y;
    btn.onclick = () => { activeYear = y; renderYears(); renderTrimestres(); renderGroups(); };
    container.appendChild(btn);
  });
}

document.getElementById('btnAddYear').onclick = () => {
  const y = prompt('Ingresa el año a agregar (ej: 2027):');
  if (y && /^\d{4}$/.test(y.trim())) {
    addYear(y.trim());
    activeYear = y.trim();
    renderYears();
    renderTrimestres();
  }
};

function renderTrimestres() {
  const container = document.getElementById('trimesterGrid');
  container.innerHTML = '';
  if (!activeYear) return;
  const db = getDB();
  TRIMESTRES.forEach(t => {
    const groups = getGroups(activeYear, t);
    const activos = groups.filter(g => g.aprendices && g.aprendices.some(a => a.estado === 'EN FORMACION')).length;
    const card = document.createElement('div');
    card.className = 'trim-card' + (t === activeTrim ? ' active' : '');
    card.innerHTML = `
      <div class="trim-label">${activeYear}</div>
      <div class="trim-name">${t} Trimestre</div>
      <div class="trim-count"><span>${groups.length}</span> grupo${groups.length !== 1 ? 's' : ''}</div>`;
    card.onclick = () => {
      activeTrim = t;
      renderTrimestres();
      renderGroups();
    };
    container.appendChild(card);
  });
}

function renderGroups() {
  if (!activeTrim || !activeYear) return;
  const section = document.getElementById('groupsSection');
  const grid = document.getElementById('groupsGrid');
  const empty = document.getElementById('emptyGroups');
  const title = document.getElementById('groupsTitle');
  const btnNew = document.getElementById('btnNewGroup');

  section.style.display = 'block';
  title.textContent = `${activeYear} — ${activeTrim} Trimestre`;
  btnNew.href = `nuevo-grupo.html?year=${activeYear}&trim=${activeTrim}`;

  const groups = getGroups(activeYear, activeTrim);
  grid.innerHTML = '';

  if (!groups.length) {
    empty.style.display = 'block';
    grid.style.display = 'none';
    return;
  }
  empty.style.display = 'none';
  grid.style.display = 'grid';

  groups.forEach(g => {
    const total = (g.aprendices || []).length;
    const activos = (g.aprendices || []).filter(a => a.estado === 'EN FORMACION').length;
    const alertas = (g.aprendices || []).filter(a => (a.faltas || 0) >= 2).length;
    const card = document.createElement('a');
    card.className = 'group-card';
    card.href = `grupo.html?id=${g.id}`;
    card.innerHTML = `
      <div class="group-card-name">${g.nombre || g.grupo}</div>
      <div class="group-card-ficha">Ficha ${g.ficha} · ${g.instructor}</div>
      <div class="group-card-tags">
        <span class="tag tag-blue">${activos} activos</span>
        ${alertas > 0 ? `<span class="tag tag-warn">${alertas} alerta${alertas !== 1 ? 's' : ''}</span>` : ''}
        <span class="tag tag-blue">${total} aprendices</span>
      </div>`;
    grid.appendChild(card);
  });
}

init();
