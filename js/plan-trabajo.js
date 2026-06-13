/* plan-trabajo.js — Plan de Trabajo Concertado GFPI-G-013 */

let groupId = null;
let group   = null;
let plan    = [];  // array de sesiones del plan

/* ── INIT ─────────────────────────────── */
function init() {
  groupId = new URLSearchParams(window.location.search).get('id');
  if (!groupId) { window.location.href = 'index.html'; return; }
  group = getGroup(groupId);
  if (!group) { window.location.href = 'index.html'; return; }

  // Cargar plan guardado o inicializar vacío
  plan = group.planTrabajo || [];

  renderHeaderCard();
  renderStats();
  renderPlanTable();
  renderAprendicesTab();

  document.getElementById('breadcrumb').textContent =
    `${group.year} · ${group.trimestre} Trimestre · ${group.nombre}`;
  document.getElementById('navGrupo').textContent = group.nombre;
  document.getElementById('btnVolver').href = `grupo.html?id=${groupId}`;

  document.getElementById('btnGuardar').onclick = guardarPlan;
  document.getElementById('btnAddSesion').onclick = addSesionRow;
  document.getElementById('btnExportExcel').onclick = exportarExcel;
}

/* ── ENCABEZADO ───────────────────────── */
function renderHeaderCard() {
  const card = document.getElementById('planHeaderCard');
  const ra = (group.ra || '').split(' | ').join('<br>');
  card.innerHTML = `
    <div class="plan-header-field">
      <span class="plan-header-label">Programa de formación</span>
      <span class="plan-header-value">${group.programa || '—'}</span>
    </div>
    <div class="plan-header-field">
      <span class="plan-header-label">Ficha</span>
      <span class="plan-header-value">${group.ficha || '—'} · ${group.nombre}</span>
    </div>
    <div class="plan-header-field plan-header-full">
      <span class="plan-header-label">Competencia</span>
      <span class="plan-header-value">${group.competencia || '—'}</span>
    </div>
    <div class="plan-header-field plan-header-full">
      <span class="plan-header-label">Resultado(s) de aprendizaje</span>
      <span class="plan-header-value">${ra || '—'}</span>
    </div>
    <div class="plan-header-field">
      <span class="plan-header-label">Instructor</span>
      <span class="plan-header-value">${group.instructor || '—'}</span>
    </div>
    <div class="plan-header-field">
      <span class="plan-header-label">Horario</span>
      <span class="plan-header-value">${group.horario1 || '—'}${group.horario2 ? ' · ' + group.horario2 : ''}</span>
    </div>
    <div class="plan-header-field">
      <span class="plan-header-label">Centro · Regional</span>
      <span class="plan-header-value">${group.centro || '—'} · ${group.regional || '—'}</span>
    </div>
    <div class="plan-header-field">
      <span class="plan-header-label">Período</span>
      <span class="plan-header-value">${group.year} · ${group.trimestre} Trimestre${group.numTrim===2?' (2 trimestres)':''}</span>
    </div>`;
}

/* ── STATS ────────────────────────────── */
function renderStats() {
  const ap = (group.aprendices || []).filter(a => a.estado === 'EN FORMACION');
  const totalSes = plan.length;
  const conEvidencia = plan.filter(s => s.evidencia && s.evidencia.trim()).length;
  const entregadas = plan.reduce((acc, s) => {
    if (!s.aprendicesEntrego) return acc;
    return acc + Object.values(s.aprendicesEntrego).filter(v => v === 'SI').length;
  }, 0);
  const totalEsperadas = conEvidencia * ap.length;
  const pctEntrega = totalEsperadas > 0 ? Math.round((entregadas / totalEsperadas) * 100) : 0;

  document.getElementById('planStats').innerHTML = `
    <div class="pstat">
      <div class="pstat-num">${ap.length}</div>
      <div class="pstat-label">Aprendices EN FORMACIÓN</div>
    </div>
    <div class="pstat">
      <div class="pstat-num">${totalSes}</div>
      <div class="pstat-label">Sesiones programadas</div>
    </div>
    <div class="pstat ${conEvidencia===totalSes&&totalSes>0?'ok':''}">
      <div class="pstat-num">${conEvidencia}</div>
      <div class="pstat-label">Sesiones con evidencia</div>
    </div>
    <div class="pstat ${pctEntrega>=80?'ok':pctEntrega>=50?'warn':''}">
      <div class="pstat-num">${pctEntrega}%</div>
      <div class="pstat-label">Cumplimiento entregas</div>
    </div>`;
}

