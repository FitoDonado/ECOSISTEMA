/* asistencia.js — módulo de asistencia en línea */

const DIAS = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
const CICLO = ['', 'O', 'X', 'E', 'T'];

let groupId   = null;
let group     = null;
let sesionActiva = null;   // { id, fecha, dia, horaInicio, horaFin, tema, marcas:{apId:marca} }
let sesionEditModal = null;

/* ── INIT ─────────────────────────────── */
function init() {
  groupId = new URLSearchParams(window.location.search).get('id');
  if (!groupId) { window.location.href = 'index.html'; return; }
  group = getGroup(groupId);
  if (!group) { window.location.href = 'index.html'; return; }

  // Encabezado
  document.getElementById('breadcrumb').textContent =
    `${group.year} · ${group.trimestre} Trimestre · ${group.nombre}`;
  document.getElementById('pageTitle').textContent = 'Asistencia — ' + group.nombre;
  document.getElementById('pageSubtitle').textContent =
    `Ficha ${group.ficha} · ${group.instructor} · ${group.programa?.slice(0,60)}…`;
  document.getElementById('navGrupo').textContent = group.nombre;
  document.getElementById('btnVolver').href = `grupo.html?id=${groupId}`;

  buildDias();
  buildHoras();
  setFechaHoy();
  renderHistorial();
  renderResumen();
}

/* ── DÍAS ─────────────────────────────── */
function buildDias() {
  const grid = document.getElementById('diasGrid');
  DIAS.forEach(d => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dia-btn';
    btn.textContent = d.slice(0,3);
    btn.title = d;
    btn.onclick = () => {
      document.querySelectorAll('.dia-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('sDia').value = d;
      // Auto-ajustar fecha al próximo día de esa semana
      autoFecha(d);
    };
    grid.appendChild(btn);
  });
  // Seleccionar día actual
  const hoy = new Date().getDay(); // 0=dom
  const map = [6,0,1,2,3,4,5];   // JS domingo=0 → índice en DIAS
  const idx = map[hoy];
  grid.children[idx]?.click();
}

function autoFecha(dia) {
  const diasMap = {Lunes:1,Martes:2,'Miércoles':3,Jueves:4,Viernes:5,Sábado:6,Domingo:0};
  const target = diasMap[dia];
  const hoy = new Date();
  const diff = (target - hoy.getDay() + 7) % 7;
  const fecha = new Date(hoy);
  fecha.setDate(hoy.getDate() - (diff === 0 ? 0 : 7 - diff));
  // Si diff===0 es hoy, si no, el más reciente pasado
  const d = diff === 0 ? hoy : new Date(hoy.setDate(hoy.getDate() - ((hoy.getDay() - target + 7) % 7)));
  document.getElementById('sFecha').valueAsDate = new Date();
}

function setFechaHoy() {
  const hoy = new Date();
  const iso = hoy.toISOString().split('T')[0];
  document.getElementById('sFecha').value = iso;
}

