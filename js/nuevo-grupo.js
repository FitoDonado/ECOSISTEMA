/* nuevo-grupo.js — versión corregida */
const params = new URLSearchParams(window.location.search);
let aprendicesImportados = [];
let competenciasData = {};
let numTrim = 1;

/* ── INIT ─────────────────────────────── */
function init() {
  // Años: actuales guardados + año actual + 5 futuros
  const sel = document.getElementById('fAno');
  const currentYear = new Date().getFullYear();
  const savedYears = getYears().map(Number);
  const allYears = new Set(savedYears);
  for (let y = currentYear; y <= currentYear + 5; y++) allYears.add(y);
  Array.from(allYears).sort((a,b) => a-b).forEach(y => {
    const opt = document.createElement('option');
    opt.value = y; opt.textContent = y;
    sel.appendChild(opt);
  });
  sel.value = params.get('year') || currentYear;

  const pt = params.get('trim');
  if (pt) document.getElementById('fTrimestre').value = pt;

  // Horas en ambos selectores
  buildHoras('fHoraI1', 'fHoraF1', '06:30', '11:30');
  buildHoras('fHoraI2', 'fHoraF2', '06:30', '11:30');

  // Drag & drop
  const zone = document.getElementById('uploadZone');
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('drag');
    if (e.dataTransfer.files[0]) procesarReporte(e.dataTransfer.files[0]);
  });
}

/* ── HORAS: 00:00 a 24:00 cada 30 min ── */
function buildHoras(idInicio, idFin, defI, defF) {
  const horas = [];
  for (let h = 0; h <= 23; h++) {
    horas.push(`${String(h).padStart(2,'0')}:00`);
    horas.push(`${String(h).padStart(2,'0')}:30`);
  }
  horas.push('24:00');

  const selI = document.getElementById(idInicio);
  const selF = document.getElementById(idFin);
  horas.forEach(h => {
    selI.add(new Option(h, h));
    selF.add(new Option(h, h));
  });
  selI.value = defI;
  selF.value = defF;

  // Al cambiar inicio, no forzar fin — el usuario elige libremente
  selI.onchange = () => {
    // Solo asegurar que fin sea después de inicio si fin es menor
    if (selF.value <= selI.value) {
      const idx = horas.indexOf(selI.value);
      selF.value = horas[Math.min(idx + 8, horas.length - 1)]; // +4h por defecto
    }
  };
}

/* ── SELECCIÓN TRIMESTRES ─────────────── */
function selTrim(n) {
  numTrim = n;
  document.getElementById('fNumTrim').value = n;
  document.getElementById('opt1trim').classList.toggle('active', n === 1);
  document.getElementById('opt2trim').classList.toggle('active', n === 2);
  document.getElementById('bloqueHorario2').style.display = n === 2 ? 'block' : 'none';
}

/* ── LEER HORARIO FINAL ───────────────── */
function getHorario(num) {
  const dia  = document.getElementById(`fDia${num}`).value;
  const ini  = document.getElementById(`fHoraI${num}`).value;
  const fin  = document.getElementById(`fHoraF${num}`).value;
  if (!dia) return '';
  return `${dia.toUpperCase()} ${ini} - ${fin}`;
}

