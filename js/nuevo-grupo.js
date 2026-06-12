/* nuevo-grupo.js */
const params = new URLSearchParams(window.location.search);
let aprendicesImportados = [];
let competenciasData = {};  // { codigo: { nombre, ras: [{codigo,nombre}] } }
let numTrim = 1;

/* ── INIT ─────────────────────────────── */
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
    e.preventDefault(); zone.classList.remove('drag');
    if (e.dataTransfer.files[0]) procesarReporte(e.dataTransfer.files[0]);
  });

  // Horarios personalizados
  document.getElementById('fHorario1').onchange = function() {
    document.getElementById('fHorario1Custom').style.display = this.value === 'PERSONALIZADO' ? 'block' : 'none';
  };
  document.getElementById('fHorario2').onchange = function() {
    document.getElementById('fHorario2Custom').style.display = this.value === 'PERSONALIZADO' ? 'block' : 'none';
  };
}

/* ── SELECCIÓN TRIMESTRES ─────────────── */
function selTrim(n) {
  numTrim = n;
  document.getElementById('fNumTrim').value = n;
  document.getElementById('opt1trim').classList.toggle('active', n === 1);
  document.getElementById('opt2trim').classList.toggle('active', n === 2);
  document.getElementById('wHorario2').style.display = n === 2 ? 'block' : 'none';
}

/* ── LEER HORARIO FINAL ───────────────── */
function getHorario(num) {
  const sel = document.getElementById(`fHorario${num}`).value;
  if (sel === 'PERSONALIZADO') return document.getElementById(`fHorario${num}Custom`).value.trim().toUpperCase();
  return sel;
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
        // Ficha: buscar exactamente "Ficha de Caracterización:"
        if (key.toLowerCase().includes('ficha de caract')) meta.ficha = val;
        if (key.toLowerCase().includes('ógigo') || key.toLowerCase().includes('ódigo')) meta.codigo = val;
        if (key.toLowerCase().includes('denominaci')) meta.nombre = val;
        if (key.toLowerCase().includes('regional')) meta.regional = limpiarRegional(val);
        if (key.toLowerCase().includes('centro de f')) meta.centro = limpiarCentro(val);
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

        // Aprendiz único
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
          const partes = comp.match(/^(\d+)\s*[-–]\s*(.+)$/);
          const codComp = partes ? partes[1] : comp.slice(0,8);
          const nomComp = partes ? partes[2].trim() : comp;
          if (!compMap[codComp]) compMap[codComp] = { codigo: codComp, nombre: nomComp, ras: {} };
          if (ra && ra !== 'nan') {
            const partesRA = ra.match(/^(\d+)\s*[-–]\s*(.+)$/s);
            const codRA = partesRA ? partesRA[1] : ra.slice(0,8);
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
      zone.querySelector('.upload-sub').textContent = `${aprendices.length} aprendices EN FORMACIÓN · ${Object.keys(compMap).length} competencias`;

    } catch(err) {
      console.error(err);
      alert('Error al leer el archivo. Verifica que sea el Reporte de Juicios Evaluativos de Sofía Plus.');
    }
  };
  reader.readAsArrayBuffer(file);
}

/* ── AUTO-RELLENAR ────────────────────── */
function autoRellenar(meta) {
  if (meta.ficha)    setField('fFicha', meta.ficha, 'wFicha');
  if (meta.codigo && meta.nombre)
    setField('fPrograma', `${meta.codigo} — ${meta.nombre}`, 'wPrograma');
  if (meta.regional) setField('fRegional', meta.regional);
  if (meta.centro)   setField('fCentro', meta.centro, 'wCentro');
  document.getElementById('autoBadge').style.display  = 'inline-block';
  document.getElementById('autoBadge2').style.display = 'inline-block';
}

function setField(id, val, wrapId) {
  const el = document.getElementById(id);
  if (el) {
    el.value = val;
    if (wrapId) document.getElementById(wrapId)?.classList.add('field-filled');
  }
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
  const comps = Object.values(compMap);

  // Filtrar competencias técnicas (excluir transversales comunes)
  const excluir = ['36180','36182','37371','37714','37799','37800','37801','2 -'];
  const tecnicas = comps.filter(c => !excluir.some(x => c.codigo.startsWith(x.split(' ')[0]) || c.nombre.startsWith(x)));
  const todas = [...tecnicas, ...comps.filter(c => !tecnicas.includes(c))];

  todas.forEach((comp, idx) => {
    const item = document.createElement('div');
    item.className = 'comp-item' + (idx === 0 && tecnicas.length > 0 ? ' selected' : '');
    item.innerHTML = `
      <div>
        <div class="comp-item-code">${comp.codigo}</div>
        <div class="comp-item-name">${comp.nombre.slice(0,120)}${comp.nombre.length>120?'…':''}</div>
      </div>`;
    item.onclick = () => seleccionarComp(comp, item);
    list.appendChild(item);
  });

  // Seleccionar primera técnica por defecto
  if (tecnicas.length > 0) seleccionarComp(tecnicas[0], list.children[0]);
  document.getElementById('seccionCompetencia').style.display = 'block';
}

