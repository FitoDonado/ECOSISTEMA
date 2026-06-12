/* nuevo-grupo.js */

const params = new URLSearchParams(window.location.search);
let aprendicesImportados = [];

/* ── INIT ─────────────────────────────────── */
function init() {
  const years = getYears();
  const sel = document.getElementById('fAno');
  years.forEach(y => {
    const opt = document.createElement('option');
    opt.value = y; opt.textContent = y;
    sel.appendChild(opt);
  });
  const py = params.get('year');
  if (py) sel.value = py;
  const pt = params.get('trim');
  if (pt) document.getElementById('fTrimestre').value = pt;

  // Drag & drop
  const zone = document.getElementById('uploadZone');
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag');
    const f = e.dataTransfer.files[0];
    if (f) procesarReporte(f);
  });
}

/* ── PROCESADOR DEL REPORTE SOFÍA ─────────── */
function procesarReporte(file) {
  if (!file) return;
  const zone = document.getElementById('uploadZone');

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, { type: 'array', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

      // ── Extraer encabezado del programa (filas 0-11) ──
      const meta = {};
      rows.slice(0, 13).forEach(row => {
        const key = String(row[0] || '').trim();
        const val = String(row[2] || '').trim();
        if (key.includes('Ficha'))       meta.ficha      = val;
        if (key.includes('Cógigo') || key.includes('Código')) meta.codigo = val;
        if (key.includes('Denominaci'))  meta.nombre     = val;
        if (key.includes('Regional'))    meta.regional   = limpiarRegional(val);
        if (key.includes('Centro'))      meta.centro     = limpiarCentro(val);
      });

      // ── Encontrar fila de headers (contiene "Tipo de Documento") ──
      let headerRow = -1;
      for (let i = 0; i < rows.length; i++) {
        if (String(rows[i][0] || '').toLowerCase().includes('tipo')) {
          headerRow = i; break;
        }
      }
      if (headerRow < 0) { alert('No se encontró la estructura esperada del reporte.'); return; }

      // ── Leer aprendices: filtrar EN FORMACION + deduplicar ──
      const vistos = new Set();
      const aprendices = [];
      let totalFilas = 0;
      let filtradosEstado = 0;

      for (let i = headerRow + 1; i < rows.length; i++) {
        const row = rows[i];
        const tipo    = String(row[0] || '').trim();
        const doc     = String(row[1] || '').trim();
        const nombres = String(row[2] || '').trim().toUpperCase();
        const apells  = String(row[3] || '').trim().toUpperCase();
        const estado  = String(row[4] || '').trim().toUpperCase();

        if (!doc || !nombres) continue;
        totalFilas++;

        if (estado !== 'EN FORMACION') { filtradosEstado++; continue; }
        if (vistos.has(doc)) continue;

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

      aprendicesImportados = aprendices;

      // ── Auto-rellenar campos ──
      autoRellenar(meta);

      // ── Mostrar resultado ──
      mostrarResultado(aprendices, totalFilas, filtradosEstado, file.name);

      zone.classList.add('loaded');
      zone.querySelector('.upload-icon').textContent = '✓';
      zone.querySelector('.upload-title').textContent = file.name;
      zone.querySelector('.upload-sub').textContent = `${aprendices.length} aprendices EN FORMACIÓN importados`;

    } catch(err) {
      console.error(err);
      alert('Error al leer el archivo. Asegúrate de que sea el Reporte de Juicios Evaluativos de Sofía Plus.');
    }
  };
  reader.readAsArrayBuffer(file);
}

/* ── AUTO-RELLENAR CAMPOS ─────────────────── */
function autoRellenar(meta) {
  if (meta.ficha) {
    setField('fFicha', meta.ficha, 'fieldFicha');
  }
  if (meta.codigo && meta.nombre) {
    setField('fPrograma', `${meta.codigo} — ${meta.nombre}`, 'fieldPrograma');
  }
  if (meta.regional) {
    setField('fRegional', meta.regional, 'fieldRegional');
  }
  if (meta.centro) {
    setField('fCentro', meta.centro, 'fieldCentro');
  }
  document.getElementById('autoBadge').style.display = 'inline-block';
}