/* ── TABLA SESIONES ───────────────────── */
function renderPlanTable() {
  const tbody = document.getElementById('planTbody');
  tbody.innerHTML = '';

  if (!plan.length) {
    // Generar filas vacías (11 por defecto)
    for (let i = 1; i <= 11; i++) {
      plan.push({ id: 'p_'+Date.now()+'_'+i, num: i, fecha: '', actividad: '', evidencia: '', formaEntrega: 'FÍSICO', fechaEntrega: '', aprendicesEntrego: {} });
    }
  }

  plan.forEach((s, idx) => appendPlanRow(tbody, s, idx));
}

function appendPlanRow(tbody, s, idx) {
  const tr = document.createElement('tr');
  tr.dataset.id = s.id;
  tr.innerHTML = `
    <td><span class="sesion-num">${s.num || idx+1}</span></td>
    <td><input type="date" class="cell-date" value="${s.fecha||''}" onchange="updatePlan('${s.id}','fecha',this.value)"></td>
    <td><textarea class="cell-edit" rows="2" placeholder="Describe la actividad a desarrollar en esta sesión..." onchange="updatePlan('${s.id}','actividad',this.value)">${s.actividad||''}</textarea></td>
    <td><textarea class="cell-edit" rows="2" placeholder="Evidencia de conocimiento, desempeño o producto..." onchange="updatePlan('${s.id}','evidencia',this.value)">${s.evidencia||''}</textarea></td>
    <td>
      <select class="cell-select" onchange="updatePlan('${s.id}','formaEntrega',this.value)">
        <option value="FÍSICO"${s.formaEntrega==='FÍSICO'?' selected':''}>Físico</option>
        <option value="DIGITAL"${s.formaEntrega==='DIGITAL'?' selected':''}>Digital</option>
        <option value="FÍSICO Y DIGITAL"${s.formaEntrega==='FÍSICO Y DIGITAL'?' selected':''}>Ambos</option>
      </select>
    </td>
    <td><input type="date" class="cell-date" value="${s.fechaEntrega||''}" onchange="updatePlan('${s.id}','fechaEntrega',this.value)"></td>
    <td>
      <button class="entrego-btn ${getEntregoClass(s.entregoGrupo)}" onclick="ciclarEntrego('${s.id}')">
        ${s.entregoGrupo || '—'}
      </button>
    </td>
    <td>
      <button class="btn-remove" onclick="removeSesion('${s.id}')" title="Eliminar sesión">✕</button>
    </td>`;
  tbody.appendChild(tr);
}

function getEntregoClass(val) {
  if (val === 'SI') return 'entrego-si';
  if (val === 'NO') return 'entrego-no';
  return 'entrego-vacio';
}

function updatePlan(id, field, value) {
  const s = plan.find(p => p.id === id);
  if (s) s[field] = value;
  if (field === 'evidencia' || field === 'actividad') renderStats();
}

function ciclarEntrego(id) {
  const s = plan.find(p => p.id === id);
  if (!s) return;
  const ciclo = ['', 'SI', 'NO'];
  const idx = ciclo.indexOf(s.entregoGrupo || '');
  s.entregoGrupo = ciclo[(idx + 1) % ciclo.length];
  renderPlanTable();
  renderAprendicesTab();
  renderStats();
}

