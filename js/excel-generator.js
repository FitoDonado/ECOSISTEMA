/* excel-generator.js — genera el Excel completo con 9 hojas */

function generarExcelCompleto(group) {
  const wb = XLSX.utils.book_new();
  const ap = group.aprendices || [];
  const ses = group.sesiones || [];

  const enc = {
    programa:    group.programa    || '',
    ficha:       group.ficha       || '',
    grupo:       group.nombre || group.grupo || '',
    competencia: group.competencia || '',
    ra:          group.ra          || '',
    instructor:  group.instructor  || '',
    regional:    group.regional    || '',
    centro:      group.centro      || '',
    horario1:    group.horario1    || '',
    horario2:    group.horario2    || '',
  };

  sheetPlanTrabajo(wb, enc, ses);
  sheetAprendices(wb, enc, ap);
  sheetAsistencia(wb, enc, ap, ses);
  sheetEvidencias(wb, enc, ap, ses);
  sheetResumen(wb, enc, ap, ses);
  sheetRutaGFPI(wb, enc, ap, ses);
  sheetTabla12(wb);
  sheetInstrucciones(wb, enc);
  sheetCalcRuta(wb, ap, ses);

  const fecha = fmtHoy().replace(/\//g,'-');
  XLSX.writeFile(wb, `${enc.grupo}_${enc.ficha}_${fecha}.xlsx`);
}


/* ── Formato fecha DD/MM/AAAA ─── */
function fmtFecha(iso) {
  if (!iso) return '';
  if (iso.includes('/')) return iso; // ya formateada
  const [y,m,d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
function fmtHoy() {
  const h = new Date();
  return `${String(h.getDate()).padStart(2,'0')}/${String(h.getMonth()+1).padStart(2,'0')}/${h.getFullYear()}`;
}

/* ── Estilos helpers ─── */
const S = {
  titulo:    { font:{bold:true,sz:13}, alignment:{horizontal:'left'} },
  header:    { font:{bold:true,sz:11,color:{rgb:'FFFFFFFF'}}, fill:{fgColor:{rgb:'FF1A3C5E'}}, alignment:{horizontal:'center',wrapText:true}, border:bordes() },
  headerVerde:{ font:{bold:true,sz:11,color:{rgb:'FFFFFFFF'}}, fill:{fgColor:{rgb:'FF1E5631'}}, alignment:{horizontal:'center',wrapText:true}, border:bordes() },
  encabezado:{ font:{bold:true,sz:10}, alignment:{horizontal:'left'} },
  dato:      { font:{sz:10}, alignment:{horizontal:'left'}, border:bordes() },
  datoC:     { font:{sz:10}, alignment:{horizontal:'center'}, border:bordes() },
  asist_O:   { font:{sz:10,bold:true,color:{rgb:'FF1E5631'}}, fill:{fgColor:{rgb:'FFE8F5E9'}}, alignment:{horizontal:'center'}, border:bordes() },
  asist_X:   { font:{sz:10,bold:true,color:{rgb:'FFCC0000'}}, fill:{fgColor:{rgb:'FFFCE4EC'}}, alignment:{horizontal:'center'}, border:bordes() },
  asist_E:   { font:{sz:10,bold:true,color:{rgb:'FF1565C0'}}, fill:{fgColor:{rgb:'FFE3F2FD'}}, alignment:{horizontal:'center'}, border:bordes() },
  alert_des: { font:{bold:true,sz:9,color:{rgb:'FFCC0000'}}, fill:{fgColor:{rgb:'FFFCE4EC'}}, alignment:{horizontal:'center'}, border:bordes() },
  alert_mej: { font:{bold:true,sz:9,color:{rgb:'FFE65100'}}, fill:{fgColor:{rgb:'FFFFF3E0'}}, alignment:{horizontal:'center'}, border:bordes() },
  alert_ok:  { font:{sz:9}, fill:{fgColor:{rgb:'FFEFF}'}}, alignment:{horizontal:'center'}, border:bordes() },
  amarillo:  { fill:{fgColor:{rgb:'FFFFFF99'}}, font:{sz:10}, alignment:{horizontal:'left'}, border:bordes() },
  pct:       { font:{sz:10}, alignment:{horizontal:'center'}, numFmt:'0%', border:bordes() },
};

function bordes() {
  const b = {style:'thin',color:{rgb:'FFB0BEC5'}};
  return {top:b,bottom:b,left:b,right:b};
}

function encRow(enc, label1, val1, label2, val2) {
  return [{v:label1||'',t:'s',s:S.encabezado},{v:val1||'',t:'s',s:S.dato},{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'},{v:label2||'',t:'s',s:S.encabezado},{v:val2||'',t:'s',s:S.dato}];
}

function addEncabezado(ws, enc, titulo) {
  XLSX.utils.sheet_add_aoa(ws, [
    [{v:titulo,t:'s',s:S.titulo}],
    [{v:`GFPI-G-013 · Desarrollo de la Ruta de Aprendizaje · ${enc.centro} — Regional ${enc.regional}`,t:'s'}],
    encRow(enc,'PROGRAMA',enc.programa,'FICHA',enc.ficha),
    encRow(enc,'COMPETENCIA',enc.competencia,'GRUPO',enc.grupo),
    encRow(enc,'RESULTADO DE APRENDIZAJE',enc.ra,'INSTRUCTOR',enc.instructor),
    encRow(enc,'HORARIO TRIM. 1',enc.horario1,'HORARIO TRIM. 2',enc.horario2),
  ], {origin:'A1'});
}

/* ── HOJA 1: PLAN DE TRABAJO ─────────────── */
function sheetPlanTrabajo(wb, enc, ses) {
  const ws = {};
  addEncabezado(ws, enc, 'PLAN DE TRABAJO CONCERTADO — ' + enc.grupo);

  const headers = ['SEMANA N°','TRIMESTRE','FECHA','DÍA','TEMA / ACTIVIDAD A DESARROLLAR','EVIDENCIA A ENTREGAR','FORMA DE ENTREGA','OBSERVACIONES'];
  const headerRow = headers.map(h => ({v:h,t:'s',s:S.header}));
  XLSX.utils.sheet_add_aoa(ws, [
    [{v:'Diligencie aquí los datos del encabezado y el cronograma.',t:'s'}],
    headerRow
  ], {origin:'A8'});

  let row = 10;
  if (ses.length) {
    ses.forEach((s,i) => {
      XLSX.utils.sheet_add_aoa(ws, [[
        {v:s.semana||i+1,t:'n',s:S.datoC},
        {v:s.trimestre||'TRIMESTRE 1',t:'s',s:S.datoC},
        {v:s.fecha||'',t:'s',s:S.datoC},
        {v:s.dia||'',t:'s',s:S.datoC},
        {v:s.tema||'',t:'s',s:S.dato},
        {v:s.evidencia||'',t:'s',s:S.dato},
        {v:s.entrega||'',t:'s',s:S.datoC},
        {v:s.observaciones||'',t:'s',s:S.dato},
      ]], {origin:`A${row}`});
      row++;
    });
  } else {
    XLSX.utils.sheet_add_aoa(ws, [[{v:'(Agrega sesiones desde el panel del grupo)',t:'s',s:{font:{color:{rgb:'FF9E9E9E'}}}}]], {origin:`A${row}`});
  }

  ws['!cols'] = [{wch:10},{wch:14},{wch:14},{wch:10},{wch:42},{wch:36},{wch:14},{wch:26}];
  ws['!ref'] = `A1:H${row+2}`;
  XLSX.utils.book_append_sheet(wb, ws, 'PLAN DE TRABAJO');
}

/* ── HOJA 2: APRENDICES ──────────────────── */
function sheetAprendices(wb, enc, ap) {
  const ws = {};
  addEncabezado(ws, enc, 'LISTADO DE APRENDICES');
  XLSX.utils.sheet_add_aoa(ws, [
    [{v:'Fuente: Reporte de Juicios Evaluativos SOFIA Plus. El ESTADO controla el sombreado en todas las hojas.',t:'s'}]
  ], {origin:'A2'});

  const headers = ['N°','TIPO DOC.','DOCUMENTO','NOMBRES','APELLIDOS','ESTADO'];
  XLSX.utils.sheet_add_aoa(ws, [headers.map(h=>({v:h,t:'s',s:S.header}))], {origin:'A9'});

  ap.forEach((a,i) => {
    XLSX.utils.sheet_add_aoa(ws, [[
      {v:i+1,t:'n',s:S.datoC},
      {v:`${a.tipoDoc||'TI'} ${a.documento||''}`,t:'s',s:S.dato},
      {v:a.nombres||'',t:'s',s:S.dato},
      {v:a.apellidos||'',t:'s',s:S.dato},
      {v:a.estado||'EN FORMACION',t:'s',s:S.dato},
    ]], {origin:`A${10+i}`});
  });

  ws['!cols'] = [{wch:5},{wch:10},{wch:14},{wch:22},{wch:22},{wch:20}];
  ws['!ref'] = `A1:F${10+ap.length+2}`;
  XLSX.utils.book_append_sheet(wb, ws, 'APRENDICES');
}

/* ── HOJA 3: ASISTENCIA ──────────────────── */
function sheetAsistencia(wb, enc, ap, ses) {
  const ws = {};
  addEncabezado(ws, enc, 'CONTROL DE ASISTENCIA');
  XLSX.utils.sheet_add_aoa(ws, [
    [{v:'O = Asistió · X = Inasistencia · E = Excusa / falla justificada · T = Llegada tarde · (vacío) = sin registro. Las fechas se toman del PLAN DE TRABAJO.',t:'s'}]
  ], {origin:'A2'});

  const sesHeaders = ses.map(s => ({v:s.fecha||`S${s.semana}`,t:'s',s:S.header}));
  XLSX.utils.sheet_add_aoa(ws, [[
    {v:'N°',t:'s',s:S.header},
    {v:'APRENDIZ (APELLIDOS Y NOMBRES)',t:'s',s:S.header},
    {v:'ESTADO',t:'s',s:S.header},
    ...sesHeaders,
    {v:'ASIST.',t:'s',s:S.headerVerde},
    {v:'FALTAS',t:'s',s:S.headerVerde},
    {v:'EXCUSAS',t:'s',s:S.headerVerde},
    {v:'% TOTAL',t:'s',s:S.headerVerde},
  ]], {origin:'A9'});

  ap.forEach((a,i) => {
    const row = 10 + i;
    const asist = a.asistencia || {};
    const marcas = ses.map(s => {
      const val = asist[s.id] || '';
      const st = val==='O'?S.asist_O:val==='X'?S.asist_X:val==='E'?S.asist_E:S.datoC;
      return {v:val,t:'s',s:st};
    });
    const faltas  = Object.values(asist).filter(v=>v==='X').length;
    const excusas = Object.values(asist).filter(v=>v==='E').length;
    const total   = Object.values(asist).filter(v=>v==='O').length;
    const pct     = ses.length ? total/ses.length : 0;

    XLSX.utils.sheet_add_aoa(ws, [[
      {v:i+1,t:'n',s:S.datoC},
      {v:`${a.apellidos||''} ${a.nombres||''}`.trim(),t:'s',s:S.dato},
      {v:a.estado||'EN FORMACION',t:'s',s:S.datoC},
      ...marcas,
      {v:total,t:'n',s:S.datoC},
      {v:faltas,t:'n',s:{...S.datoC,font:{bold:true,sz:10,color:{rgb:faltas>=2?'FFCC0000':'FF000000'}}}},
      {v:excusas,t:'n',s:S.datoC},
      {v:pct,t:'n',s:S.pct},
    ]], {origin:`A${row}`});
  });

  const totalCols = 3 + ses.length + 4;
  const colLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZAAABACADAEAFAGAHAIAJAKALAMANAOAPAQARASATAUAVAWAXAYAZ';
  const lastCol = totalCols <= 26 ? colLetters[totalCols-1] : 'AZ';
  ws['!cols'] = [{wch:5},{wch:34},{wch:18},...ses.map(()=>({wch:12})),{wch:8},{wch:8},{wch:8},{wch:8}];
  ws['!ref'] = `A1:${lastCol}${10+ap.length+2}`;
  XLSX.utils.book_append_sheet(wb, ws, 'ASISTENCIA');
}

/* ── HOJA 4: EVIDENCIAS ──────────────────── */
function sheetEvidencias(wb, enc, ap, ses) {
  const ws = {};
  addEncabezado(ws, enc, 'CONTROL DE EVIDENCIAS — PLAN DE TRABAJO CONCERTADO');
  XLSX.utils.sheet_add_aoa(ws, [
    [{v:'OK = Entregada · REP n = Devuelta (n reprocesos) · INC n = Incompleta · NE = No entregó · (vacío) = pendiente',t:'s'}]
  ], {origin:'A2'});

  const evids = ses.filter(s => s.evidencia);
  const evHeaders = evids.map(s => ({v:`${s.evidencia}\nEntrega: ${s.entrega||'FÍSICO'}`,t:'s',s:S.header}));
  XLSX.utils.sheet_add_aoa(ws, [[
    {v:'N°',t:'s',s:S.header},
    {v:'APRENDIZ (APELLIDOS Y NOMBRES)',t:'s',s:S.header},
    {v:'ESTADO',t:'s',s:S.header},
    ...evHeaders,
    {v:'ENTREGADAS (OK)',t:'s',s:S.headerVerde},
    {v:'NO ENTREGÓ',t:'s',s:S.headerVerde},
    {v:'% CUMPLIM.',t:'s',s:S.headerVerde},
  ]], {origin:'A9'});

  ap.forEach((a,i) => {
    const ev = a.evidencias || {};
    const marcas = evids.map(s => ({v:ev[s.id]||'',t:'s',s:S.datoC}));
    const ok = Object.values(ev).filter(v=>v==='OK').length;
    const pct = evids.length ? ok/evids.length : 0;
    XLSX.utils.sheet_add_aoa(ws, [[
      {v:i+1,t:'n',s:S.datoC},
      {v:`${a.apellidos||''} ${a.nombres||''}`.trim(),t:'s',s:S.dato},
      {v:a.estado||'EN FORMACION',t:'s',s:S.datoC},
      ...marcas,
      {v:ok,t:'n',s:S.datoC},
      {v:evids.length-ok,t:'n',s:S.datoC},
      {v:pct,t:'n',s:S.pct},
    ]], {origin:`A${10+i}`});
  });

  const tc = 3 + evids.length + 3;
  ws['!cols'] = [{wch:5},{wch:34},{wch:18},...evids.map(()=>({wch:16})),{wch:14},{wch:12},{wch:12}];
  ws['!ref'] = `A1:${colLetter(tc)}${10+ap.length+2}`;
  XLSX.utils.book_append_sheet(wb, ws, 'EVIDENCIAS');
}

function colLetter(n) {
  let s='';
  while(n>0){const r=(n-1)%26;s=String.fromCharCode(65+r)+s;n=Math.floor((n-1)/26);}
  return s;
}

/* ── HOJA 5: RESUMEN ─────────────────────── */
function sheetResumen(wb, enc, ap, ses) {
  const ws = {};
  addEncabezado(ws, enc, 'TABLERO DE SEGUIMIENTO');
  XLSX.utils.sheet_add_aoa(ws, [
    [{v:'Todo se calcula automáticamente desde ASISTENCIA y EVIDENCIAS. Alertas: ≥2 inasistencias → LLAMADO DE ATENCIÓN · ≥3 → REPORTAR DESERCIÓN',t:'s'}]
  ], {origin:'A2'});

  const activos = ap.filter(a=>a.estado==='EN FORMACION').length;
  const otros   = ap.length - activos;
  XLSX.utils.sheet_add_aoa(ws, [
    [{v:'APRENDICES ACTIVOS',t:'s',s:S.header},{v:'',t:'s'},{v:'RETIRADOS / OTROS',t:'s',s:S.header},{v:'',t:'s'},{v:'SESIONES EJECUTADAS',t:'s',s:S.header},{v:'',t:'s'}],
    [{v:activos,t:'n',s:{font:{bold:true,sz:22},alignment:{horizontal:'center'}}},{v:'',t:'s'},{v:otros,t:'n',s:{font:{bold:true,sz:22},alignment:{horizontal:'center'}}},{v:'',t:'s'},{v:ses.length,t:'n',s:{font:{bold:true,sz:22},alignment:{horizontal:'center'}}},{v:'',t:'s'}],
  ], {origin:'A8'});

  const headers = ['N°','APRENDIZ (APELLIDOS Y NOMBRES)','ESTADO','% ASISTENCIA','INASISTENCIAS','EXCUSAS','ALERTA'];
  XLSX.utils.sheet_add_aoa(ws, [headers.map(h=>({v:h,t:'s',s:S.header}))], {origin:'A11'});

  ap.forEach((a,i) => {
    const faltas  = Object.values(a.asistencia||{}).filter(v=>v==='X').length;
    const excusas = Object.values(a.asistencia||{}).filter(v=>v==='E').length;
    const asiste  = Object.values(a.asistencia||{}).filter(v=>v==='O').length;
    const pct     = ses.length ? asiste/ses.length : 0;
    const alerta  = getAlerta(faltas);
    const alertaS = alerta.level==='danger'?S.alert_des:alerta.level==='warn'?S.alert_mej:S.datoC;
    XLSX.utils.sheet_add_aoa(ws, [[
      {v:i+1,t:'n',s:S.datoC},
      {v:`${a.apellidos||''} ${a.nombres||''}`.trim(),t:'s',s:S.dato},
      {v:a.estado||'EN FORMACION',t:'s',s:S.datoC},
      {v:pct,t:'n',s:S.pct},
      {v:faltas,t:'n',s:{...S.datoC,font:{bold:true,sz:10,color:{rgb:faltas>=2?'FFCC0000':'FF000000'}}}},
      {v:excusas,t:'n',s:S.datoC},
      {v:alerta.label,t:'s',s:alertaS},
    ]], {origin:`A${12+i}`});
  });

  ws['!cols'] = [{wch:5},{wch:34},{wch:18},{wch:14},{wch:14},{wch:10},{wch:24}];
  ws['!ref'] = `A1:G${12+ap.length+2}`;
  XLSX.utils.book_append_sheet(wb, ws, 'RESUMEN');
}

/* ── HOJA 6: RUTA GFPI-F-176 ────────────── */
function sheetRutaGFPI(wb, enc, ap, ses) {
  const ws = {};
  XLSX.utils.sheet_add_aoa(ws, [
    [{v:'Proceso Gestión de la Formación Profesional Integral',t:'s',s:S.titulo}],
    [{v:'Formato Ruta de atención para la prevención de la Deserción',t:'s',s:S.titulo}],
    [{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'},{v:'Versión: 01',t:'s'},{v:'Código: GFPI-F-176',t:'s'}],
    encRow(enc,'REGIONAL',enc.regional,'CENTRO DE FORMACIÓN',enc.centro),
    encRow(enc,'NOMBRE DEL INSTRUCTOR',enc.instructor,'No DE LA FICHA',enc.ficha),
    [{v:'CÓDIGO Y NOMBRE DEL PROGRAMA',t:'s',s:S.encabezado},{v:'',t:'s'},{v:'',t:'s'},{v:enc.programa,t:'s',s:S.dato},{v:'NIVEL',t:'s',s:S.encabezado},{v:'TECNÓLOGO',t:'s',s:S.dato}],
    [{v:'REGISTRO APRENDICES USUARIOS DE LA RUTA DE ATENCIÓN PARA LA PREVENCIÓN DE LA DESERCIÓN',t:'s',s:{font:{bold:true,sz:11},fill:{fgColor:{rgb:'FF1A3C5E'}},font2:{color:{rgb:'FFFFFFFF'}}}}],
  ], {origin:'A1'});

  const headers = ['Fecha del registro','No de documento','Nombre y apellido','Situación de riesgo','Causa o causas','Escaló el caso?','A quien escaló?','Acciones adelantadas','Estado al finalizar'];
  XLSX.utils.sheet_add_aoa(ws, [headers.map(h=>({v:h,t:'s',s:S.header}))], {origin:'A8'});

  let row = 9;
  ap.forEach(a => {
    const faltas = Object.values(a.asistencia||{}).filter(v=>v==='X').length;
    if (faltas < 2) return;
    const today = fmtHoy();
    XLSX.utils.sheet_add_aoa(ws, [[
      {v:today,t:'s',s:S.datoC},
      {v:a.documento||'',t:'s',s:S.dato},
      {v:`${a.nombres||''} ${a.apellidos||''}`.trim(),t:'s',s:S.dato},
      {v:`Inasistencias sin soporte de justificación a las actividades formativas de la Competencia: ${enc.competencia} (${faltas} inasistencias en el trimestre en curso)`,t:'s',s:S.dato},
      {v:'Por confirmar con el aprendiz y/o acudiente',t:'s',s:S.dato},
      {v:'NO',t:'s',s:S.datoC},
      {v:'Instructor de la ficha',t:'s',s:S.dato},
      {v:'Contacto con el aprendiz y/o su acudiente para indagar la causa de las inasistencias; recordatorio de los compromisos del plan de trabajo concertado y seguimiento en las siguientes sesiones',t:'s',s:S.dato},
      {v:'Continúa en la formación',t:'s',s:S.dato},
    ]], {origin:`A${row}`});
    row++;
  });

  if (row === 9) {
    XLSX.utils.sheet_add_aoa(ws, [[{v:'Sin aprendices con 2 o más faltas',t:'s',s:{font:{color:{rgb:'FF9E9E9E'}}}}]], {origin:`A${row}`});
  }

  ws['!cols'] = [{wch:14},{wch:14},{wch:26},{wch:44},{wch:30},{wch:12},{wch:20},{wch:50},{wch:22}];
  ws['!ref'] = `A1:I${row+2}`;
  XLSX.utils.book_append_sheet(wb, ws, 'Formato GFPI-F-');
}

/* ── HOJA 7: TABLA 1 Y 2 ─────────────────── */
function sheetTabla12(wb) {
  const causas = [
    ['Económicos','Motivos económicos: No cuento con recursos para estudiar','Coordinador de Formación'],
    ['Económicos','Motivo económico: Tuve que dedicarme a trabajar','Coordinador de Formación'],
    ['Laboral','Motivo laboral: Mi trabajo no me deja tiempo para estudiar','Coordinador académico — equipo de instructores'],
    ['Laboral','Motivo laboral: Cruce de actividades laborales con formativas','Coordinador académico — equipo de instructores'],
    ['Familiares','Motivo familiar: Se presentaron conflictos o calamidades familiares','Coordinador de Formación — Equipo de bienestar'],
    ['Salud','Motivo salud: Tuve una enfermedad que me limitó','Coordinador de Formación — Equipo de bienestar'],
    ['Salud','Motivo salud: Me sentí triste y deprimido','Coordinador de Formación — Equipo de bienestar'],
    ['Sociales','Motivo social: Se me dificultaba llegar al centro','Coordinador de Formación — Equipo de bienestar'],
    ['Académicos','Motivo académico: No me sentí capaz con la formación','Coordinador de Formación — Equipo de bienestar'],
    ['Académicos','Motivo académico: Me di cuenta que no era lo que quería estudiar','Coordinador de Formación — Equipo de bienestar'],
  ];
  const ws = {};
  XLSX.utils.sheet_add_aoa(ws, [
    [{v:'MOTIVO',t:'s',s:S.header},{v:'POSIBLES CAUSAS (TABLA 1)',t:'s',s:S.header},{v:'A QUIEN ESCALAR (TABLA 2)',t:'s',s:S.header}],
    ...causas.map(c => c.map(v=>({v,t:'s',s:S.dato})))
  ], {origin:'A1'});
  ws['!cols'] = [{wch:16},{wch:60},{wch:44}];
  ws['!ref'] = `A1:C${1+causas.length}`;
  XLSX.utils.book_append_sheet(wb, ws, 'TABLA 1 Y 2');
}

/* ── HOJA 8: INSTRUCCIONES ───────────────── */
function sheetInstrucciones(wb, enc) {
  const ws = {};
  XLSX.utils.sheet_add_aoa(ws, [
    [{v:'INSTRUCCIONES PARA EL DILIGENCIAMIENTO DEL FORMATO',t:'s',s:S.titulo}],
    [{v:'NO IMPRIMIR — Este formato se diligencia de manera virtual y hace parte del portafolio de evidencias del instructor.',t:'s'}],
    [{v:'',t:'s'}],
    [{v:'1. Generalidades',t:'s',s:S.encabezado}],
    [{v:'Este formato está asociado a la Ruta de atención para la prevención de la Deserción.',t:'s'}],
    [{v:'Su diligenciamiento lo realiza el instructor quien tiene mayor contacto con el aprendiz.',t:'s'}],
    [{v:'',t:'s'}],
    [{v:'2. Regla de alertas automáticas',t:'s',s:S.encabezado}],
    [{v:'≥ 2 inasistencias en el trimestre → LLAMADO DE ATENCIÓN (se genera en hoja RESUMEN y GFPI-F-176)',t:'s'}],
    [{v:'≥ 3 inasistencias en el trimestre → REPORTAR DESERCIÓN',t:'s'}],
    [{v:'',t:'s'}],
    [{v:'3. Generado automáticamente',t:'s',s:S.encabezado}],
    [{v:`Grupo: ${enc.grupo} · Ficha: ${enc.ficha} · Instructor: ${enc.instructor}`,t:'s'}],
    [{v:`Generado: ${fmtHoy()}`,t:'s'}],
  ], {origin:'A1'});
  ws['!cols'] = [{wch:80}];
  ws['!ref'] = 'A1:A14';
  XLSX.utils.book_append_sheet(wb, ws, 'Instrucciones');
}

/* ── HOJA 9: CALC_RUTA ───────────────────── */
function sheetCalcRuta(wb, ap, ses) {
  const trimActual = 2;
  const rows = [
    [{v:'TRIM EN CURSO',t:'s',s:S.encabezado},{v:trimActual,t:'n',s:S.dato}],
    [{v:'doc',t:'s',s:S.header},{v:'nombre',t:'s',s:S.header},{v:'estado',t:'s',s:S.header},{v:'faltas',t:'s',s:S.header},{v:'fecha2aFalta',t:'s',s:S.header}],
  ];
  ap.forEach(a => {
    const faltas = Object.values(a.asistencia||{}).filter(v=>v==='X').length;
    rows.push([
      {v:a.documento||'',t:'s',s:S.dato},
      {v:`${a.nombres||''} ${a.apellidos||''}`.trim(),t:'s',s:S.dato},
      {v:a.estado||'',t:'s',s:S.dato},
      {v:faltas,t:'n',s:{...S.datoC,font:{bold:true,sz:10,color:{rgb:faltas>=2?'FFCC0000':'FF000000'}}}},
      {v:faltas>=2?fmtHoy():'',t:'s',s:S.datoC},
    ]);
  });
  const ws = {};
  XLSX.utils.sheet_add_aoa(ws, rows, {origin:'A1'});
  ws['!cols'] = [{wch:14},{wch:30},{wch:20},{wch:8},{wch:16}];
  ws['!ref'] = `A1:E${rows.length+1}`;
  XLSX.utils.book_append_sheet(wb, ws, 'CALC_RUTA');
}