/* ── PROCESADOR DEL REPORTE SOFÍA ─────── */
function procesarReporte(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, { type: 'array', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

      // ── Metadatos del encabezado ──
      const meta = {};
      rows.slice(0, 13).forEach(row => {
        const key = String(row[0] || '').trim();
        const val = String(row[2] || '').trim();
        const keyLow = key.toLowerCase();
        // Ficha: solo fila exacta "Ficha de Caracterización:" con valor numérico
        if (keyLow === 'ficha de caracterización:' || keyLow === 'ficha de caracterizacion:') {
          if (/^\d+$/.test(val)) meta.ficha = val;
        }
        if (keyLow === 'cógigo:' || keyLow === 'código:' || keyLow.includes('ógigo') || keyLow.includes('ódigo')) meta.codigo = val;
        if (keyLow.includes('denominaci')) meta.nombre = val;
        if (keyLow.startsWith('regional')) meta.regional = limpiarRegional(val);
        if (keyLow.startsWith('centro de f')) meta.centro = limpiarCentro(val);
      });

      // ── Encontrar fila de headers ──
      let headerRow = -1;
      for (let i = 0; i < rows.length; i++) {
        if (String(rows[i][0] || '').toLowerCase().includes('tipo')) { headerRow = i; break; }
      }
      if (headerRow < 0) { alert('No se encontró la estructura del reporte.'); return; }

      // ── Leer aprendices + competencias ──
      const vistos = new Set();
      const aprendices = [];
      const compMap = {};
      let totalFilas = 0, filtrados = 0;

      for (let i = headerRow + 1; i < rows.length; i++) {
        const row = rows[i];
        const tipo    = String(row[0] || '').trim();
        const doc     = String(row[1] || '').trim();
        const nombres = String(row[2] || '').trim().toUpperCase();
        const apells  = String(row[3] || '').trim().toUpperCase();
        const estado  = String(row[4] || '').trim().toUpperCase();
        const comp    = String(row[5] || '').trim();
        const ra      = String(row[6] || '').trim();

        if (!doc || !nombres) continue;
        totalFilas++;
        if (estado !== 'EN FORMACION') { filtrados++; continue; }

        // Aprendiz único — guardar tipo de documento
        if (!vistos.has(doc)) {
          vistos.add(doc);
          aprendices.push({
            id: 'a_' + Date.now() + '_' + Math.random().toString(36).slice(2,5),
            tipoDoc: tipo || 'TI',
            documento: doc,
            nombres,
            apellidos: apells,
            estado: 'EN FORMACION',
            faltas: 0,
            asistencia: {}
          });
        }

        // Competencias y RAs
        if (comp && comp !== 'nan') {
          const partes = comp.match(/^(\d+)\s*[-–]\s*(.+)$/s);
          const codComp = partes ? partes[1] : comp.slice(0,10);
          const nomComp = partes ? partes[2].trim() : comp;
          if (!compMap[codComp]) compMap[codComp] = { codigo: codComp, nombre: nomComp, ras: {} };
          if (ra && ra !== 'nan') {
            const partesRA = ra.match(/^(\d+)\s*[-–]\s*(.+)$/s);
            const codRA = partesRA ? partesRA[1] : ra.slice(0,10);
            const nomRA = partesRA ? partesRA[2].trim().replace(/\s+/g,' ') : ra;
            compMap[codComp].ras[codRA] = { codigo: codRA, nombre: nomRA };
          }
        }
      }

      aprendicesImportados = aprendices;
      competenciasData = compMap;

      autoRellenar(meta);
      renderCompetencias(compMap);
      mostrarResultado(aprendices, totalFilas, filtrados, file.name);

      const zone = document.getElementById('uploadZone');
      zone.classList.add('loaded');
      zone.querySelector('.upload-icon').textContent = '✓';
      zone.querySelector('.upload-title').textContent = file.name;
      zone.querySelector('.upload-sub').textContent =
        `${aprendices.length} aprendices EN FORMACIÓN · ${Object.keys(compMap).length} competencias detectadas`;

    } catch(err) {
      console.error(err);
      alert('Error al leer el archivo. Verifica que sea el Reporte de Juicios Evaluativos de Sofía Plus.');
    }
  };
  reader.readAsArrayBuffer(file);
}

/* ── AUTO-RELLENAR ────────────────────── */
function autoRellenar(meta) {
  if (meta.ficha)  setField('fFicha', meta.ficha, 'wFicha');
  if (meta.codigo && meta.nombre)
    setField('fPrograma', `${meta.codigo} — ${meta.nombre}`, 'wPrograma');
  if (meta.regional) setField('fRegional', meta.regional);
  if (meta.centro)   setField('fCentro', meta.centro, 'wCentro');
  document.getElementById('autoBadge').style.display  = 'inline-block';
  document.getElementById('autoBadge2').style.display = 'inline-block';
}

function setField(id, val, wrapId) {
  const el = document.getElementById(id);
  if (el) { el.value = val; }
  if (wrapId) document.getElementById(wrapId)?.classList.add('field-filled');
}

function limpiarRegional(val) {
  return val.replace(/^\d+\s*[-–]\s*(REGIONAL\s*)?/i, '').trim();
}
function limpiarCentro(val) {
  return val.replace(/^\d+\s*[-–]\s*/i, '').trim();
}

/* ── RENDER COMPETENCIAS ──────────────── */
function renderCompetencias(compMap) {
  const list = document.getElementById('compList');
  list.innerHTML = '';

  // Separar técnicas de transversales
  const TRANSVERSALES = ['36180','36182','37371','37714','37799','37800','37801'];
  const comps = Object.values(compMap);
  const tecnicas = comps.filter(c => !TRANSVERSALES.some(t => c.codigo.startsWith(t)));
  const transv   = comps.filter(c =>  TRANSVERSALES.some(t => c.codigo.startsWith(t)));
  const ordenadas = [...tecnicas, ...transv];

  ordenadas.forEach((comp, idx) => {
    const isTrans = transv.includes(comp);
    const item = document.createElement('div');
    item.className = 'comp-item' + (idx === 0 ? ' selected' : '');
    item.dataset.cod = comp.codigo;
    item.innerHTML = `
      <div class="comp-item-code">${comp.codigo}</div>
      <div>
        <div class="comp-item-name">${comp.nombre.slice(0,120)}${comp.nombre.length>120?'…':''}</div>
        ${isTrans ? '<div style="font-size:10px;color:var(--muted);margin-top:2px">Competencia transversal</div>' : ''}
      </div>`;
    item.onclick = () => seleccionarComp(comp, item);
    list.appendChild(item);
  });

  // Seleccionar primera técnica por defecto
  if (ordenadas.length > 0) seleccionarComp(ordenadas[0], list.children[0]);
  document.getElementById('seccionCompetencia').style.display = 'block';
}