function removeSesion(id) {
  plan = plan.filter(p => p.id !== id);
  plan.forEach((s, i) => s.num = i + 1);
  renderPlanTable();
  renderStats();
}

function addSesionRow() {
  const newSes = {
    id: 'p_' + Date.now(),
    num: plan.length + 1,
    fecha: '',
    actividad: '',
    evidencia: '',
    formaEntrega: 'FÍSICO',
    fechaEntrega: '',
    entregoGrupo: '',
    aprendicesEntrego: {}
  };
  plan.push(newSes);
  const tbody = document.getElementById('planTbody');
  appendPlanRow(tbody, newSes, plan.length - 1);
  renderStats();
}

/* ── TAB APRENDICES ───────────────────── */
function renderAprendicesTab() {
  const ap = (group.aprendices || []).filter(a => a.estado === 'EN FORMACION');
  const sesConEvidencia = plan.filter(s => s.evidencia && s.evidencia.trim());
  const container = document.getElementById('aprendicesCards');
  document.getElementById('aprendizCount').textContent = `${ap.length} aprendices · ${sesConEvidencia.length} evidencias programadas`;

  container.innerHTML = '';

  if (!ap.length) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--muted)">No hay aprendices EN FORMACIÓN.</div>';
    return;
  }
  if (!sesConEvidencia.length) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--muted)">Agrega actividades con evidencias en la pestaña "Sesiones" para ver el seguimiento por aprendiz.</div>';
    return;
  }

  ap.forEach((a, i) => {
    const entregadas = sesConEvidencia.filter(s => (s.aprendicesEntrego||{})[a.id] === 'SI').length;
    const pct = sesConEvidencia.length > 0 ? Math.round(entregadas/sesConEvidencia.length*100) : 0;
    const card = document.createElement('div');
    card.className = 'aprendiz-plan-card';
    let filas = sesConEvidencia.map((s, si) => {
      const val = (s.aprendicesEntrego||{})[a.id] || '';
      return `<tr>
        <td>${s.num}</td>
        <td>${fmtFechaLocal(s.fecha)}</td>
        <td>${s.actividad||'—'}</td>
        <td>${s.evidencia}</td>
        <td>${s.formaEntrega||'FÍSICO'}</td>
        <td>${fmtFechaLocal(s.fechaEntrega)}</td>
        <td><button class="entrego-btn ${getEntregoClass(val)}" style="font-size:10px;padding:3px 10px" onclick="ciclarAprendizEntrego('${s.id}','${a.id}')">${val||'—'}</button></td>
      </tr>`;
    }).join('');

    card.innerHTML = `
      <div class="aprendiz-plan-header">
        <div>
          <div class="aprendiz-plan-name">${a.apellidos} ${a.nombres}</div>
          <div class="aprendiz-plan-doc"><span style="font-weight:700;color:var(--accent)">${a.tipoDoc}</span> ${a.documento}</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:12px;color:var(--muted)">${entregadas}/${sesConEvidencia.length} entregas</span>
          <span style="font-size:13px;font-weight:700;color:${pct>=80?'var(--success)':pct>=50?'var(--warning)':'var(--danger)'}">${pct}%</span>
        </div>
      </div>
      <div style="overflow-x:auto">
        <table class="aprendiz-mini-table">
          <thead><tr><th>N°</th><th>Fecha</th><th>Actividad</th><th>Evidencia</th><th>Forma</th><th>F. Entrega</th><th>Entregó</th></tr></thead>
          <tbody>${filas}</tbody>
        </table>
      </div>`;
    container.appendChild(card);
  });
}

function ciclarAprendizEntrego(sesId, apId) {
  const s = plan.find(p => p.id === sesId);
  if (!s) return;
  if (!s.aprendicesEntrego) s.aprendicesEntrego = {};
  const ciclo = ['', 'SI', 'NO'];
  const idx = ciclo.indexOf(s.aprendicesEntrego[apId] || '');
  s.aprendicesEntrego[apId] = ciclo[(idx + 1) % ciclo.length];
  renderAprendicesTab();
  renderStats();
}