function setField(id, val, wrapId) {
  const el = document.getElementById(id);
  if (el && !el.value) {
    el.value = val;
    if (wrapId) document.getElementById(wrapId)?.classList.add('field-filled');
  }
}

/* ── LIMPIAR TEXTOS DE SOFÍA ──────────────── */
function limpiarRegional(val) {
  // "8 - REGIONAL ATLÁNTICO" → "ATLÁNTICO"
  return val.replace(/^\d+\s*-\s*(REGIONAL\s*)?/i, '').trim();
}

function limpiarCentro(val) {
  // "9207 - CENTRO NACIONAL COLOMBO ALEMAN" → "CENTRO NACIONAL COLOMBO ALEMÁN"
  return val.replace(/^\d+\s*-\s*/i, '').trim();
}

/* ── MOSTRAR RESULTADO DE IMPORTACIÓN ─────── */
function mostrarResultado(aprendices, totalFilas, filtrados, fileName) {
  const result = document.getElementById('importResult');
  const summary = document.getElementById('importSummary');
  const preview = document.getElementById('aprendizPreview');

  const retirados = filtrados;
  const duplicados = totalFilas - filtrados - aprendices.length;

  summary.innerHTML = `
    <span class="import-badge green">${aprendices.length} EN FORMACIÓN</span>
    <span class="import-badge warn">${retirados > 0 ? retirados + ' otros estados (excluidos)' : '0 excluidos'}</span>
    <span class="import-badge blue">${duplicados} filas duplicadas eliminadas</span>
    <span style="font-size:12px;color:var(--muted);margin-left:auto">${fileName}</span>
  `;

  // Tabla preview (máx 8 para no saturar)
  const preview8 = aprendices.slice(0, 8);
  const resto = aprendices.length - preview8.length;
  let html = `<table>
    <thead><tr><th>N°</th><th>Tipo</th><th>Documento</th><th>Nombres</th><th>Apellidos</th><th>Estado</th></tr></thead>
    <tbody>`;
  preview8.forEach((a, i) => {
    html += `<tr>
      <td>${i+1}</td>
      <td>${a.tipoDoc}</td>
      <td>${a.documento}</td>
      <td>${a.nombres}</td>
      <td>${a.apellidos}</td>
      <td><span class="badge badge-activo">EN FORMACIÓN</span></td>
    </tr>`;
  });
  if (resto > 0) {
    html += `<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:10px">
      + ${resto} aprendices más (se incluirán todos al crear el grupo)
    </td></tr>`;
  }
  html += '</tbody></table>';
  preview.innerHTML = html;
  result.classList.add('show');
}

/* ── SUBMIT ───────────────────────────────── */
document.getElementById('formNuevoGrupo').onsubmit = (e) => {
  e.preventDefault();

  if (!aprendicesImportados.length) {
    if (!confirm('No has importado el reporte de Sofía Plus. ¿Deseas crear el grupo sin aprendices?')) return;
  }

  const group = {
    year:        document.getElementById('fAno').value,
    trimestre:   document.getElementById('fTrimestre').value,
    programa:    document.getElementById('fPrograma').value.trim().toUpperCase(),
    ficha:       document.getElementById('fFicha').value.trim(),
    grupo:       document.getElementById('fGrupo').value.trim().toUpperCase(),
    nombre:      document.getElementById('fGrupo').value.trim().toUpperCase(),
    competencia: document.getElementById('fCompetencia').value.trim().toUpperCase(),
    ra:          document.getElementById('fRA').value.trim().toUpperCase(),
    instructor:  document.getElementById('fInstructor').value.trim().toUpperCase(),
    regional:    document.getElementById('fRegional').value.trim().toUpperCase(),
    centro:      document.getElementById('fCentro').value.trim().toUpperCase(),
    horario1:    document.getElementById('fHorario1').value.trim().toUpperCase(),
    horario2:    document.getElementById('fHorario2').value.trim().toUpperCase(),
    aprendices:  aprendicesImportados,
    sesiones:    []
  };

  const id = saveGroup(group);
  window.location.href = `grupo.html?id=${id}`;
};

init();