/* ── HORAS ────────────────────────────── */
function buildHoras() {
  const horas = [];
  for (let h = 5; h <= 22; h++) {
    horas.push(`${String(h).padStart(2,'0')}:00`);
    horas.push(`${String(h).padStart(2,'0')}:30`);
  }
  const selI = document.getElementById('sHoraInicio');
  const selF = document.getElementById('sHoraFin');
  horas.forEach(h => {
    selI.add(new Option(h, h));
    selF.add(new Option(h, h));
  });
  selI.value = '06:30';
  selF.value = '11:30';

  selI.onchange = () => {
    // Auto-ajustar fin a +5h
    const [hh, mm] = selI.value.split(':').map(Number);
    const fin = `${String(hh+5).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
    if (horas.includes(fin)) selF.value = fin;
  };
}

/* ── ABRIR SESIÓN ─────────────────────── */
function abrirSesion() {
  const dia   = document.getElementById('sDia').value;
  const fecha = document.getElementById('sFecha').value;
  const hi    = document.getElementById('sHoraInicio').value;
  const hf    = document.getElementById('sHoraFin').value;
  const tema  = document.getElementById('sTema').value.trim();

  if (!fecha) { alert('Selecciona la fecha de la sesión.'); return; }
  if (!dia)   { alert('Selecciona el día.'); return; }

  const sesiones = group.sesiones || [];
  const num = sesiones.length + 1;

  sesionActiva = {
    id:         's_' + Date.now(),
    num,
    dia,
    fecha,
    horaInicio: hi,
    horaFin:    hf,
    tema:       tema || `Sesión ${num}`,
    marcas:     {}
  };

  // Pre-marcar todos en 'O' por defecto
  (group.aprendices || []).forEach(a => {
    if (a.estado === 'EN FORMACION') sesionActiva.marcas[a.id] = 'O';
  });

  mostrarBannerActiva();
  renderTablaSesionActiva();

  document.getElementById('panelNuevaSesion').style.display = 'none';
  document.getElementById('tablaAsistenciaWrap').style.display = 'block';
  document.getElementById('sesionActivaBanner').style.display = 'block';
}

function mostrarBannerActiva() {
  const s = sesionActiva;
  document.getElementById('bannerTitulo').textContent =
    `Sesión ${s.num} — ${s.dia} ${formatFecha(s.fecha)}`;
  document.getElementById('bannerMeta').textContent =
    `${s.horaInicio} – ${s.horaFin} · ${s.tema}`;
  document.getElementById('tablaSessionTitle').textContent =
    `Sesión ${s.num} · ${s.dia} ${formatFecha(s.fecha)} · ${s.horaInicio}–${s.horaFin}`;
}

/* ── TABLA SESIÓN ACTIVA ──────────────── */
function renderTablaSesionActiva() {
  const tbody = document.getElementById('tablaAsistenciaTbody');
  tbody.innerHTML = '';
  const ap = (group.aprendices || []).filter(a => a.estado === 'EN FORMACION');

  ap.forEach((a, i) => {
    const faltas = contarFaltas(a) + (sesionActiva.marcas[a.id] === 'X' ? 1 : 0);
    const marca  = sesionActiva.marcas[a.id] || '';
    const alerta = getAlerta(faltas);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="left" style="color:var(--muted)">${i+1}</td>
      <td class="left" style="font-weight:500">${a.apellidos} ${a.nombres}</td>
      <td style="font-size:12px"><span style="font-weight:700;color:var(--accent);margin-right:3px">${a.tipoDoc}</span>${a.documento}</td>
      <td class="celda-marca" id="celda_${a.id}">
        <button class="marca-btn ${marca}" onclick="ciclarMarca('${a.id}')">${marca || '—'}</button>
      </td>
      <td><span class="alerta-fila ${alertaClass(alerta.level)}" id="alerta_${a.id}">${alerta.label}</span></td>
      <td style="font-weight:700;color:${faltas>=2?'var(--danger)':faltas>=1?'var(--warning)':'var(--muted)'}" id="faltas_${a.id}">${faltas}</td>`;
    tbody.appendChild(tr);
  });
}

function ciclarMarca(apId) {
  const actual = sesionActiva.marcas[apId] || '';
  const idx = CICLO.indexOf(actual);
  const siguiente = CICLO[(idx + 1) % CICLO.length];
  sesionActiva.marcas[apId] = siguiente;

  // Actualizar celda sin re-renderizar toda la tabla
  const celda = document.getElementById(`celda_${apId}`);
  const btn = celda.querySelector('.marca-btn');
  btn.className = `marca-btn ${siguiente}`;
  btn.textContent = siguiente || '—';

  // Actualizar alerta y faltas
  const a = group.aprendices.find(x => x.id === apId);
  const faltasPrev = contarFaltas(a);
  const faltasTotal = faltasPrev + (siguiente === 'X' ? 1 : 0);
  const alerta = getAlerta(faltasTotal);
  document.getElementById(`alerta_${apId}`).className = `alerta-fila ${alertaClass(alerta.level)}`;
  document.getElementById(`alerta_${apId}`).textContent = alerta.label;
  document.getElementById(`faltas_${apId}`).textContent = faltasTotal;
  document.getElementById(`faltas_${apId}`).style.color =
    faltasTotal>=2?'var(--danger)':faltasTotal>=1?'var(--warning)':'var(--muted)';
}