/* ── GUARDAR ──────────────────────────── */
function guardarPlan() {
  // Leer valores actuales de los inputs antes de guardar
  document.querySelectorAll('#planTbody tr[data-id]').forEach(tr => {
    const id = tr.dataset.id;
    const s = plan.find(p => p.id === id);
    if (!s) return;
    const fecha = tr.querySelector('input[type=date]');
    const act   = tr.querySelectorAll('textarea')[0];
    const evid  = tr.querySelectorAll('textarea')[1];
    const forma = tr.querySelector('select');
    const fEnt  = tr.querySelectorAll('input[type=date]')[1];
    if (fecha) s.fecha        = fecha.value;
    if (act)   s.actividad    = act.value;
    if (evid)  s.evidencia    = evid.value;
    if (forma) s.formaEntrega = forma.value;
    if (fEnt)  s.fechaEntrega = fEnt.value;
  });

  const db = getDB();
  db.groups[groupId].planTrabajo = plan;
  saveDB(db);
  group = getGroup(groupId);

  const btn = document.getElementById('btnGuardar');
  btn.textContent = '✓ Guardado';
  btn.style.background = 'var(--success)';
  setTimeout(() => { btn.textContent = 'Guardar cambios'; btn.style.background = ''; }, 2000);
  renderStats();
  renderAprendicesTab();
}

