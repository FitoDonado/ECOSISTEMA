/* storage.js — base de datos local del ecosistema */

const DB_KEY = 'ecosistema_formacion';

function getDB() {
  try {
    return JSON.parse(localStorage.getItem(DB_KEY)) || { years: {}, groups: {} };
  } catch { return { years: {}, groups: {} }; }
}

function saveDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

/* ── AÑOS ────────────────────────────── */
function getYears() {
  const db = getDB();
  return Object.keys(db.years).sort().reverse();
}

function addYear(year) {
  const db = getDB();
  if (!db.years[year]) db.years[year] = true;
  saveDB(db);
}

function ensureCurrentYear() {
  const y = new Date().getFullYear().toString();
  addYear(y);
  return y;
}

/* ── GRUPOS ──────────────────────────── */
function getGroups(year, trimestre) {
  const db = getDB();
  return Object.values(db.groups).filter(g => g.year === year && g.trimestre === trimestre);
}

function getGroup(id) {
  return getDB().groups[id] || null;
}

function saveGroup(group) {
  const db = getDB();
  if (!group.id) group.id = 'g_' + Date.now();
  if (!group.aprendices) group.aprendices = [];
  if (!group.sesiones) group.sesiones = [];
  if (!group.creado) group.creado = new Date().toISOString();
  db.groups[group.id] = group;
  addYear(group.year);
  saveDB(db);
  return group.id;
}

function deleteGroup(id) {
  const db = getDB();
  delete db.groups[id];
  saveDB(db);
}

/* ── APRENDICES ──────────────────────── */
function addAprendiz(groupId, aprendiz) {
  const db = getDB();
  const g = db.groups[groupId];
  if (!g) return;
  if (!g.aprendices) g.aprendices = [];
  aprendiz.id = 'a_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);
  aprendiz.faltas = 0;
  aprendiz.asistencia = {};
  g.aprendices.push(aprendiz);
  saveDB(db);
  return aprendiz.id;
}

function updateAprendiz(groupId, aprendizId, data) {
  const db = getDB();
  const g = db.groups[groupId];
  if (!g) return;
  const idx = g.aprendices.findIndex(a => a.id === aprendizId);
  if (idx >= 0) g.aprendices[idx] = { ...g.aprendices[idx], ...data };
  saveDB(db);
}

/* ── SESIONES ────────────────────────── */
function addSesion(groupId, sesion) {
  const db = getDB();
  const g = db.groups[groupId];
  if (!g) return;
  if (!g.sesiones) g.sesiones = [];
  sesion.id = 's_' + Date.now();
  g.sesiones.push(sesion);
  saveDB(db);
  return sesion.id;
}

/* ── CONTEO DE FALTAS ────────────────── */
function getFaltasTrimestre(group, trimNum) {
  if (!group.aprendices) return {};
  const result = {};
  group.aprendices.forEach(a => {
    let count = 0;
    if (a.asistencia) {
      Object.entries(a.asistencia).forEach(([sesId, val]) => {
        const ses = (group.sesiones || []).find(s => s.id === sesId);
        if (ses && ses.trimestre == trimNum && val === 'X') count++;
      });
    }
    result[a.id] = count;
  });
  return result;
}

/* ── ALERTAS ─────────────────────────── */
function getAlerta(faltas) {
  if (faltas >= 3) return { label: '⚠ REPORTAR DESERCIÓN', level: 'danger' };
  if (faltas >= 2) return { label: 'LLAMADO DE ATENCIÓN', level: 'warn' };
  return { label: '—', level: 'ok' };
}

/* ── GRUPO ID DESDE URL ──────────────── */
function getGroupIdFromURL() {
  return new URLSearchParams(window.location.search).get('id');
}