function marcarTodos(marca) {
  (group.aprendices || []).filter(a => a.estado === 'EN FORMACION').forEach(a => {
    sesionActiva.marcas[a.id] = marca;
  });
  renderTablaSesionActiva();
}

function alertaClass(level) {
  return level==='danger'?'alerta-deser':level==='warn'?'alerta-llamado':'alerta-ok';
}

/* ── GUARDAR SESIÓN ───────────────────── */
function guardarSesion() {
  const db = getDB();
  const g = db.groups[groupId];
  if (!g.sesiones) g.sesiones = [];

  // Guardar sesión
  g.sesiones.push({ ...sesionActiva });

  // Actualizar asistencia en aprendices
  g.aprendices.forEach(a => {
    if (!a.asistencia) a.asistencia = {};
    if (sesionActiva.marcas[a.id] !== undefined) {
      a.asistencia[sesionActiva.id] = sesionActiva.marcas[a.id];
    }
  });

  saveDB(db);
  group = getGroup(groupId);
}

function guardarYCerrar() {
  guardarSesion();
  cerrarSesion();
  switchTab('historial');
  renderHistorial();
  renderResumen();
}

function cerrarSesion() {
  sesionActiva = null;
  document.getElementById('sesionActivaBanner').style.display = 'none';
  document.getElementById('panelNuevaSesion').style.display = 'block';
  document.getElementById('tablaAsistenciaWrap').style.display = 'none';
  document.getElementById('sTema').value = '';
  group = getGroup(groupId);
}

function exportarSesion() {
  if (!sesionActiva) return;
  guardarSesion();
  exportarSesionExcel(sesionActiva);
}

/* ── HISTORIAL ────────────────────────── */
function renderHistorial() {
  const list = document.getElementById('sesionesList');
  const empty = document.getElementById('emptyHistorial');
  const total = document.getElementById('totalSesiones');
  const ses = group.sesiones || [];

  total.textContent = `${ses.length} sesión${ses.length!==1?'es':''}`;
  list.innerHTML = '';

  if (!ses.length) { empty.style.display='block'; return; }
  empty.style.display = 'none';

  [...ses].reverse().forEach(s => {
    const ap = group.aprendices || [];
    const o = ap.filter(a => s.marcas[a.id]==='O').length;
    const x = ap.filter(a => s.marcas[a.id]==='X').length;
    const e = ap.filter(a => s.marcas[a.id]==='E').length;
    const t = ap.filter(a => s.marcas[a.id]==='T').length;

    const item = document.createElement('div');
    item.className = 'sesion-item';
    item.innerHTML = `
      <div class="sesion-item-info">
        <div class="sesion-item-num">Sesión ${s.num}</div>
        <div class="sesion-item-fecha">${s.dia} ${formatFecha(s.fecha)}</div>
        <div class="sesion-item-hora">${s.horaInicio} – ${s.horaFin} · ${s.tema}</div>
      </div>
      <div class="sesion-item-stats">
        <span class="chip chip-o">O ${o}</span>
        <span class="chip chip-x">X ${x}</span>
        ${e?`<span class="chip chip-e">E ${e}</span>`:''}
        ${t?`<span class="chip chip-t">T ${t}</span>`:''}
        <button class="btn-tool" style="font-size:11px;padding:4px 10px" onclick="editarSesion('${s.id}',event)">Editar</button>
      </div>`;
    list.appendChild(item);
  });
}