/* ── EXPORTAR EXCEL ───────────────────── */
function exportarExcel() {
  guardarPlan();
  const wb = XLSX.utils.book_new();
  const ap = (group.aprendices || []).filter(a => a.estado === 'EN FORMACION');

  // ── HOJA 1: PLAN DE TRABAJO ──
  const encabezado = [
    ['SERVICIO NACIONAL DE APRENDIZAJE - SENA'],
    ['PLAN DE TRABAJO CONCERTADO CON EL APRENDIZ'],
    ['Procedimiento Ejecución de la FPI · GFPI-G-013'],
    [],
    ['PROGRAMA DE FORMACIÓN:', group.programa || ''],
    ['FICHA:', group.ficha || '', 'GRUPO:', group.nombre || ''],
    ['COMPETENCIA:', group.competencia || ''],
    ['RESULTADO(S) DE APRENDIZAJE:', (group.ra||'').replace(/ \| /g, ' / ')],
    ['INSTRUCTOR:', group.instructor || '', 'REGIONAL:', group.regional || ''],
    ['CENTRO:', group.centro || '', 'HORARIO:', group.horario1 || ''],
    ['PERÍODO:', `${group.year} · ${group.trimestre} Trimestre`],
    [],
    ['N°', 'FECHA', 'ACTIVIDAD A DESARROLLAR', 'EVIDENCIA A ENTREGAR',
     'FORMA DE ENTREGA', 'FECHA DE ENTREGA', 'ENTREGÓ (GRUPO)']
  ];

  const filasPlan = plan.map(s => [
    s.num,
    fmtFechaLocal(s.fecha),
    s.actividad || '',
    s.evidencia || '',
    s.formaEntrega || 'FÍSICO',
    fmtFechaLocal(s.fechaEntrega),
    s.entregoGrupo || ''
  ]);

  const ws1 = XLSX.utils.aoa_to_sheet([...encabezado, ...filasPlan]);
  ws1['!cols'] = [{wch:5},{wch:12},{wch:50},{wch:40},{wch:16},{wch:14},{wch:12}];
  XLSX.utils.book_append_sheet(wb, ws1, 'PLAN DE TRABAJO');

  // ── HOJA 2: SEGUIMIENTO POR APRENDIZ ──
  const sesConEvidencia = plan.filter(s => s.evidencia && s.evidencia.trim());
  const encAp = [
    ['SEGUIMIENTO DE ENTREGAS POR APRENDIZ'],
    ['Ficha: ' + (group.ficha||'') + ' · ' + (group.nombre||'')],
    [],
    ['N°', 'TIPO DOC.', 'DOCUMENTO', 'APELLIDOS', 'NOMBRES',
     ...sesConEvidencia.map(s => `S${s.num} - ${s.evidencia.slice(0,30)}`),
     'ENTREGADAS', 'NO ENTREGÓ', '% CUMPLIMIENTO']
  ];

  const filasAp = ap.map((a, i) => {
    const marcas = sesConEvidencia.map(s => (s.aprendicesEntrego||{})[a.id] || '');
    const entregadas = marcas.filter(v => v === 'SI').length;
    const pct = sesConEvidencia.length ? Math.round(entregadas/sesConEvidencia.length*100)+'%' : '0%';
    return [i+1, a.tipoDoc, a.documento, a.apellidos, a.nombres,
      ...marcas, entregadas, sesConEvidencia.length-entregadas, pct];
  });

  const ws2 = XLSX.utils.aoa_to_sheet([...encAp, ...filasAp]);
  ws2['!cols'] = [{wch:4},{wch:8},{wch:14},{wch:22},{wch:22},
    ...sesConEvidencia.map(()=>({wch:10})),{wch:10},{wch:10},{wch:12}];
  XLSX.utils.book_append_sheet(wb, ws2, 'SEGUIMIENTO APRENDICES');

  // ── HOJA 3: FIRMAS (para imprimir) ──
  const firmasEnc = [
    ['PLAN DE TRABAJO CONCERTADO - ACTA DE COMPROMISO'],
    [`Ficha: ${group.ficha||''} · Grupo: ${group.nombre||''} · ${group.trimestre} Trimestre ${group.year}`],
    [`Competencia: ${group.competencia||''}`],
    [`Instructor: ${group.instructor||''}`],
    [],
    ['Al inicio del trimestre se concertó con los aprendices EN FORMACIÓN el presente plan de trabajo,'],
    ['el cual establece las actividades, evidencias y fechas de entrega para el desarrollo de la ruta de aprendizaje.'],
    [],
    ['N°', 'TIPO DOC.', 'DOCUMENTO', 'APELLIDOS Y NOMBRES', 'FIRMA']
  ];
  const firmasFilas = ap.map((a, i) => [i+1, a.tipoDoc, a.documento, `${a.apellidos} ${a.nombres}`, '']);
  const ws3 = XLSX.utils.aoa_to_sheet([...firmasEnc, ...firmasFilas]);
  ws3['!cols'] = [{wch:4},{wch:8},{wch:14},{wch:36},{wch:30}];
  XLSX.utils.book_append_sheet(wb, ws3, 'ACTA DE COMPROMISO');

  XLSX.writeFile(wb, `PlanTrabajo_${group.nombre}_${group.ficha}_${fmtHoyArchivo()}.xlsx`);
}

/* ── HELPERS ──────────────────────────── */
function fmtFechaLocal(iso) {
  if (!iso) return '';
  if (iso.includes('/')) return iso;
  const [y,m,d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function fmtHoyArchivo() {
  const h = new Date();
  return `${h.getFullYear()}-${String(h.getMonth()+1).padStart(2,'0')}-${String(h.getDate()).padStart(2,'0')}`;
}

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach((b,i) => {
    b.classList.toggle('active', ['sesiones','aprendices'][i]===tab);
  });
  document.getElementById('tab-sesiones').style.display  = tab==='sesiones'  ? 'block' : 'none';
  document.getElementById('tab-aprendices').style.display = tab==='aprendices' ? 'block' : 'none';
  if (tab === 'aprendices') {
    guardarPlan();
    renderAprendicesTab();
  }
}

init();