function seleccionarComp(comp, el) {
  document.querySelectorAll('.comp-item').forEach(i => i.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('fCompetencia').value = `${comp.codigo} — ${comp.nombre}`;

  const raItems = document.getElementById('raItems');
  const ras = Object.values(comp.ras);
  raItems.innerHTML = ras.map(r =>
    `<div class="ra-item"><strong>${r.codigo}</strong> — ${r.nombre.slice(0,120)}${r.nombre.length>120?'…':''}</div>`
  ).join('');
  document.getElementById('raList').classList.add('show');

  // Poner primer RA en el campo
  if (ras.length > 0) {
    document.getElementById('fRA').value = `${ras[0].codigo} — ${ras[0].nombre}`;
  }
}

/* ── MOSTRAR RESULTADO ────────────────── */
function mostrarResultado(aprendices, totalFilas, filtrados, fileName) {
  const result = document.getElementById('importResult');
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
  let html = `<table><thead><tr><th>N°</th><th>Tipo</th><th>Documento</th><th>Nombres</th><th>Apellidos</th></tr></thead><tbody>`;
  p8.forEach((a, i) => {
    html += `<tr><td>${i+1}</td><td>${a.tipoDoc}</td><td>${a.documento}</td><td>${a.nombres}</td><td>${a.apellidos}</td></tr>`;
  });
  if (resto > 0) {
    html += `<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:10px">+ ${resto} aprendices más incluidos</td></tr>`;
  }
  html += '</tbody></table>';
  preview.innerHTML = html;
  result.classList.add('show');
}

/* ── GENERAR LISTA DE ASISTENCIA ──────── */
function generarListaAsistencia(group) {
  const wb = XLSX.utils.book_new();
  const ws = {};
  const ap = group.aprendices || [];
  const h1 = group.horario1 || '';
  const h2 = group.horario2 || '';

  // Encabezado
  const enc = [
    [`LISTA DE CONTROL DE ASISTENCIA — ${group.nombre}`],
    [`${group.programa}`],
    [`Ficha: ${group.ficha}   |   Competencia: ${group.competencia}`],
    [`Instructor: ${group.instructor}   |   Centro: ${group.centro}   |   Regional: ${group.regional}`],
    [h2 ? `Horario T1: ${h1}   |   Horario T2: ${h2}` : `Horario: ${h1}`],
    [],
    ['N°', 'TIPO DOC.', 'DOCUMENTO', 'APELLIDOS Y NOMBRES', 'ESTADO',
     'S1','S2','S3','S4','S5','S6','S7','S8','S9','S10','S11',
     ...(h2 ? ['S12','S13','S14','S15','S16','S17','S18','S19','S20','S21','S22'] : []),
     'TOTAL ASIST.', 'FALTAS', '% ASIST.'
    ]
  ];

  XLSX.utils.sheet_add_aoa(ws, enc, { origin: 'A1' });

  ap.forEach((a, i) => {
    const row = [
      i + 1,
      a.tipoDoc,
      a.documento,
      `${a.apellidos} ${a.nombres}`.trim(),
      a.estado,
      ...Array(11).fill(''),
      ...(h2 ? Array(11).fill('') : []),
      '', '', ''
    ];
    XLSX.utils.sheet_add_aoa(ws, [row], { origin: `A${8 + i}` });
  });

  const totalSes = h2 ? 22 : 11;
  const lastRow = 8 + ap.length - 1;
  // Formulas de conteo
  ap.forEach((a, i) => {
    const r = 8 + i;
    const startCol = 'F';
    const endColIdx = 5 + totalSes;
    const endCol = colLetter(endColIdx);
    const asistCell = colLetter(endColIdx + 1) + r;
    const faltCell  = colLetter(endColIdx + 2) + r;
    const pctCell   = colLetter(endColIdx + 3) + r;
    ws[asistCell] = { f: `COUNTIF(${startCol}${r}:${endCol}${r},"O")` };
    ws[faltCell]  = { f: `COUNTIF(${startCol}${r}:${endCol}${r},"X")` };
    ws[pctCell]   = { f: `IF(${asistCell}+${faltCell}=0,"",${asistCell}/(${asistCell}+${faltCell}))` };
  });

  ws['!cols'] = [
    {wch:4},{wch:8},{wch:14},{wch:30},{wch:16},
    ...Array(totalSes).fill({wch:5}),
    {wch:10},{wch:8},{wch:8}
  ];
  ws['!ref'] = `A1:${colLetter(5+totalSes+3)}${8+ap.length+2}`;
  XLSX.utils.book_append_sheet(wb, ws, 'ASISTENCIA');

  const fecha = new Date().toISOString().slice(0,10);
  XLSX.writeFile(wb, `Lista_Asistencia_${group.nombre}_${group.ficha}_${fecha}.xlsx`);
}

function colLetter(n) {
  let s = '';
  while (n > 0) { const r = (n-1)%26; s = String.fromCharCode(65+r)+s; n = Math.floor((n-1)/26); }
  return s;
}

/* ── SUBMIT ───────────────────────────── */
document.getElementById('formNuevoGrupo').onsubmit = (e) => {
  e.preventDefault();
  if (!aprendicesImportados.length) {
    if (!confirm('No importaste el reporte de Sofía. ¿Crear grupo sin aprendices?')) return;
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
    ra:          document.getElementById('fRA').value.trim().toUpperCase(),
    instructor:  document.getElementById('fInstructor').value.trim().toUpperCase(),
    regional:    document.getElementById('fRegional').value.trim().toUpperCase(),
    centro:      document.getElementById('fCentro').value.trim().toUpperCase(),
    horario1:    getHorario(1),
    horario2:    parseInt(document.getElementById('fNumTrim').value) === 2 ? getHorario(2) : '',
    aprendices:  aprendicesImportados,
    sesiones:    []
  };

  const id = saveGroup(group);

  // Generar lista de asistencia automáticamente
  if (aprendicesImportados.length > 0) {
    setTimeout(() => generarListaAsistencia(group), 400);
  }

  window.location.href = `grupo.html?id=${id}`;
};

init();