/* ── EDITAR SESIÓN MODAL ──────────────── */
function editarSesion(sesionId, e) {
  e.stopPropagation();
  const s = (group.sesiones||[]).find(x => x.id === sesionId);
  if (!s) return;
  sesionEditModal = { ...s, marcas: { ...s.marcas } };

  document.getElementById('modalSesionTitulo').textContent =
    `Sesión ${s.num} — ${s.dia} ${formatFecha(s.fecha)} · ${s.horaInicio}–${s.horaFin}`;

  const tbody = document.getElementById('modalTbody');
  tbody.innerHTML = '';
  const ap = (group.aprendices||[]).filter(a => a.estado==='EN FORMACION');
  ap.forEach((a, i) => {
    const marca = sesionEditModal.marcas[a.id] || '';
    const faltas = contarFaltasSinSesion(a, sesionId) + (marca==='X'?1:0);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="left" style="color:var(--muted)">${i+1}</td>
      <td class="left">${a.apellidos} ${a.nombres}</td>
      <td class="celda-marca" id="mcelda_${a.id}">
        <button class="marca-btn ${marca}" onclick="ciclarMarcaModal('${sesionId}','${a.id}')">${marca||'—'}</button>
      </td>
      <td style="font-weight:700;color:${faltas>=2?'var(--danger)':faltas>=1?'var(--warning)':'var(--muted)'}" id="mfaltas_${a.id}">${faltas}</td>`;
    tbody.appendChild(tr);
  });
  document.getElementById('modalSesion').style.display = 'flex';
}

function ciclarMarcaModal(sesionId, apId) {
  const actual = sesionEditModal.marcas[apId] || '';
  const idx = CICLO.indexOf(actual);
  const siguiente = CICLO[(idx + 1) % CICLO.length];
  sesionEditModal.marcas[apId] = siguiente;

  const celda = document.getElementById(`mcelda_${apId}`);
  const btn = celda.querySelector('.marca-btn');
  btn.className = `marca-btn ${siguiente}`;
  btn.textContent = siguiente || '—';
}

function guardarEdicionModal() {
  if (!sesionEditModal) return;
  const db = getDB();
  const g = db.groups[groupId];
  const idx = g.sesiones.findIndex(s => s.id === sesionEditModal.id);
  if (idx >= 0) {
    g.sesiones[idx].marcas = sesionEditModal.marcas;
    // Actualizar asistencia en aprendices
    g.aprendices.forEach(a => {
      if (!a.asistencia) a.asistencia = {};
      if (sesionEditModal.marcas[a.id] !== undefined)
        a.asistencia[sesionEditModal.id] = sesionEditModal.marcas[a.id];
    });
  }
  saveDB(db);
  group = getGroup(groupId);
  closeModal('modalSesion');
  renderHistorial();
  renderResumen();
}

/* ── RESUMEN GENERAL ──────────────────── */
function renderResumen() {
  const ses  = group.sesiones || [];
  const ap   = (group.aprendices||[]).filter(a => a.estado==='EN FORMACION');
  const head = document.getElementById('tablaResumenHead');
  const body = document.getElementById('tablaResumenBody');

  // Headers
  const sesHdrs = ses.map(s =>
    `<th style="min-width:52px;font-size:10px">S${s.num}<br><span style="font-weight:400;font-size:9px">${s.fecha?.slice(5)||''}</span></th>`
  ).join('');
  head.innerHTML = `<tr>
    <th class="left" style="width:28px">N°</th>
    <th class="left">Aprendiz</th>
    ${sesHdrs}
    <th>Asist.</th><th>Faltas</th><th>Excusas</th><th>% Asist.</th><th>Alerta</th>
  </tr>`;

  body.innerHTML = '';
  ap.forEach((a, i) => {
    const celdas = ses.map(s => {
      const m = s.marcas?.[a.id] || '';
      const cl = m==='O'?'chip-o':m==='X'?'chip-x':m==='E'?'chip-e':m==='T'?'chip-t':'';
      return `<td><span class="chip ${cl}" style="font-size:11px">${m||'·'}</span></td>`;
    }).join('');

    const o = ses.filter(s=>s.marcas?.[a.id]==='O').length;
    const x = ses.filter(s=>s.marcas?.[a.id]==='X').length;
    const e = ses.filter(s=>s.marcas?.[a.id]==='E').length;
    const pct = ses.length ? Math.round((o/ses.length)*100) : 0;
    const alerta = getAlerta(x);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="left" style="color:var(--muted)">${i+1}</td>
      <td class="left" style="font-weight:500;white-space:nowrap">${a.apellidos} ${a.nombres}</td>
      ${celdas}
      <td><span class="chip chip-o">${o}</span></td>
      <td><span class="chip chip-x" style="${x>=2?'font-size:12px;padding:3px 8px':''}">${x}</span></td>
      <td><span class="chip chip-e">${e}</span></td>
      <td style="font-weight:600;color:${pct<70?'var(--danger)':pct<85?'var(--warning)':'var(--success)'}">${pct}%</td>
      <td><span class="alerta-fila ${alertaClass(alerta.level)}">${alerta.label}</span></td>`;
    body.appendChild(tr);
  });
}

