/* grupo.js */

let groupId = null;
let group = null;

function init() {
  groupId = getGroupIdFromURL();
  if (!groupId) { window.location.href = 'index.html'; return; }
  group = getGroup(groupId);
  if (!group) { window.location.href = 'index.html'; return; }
  renderHeader();
  renderStats();
  renderAprendices();
  bindActions();
}

function renderHeader() {
  document.getElementById('groupBreadcrumb').textContent =
    `${group.year} · ${group.trimestre} Trimestre`;
  document.getElementById('groupName').textContent = group.nombre || group.grupo;
  const tags = document.getElementById('groupTags');
  tags.innerHTML = `
    <span class="tag tag-blue">Ficha ${group.ficha}</span>
    <span class="tag tag-blue">${group.instructor}</span>
    <span class="tag tag-blue">${group.programa ? group.programa.slice(0,30)+'…' : ''}</span>`;
  document.title = `${group.nombre || group.grupo} — Ecosistema`;
}

function renderStats() {
  const ap = group.aprendices || [];
  const activos = ap.filter(a => a.estado === 'EN FORMACION').length;
  const alertas = ap.filter(a => contarFaltas(a) >= 2).length;
  document.getElementById('statTotal').textContent = ap.length;
  document.getElementById('statActivos').textContent = activos;
  document.getElementById('statAlertas').textContent = alertas;
  document.getElementById('statSesiones').textContent = (group.sesiones || []).length;
}

function contarFaltas(aprendiz) {
  if (!aprendiz.asistencia) return 0;
  return Object.values(aprendiz.asistencia).filter(v => v === 'X').length;
}

function renderAprendices() {
  const tbody = document.getElementById('aprendicesTbody');
  tbody.innerHTML = '';
  const ap = group.aprendices || [];
  if (!ap.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:24px">Sin aprendices registrados</td></tr>';
    return;
  }
  ap.forEach((a, i) => {
    const faltas = contarFaltas(a);
    const alerta = getAlerta(faltas);
    const estadoBadge = {
      'EN FORMACION':    'badge-activo',
      'RETIRO VOLUNTARIO':'badge-retiro',
      'CANCELADO':       'badge-cancel',
      'APLAZADO':        'badge-retiro',
    }[a.estado] || 'badge-retiro';
    const faltasClass = faltas >= 3 ? 'danger' : faltas >= 2 ? 'warn' : '';
    const alertaBadge = alerta.level === 'danger' ? 'badge-alerta' :
                        alerta.level === 'warn'   ? 'badge-alerta' : 'badge-ok';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${a.apellidos || ''} ${a.nombres || ''}</td>
      <td><small style="color:var(--muted)">${a.tipoDoc}</small> ${a.documento}</td>
      <td><span class="badge ${estadoBadge}">${a.estado}</span></td>
      <td><span class="faltas-num ${faltasClass}">${faltas}</span></td>
      <td><span class="badge ${alertaBadge}">${alerta.label}</span></td>`;
    tbody.appendChild(tr);
  });
}

function bindActions() {
  document.getElementById('btnAddAprendiz').onclick = () => {
    document.getElementById('modalAprendiz').style.display = 'flex';
  };
  document.getElementById('btnGuardarAprendiz').onclick = guardarAprendiz;
  document.getElementById('btnGenerarExcel').onclick = () => {
    generarExcelCompleto(group);
  };
  document.getElementById('btnEditGroup').onclick = () => {
    window.location.href = `nuevo-grupo.html?edit=${groupId}`;
  };
}

function guardarAprendiz() {
  const a = {
    id: 'a_' + Date.now(),
    tipoDoc:   document.getElementById('mTipoDoc').value,
    documento: document.getElementById('mDocumento').value.trim(),
    nombres:   document.getElementById('mNombres').value.trim().toUpperCase(),
    apellidos: document.getElementById('mApellidos').value.trim().toUpperCase(),
    estado:    document.getElementById('mEstado').value,
    faltas: 0,
    asistencia: {}
  };
  if (!a.documento && !a.nombres) return;
  const db = getDB();
  if (!db.groups[groupId].aprendices) db.groups[groupId].aprendices = [];
  db.groups[groupId].aprendices.push(a);
  saveDB(db);
  group = getGroup(groupId);
  closeModal('modalAprendiz');
  renderStats();
  renderAprendices();
  document.getElementById('mDocumento').value = '';
  document.getElementById('mNombres').value = '';
  document.getElementById('mApellidos').value = '';
}

function closeModal(id) {
  document.getElementById(id).style.display = 'none';
}

function openTool(tool) {
  alert(`Herramienta "${tool}" — próximamente en esta versión.\nPor ahora usa "Generar Excel" para obtener el archivo completo.`);
}

init();