/* ── SELECCIONAR COMPETENCIA → mostrar RAs con checkboxes ── */
function seleccionarComp(comp, el) {
  document.querySelectorAll('.comp-item').forEach(i => i.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('fCompetencia').value = `${comp.codigo} — ${comp.nombre}`;

  const container = document.getElementById('raCheckItems');
  const ras = Object.values(comp.ras);
  container.innerHTML = '';

  if (!ras.length) {
    container.innerHTML = '<p style="font-size:12px;color:var(--muted)">No se encontraron resultados de aprendizaje para esta competencia.</p>';
  } else {
    ras.forEach((r, idx) => {
      const id = `ra_check_${r.codigo}`;
      const div = document.createElement('label');
      div.className = 'ra-check-item';
      div.htmlFor = id;
      div.innerHTML = `
        <input type="checkbox" id="${id}" value="${r.codigo}" data-nombre="${r.nombre.replace(/"/g,"'")}" ${idx === 0 ? 'checked' : ''}>
        <div class="ra-check-text">
          <div class="ra-check-code">${r.codigo}</div>
          ${r.nombre.slice(0,160)}${r.nombre.length>160?'…':''}
        </div>`;
      // Actualizar campo oculto al cambiar
      div.querySelector('input').onchange = actualizarRASeleccionados;
      container.appendChild(div);
    });
  }

  document.getElementById('raPanel').classList.add('show');
  actualizarRASeleccionados();
}

function actualizarRASeleccionados() {
  const checks = document.querySelectorAll('#raCheckItems input[type=checkbox]:checked');
  const seleccionados = Array.from(checks).map(c => `${c.value} — ${c.dataset.nombre}`);
  document.getElementById('fRA').value = seleccionados.join(' | ');
}

/* ── MOSTRAR RESULTADO IMPORTACIÓN ─────── */
function mostrarResultado(aprendices, totalFilas, filtrados, fileName) {
  const result  = document.getElementById('importResult');
  const summary = document.getElementById('importSummary');
  const preview = document.getElementById('apPreview');
  const dup = totalFilas - filtrados - aprendices.length;

  summary.innerHTML = `
    <span class="import-badge green">${aprendices.length} EN FORMACIÓN</span>
    <span class="import-badge warn">${filtrados} otros estados excluidos</span>
    <span class="import-badge blue">${dup} duplicados eliminados</span>
    <span style="font-size:11px;color:var(--muted);margin-left:auto">${fileName}</span>`;

  const p8 = aprendices.slice(0, 8);
  const resto = aprendices.length - p8.length;
  // Mostrar tipo doc + número juntos
  let html = `<table>
    <thead><tr><th>N°</th><th>Identificación</th><th>Nombres</th><th>Apellidos</th></tr></thead>
    <tbody>`;
  p8.forEach((a, i) => {
    html += `<tr>
      <td>${i+1}</td>
      <td><strong>${a.tipoDoc}</strong> ${a.documento}</td>
      <td>${a.nombres}</td>
      <td>${a.apellidos}</td>
    </tr>`;
  });
  if (resto > 0) {
    html += `<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:10px">+ ${resto} aprendices más incluidos</td></tr>`;
  }
  html += '</tbody></table>';
  preview.innerHTML = html;
  result.classList.add('show');
}

/* ── SUBMIT ───────────────────────────── */
document.getElementById('formNuevoGrupo').onsubmit = (e) => {
  e.preventDefault();

  if (!aprendicesImportados.length) {
    if (!confirm('No importaste el reporte de Sofía. ¿Crear grupo sin aprendices?')) return;
  }

  const rasSeleccionados = document.getElementById('fRA').value;
  if (document.getElementById('seccionCompetencia').style.display !== 'none' && !rasSeleccionados) {
    alert('Selecciona al menos un resultado de aprendizaje.');
    return;
  }

  const group = {
    year:        document.getElementById('fAno').value,
    trimestre:   document.getElementById('fTrimestre').value,
    numTrim:     parseInt(document.getElementById('fNumTrim').value),
    programa:    document.getElementById('fPrograma').value.trim().toUpperCase(),
    ficha:       document.getElementById('fFicha').value.trim(),
    grupo:       document.getElementById('fGrupo').value.trim().toUpperCase(),
    nombre:      document.getElementById('fGrupo').value.trim().toUpperCase(),
    competencia: document.getElementById('fCompetencia').value.trim().toUpperCase(),
    ra:          rasSeleccionados.toUpperCase(),
    instructor:  document.getElementById('fInstructor').value.trim().toUpperCase(),
    regional:    document.getElementById('fRegional').value.trim().toUpperCase(),
    centro:      document.getElementById('fCentro').value.trim().toUpperCase(),
    horario1:    getHorario(1),
    horario2:    parseInt(document.getElementById('fNumTrim').value) === 2 ? getHorario(2) : '',
    aprendices:  aprendicesImportados,
    sesiones:    []
  };

  const id = saveGroup(group);
  window.location.href = `grupo.html?id=${id}`;
};

init();