/* ── EXPORTAR ─────────────────────────── */
function exportarSesionExcel(s) {
  const wb = XLSX.utils.book_new();
  const ap = (group.aprendices||[]).filter(a => a.estado==='EN FORMACION');
  const rows = [
    [`LISTA DE ASISTENCIA — ${group.nombre}`],
    [`Ficha: ${group.ficha} · Competencia: ${group.competencia}`],
    [`Instructor: ${group.instructor} · Centro: ${group.centro}`],
    [`Sesión N° ${s.num} · ${s.dia} ${formatFecha(s.fecha)} · ${s.horaInicio} – ${s.horaFin}`],
    [s.tema],
    [],
    ['N°','TIPO DOC.','DOCUMENTO','APELLIDOS Y NOMBRES','ESTADO','ASISTENCIA'],
    ...ap.map((a,i) => [i+1, a.tipoDoc, a.documento, `${a.apellidos} ${a.nombres}`, a.estado, s.marcas[a.id]||''])
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{wch:4},{wch:8},{wch:14},{wch:32},{wch:16},{wch:10}];
  XLSX.utils.book_append_sheet(wb, ws, `Sesion ${s.num}`);
  XLSX.writeFile(wb, `Asistencia_S${s.num}_${group.nombre}_${s.fecha}.xlsx`);
}

function exportarResumenExcel() {
  const wb = XLSX.utils.book_new();
  const ap  = (group.aprendices||[]).filter(a => a.estado==='EN FORMACION');
  const ses = group.sesiones || [];
  const encabezado = [
    [`CONTROL DE ASISTENCIA — ${group.nombre}`],
    [`Ficha: ${group.ficha} · Programa: ${group.programa}`],
    [`Instructor: ${group.instructor} · Regional: ${group.regional} · Centro: ${group.centro}`],
    [],
    ['N°','APELLIDOS Y NOMBRES','DOCUMENTO',
     ...ses.map(s=>`S${s.num}\n${s.fecha?.slice(5)||''}`),
     'ASIST.','FALTAS','EXCUSAS','% ASIST.','ALERTA']
  ];
  const filas = ap.map((a,i) => {
    const o = ses.filter(s=>s.marcas?.[a.id]==='O').length;
    const x = ses.filter(s=>s.marcas?.[a.id]==='X').length;
    const e = ses.filter(s=>s.marcas?.[a.id]==='E').length;
    const pct = ses.length ? (o/ses.length) : 0;
    return [i+1, `${a.apellidos} ${a.nombres}`, a.documento,
      ...ses.map(s=>s.marcas?.[a.id]||''),
      o, x, e, Math.round(pct*100)+'%', getAlerta(x).label];
  });
  const ws = XLSX.utils.aoa_to_sheet([...encabezado, ...filas]);
  ws['!cols'] = [{wch:4},{wch:30},{wch:14},...ses.map(()=>({wch:8})),{wch:8},{wch:8},{wch:8},{wch:8},{wch:22}];
  XLSX.utils.book_append_sheet(wb, ws, 'ASISTENCIA');
  const fecha = new Date().toISOString().slice(0,10);
  XLSX.writeFile(wb, `Resumen_Asistencia_${group.nombre}_${fecha}.xlsx`);
}

/* ── HELPERS ──────────────────────────── */
function contarFaltas(aprendiz) {
  return Object.values(aprendiz.asistencia||{}).filter(v=>v==='X').length;
}

function contarFaltasSinSesion(aprendiz, sesionId) {
  const asi = aprendiz.asistencia || {};
  return Object.entries(asi).filter(([k,v]) => k !== sesionId && v==='X').length;
}

function formatFecha(iso) {
  if (!iso) return '';
  const [y,m,d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach((b,i) => {
    b.classList.toggle('active', ['registrar','historial','resumen'][i]===tab);
  });
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('show'));
  document.getElementById(`tab-${tab}`).classList.add('show');
  if (tab==='historial') renderHistorial();
  if (tab==='resumen')   renderResumen();
}

function closeModal(id) {
  document.getElementById(id).style.display = 'none';
}

init();
