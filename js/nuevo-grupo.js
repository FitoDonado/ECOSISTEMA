/* nuevo-grupo.js */

const params = new URLSearchParams(window.location.search);
let aprendicesCount = 0;

function init() {
  const years = getYears();
  const sel = document.getElementById('fAno');
  years.forEach(y => {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    sel.appendChild(opt);
  });
  const py = params.get('year');
  if (py) sel.value = py;
  const pt = params.get('trim');
  if (pt) document.getElementById('fTrimestre').value = pt;
}

document.getElementById('btnAddAprendiz').onclick = () => addAprendizRow();

function addAprendizRow(data) {
  aprendicesCount++;
  const list = document.getElementById('aprendicesList');
  const row = document.createElement('div');
  row.className = 'aprendiz-row';
  row.dataset.idx = aprendicesCount;
  row.innerHTML = `
    <div class="field">
      <label class="field-label">Tipo</label>
      <select class="field-input" name="tipo">
        <option value="TI"${data?.tipo==='TI'?' selected':''}>TI</option>
        <option value="CC"${data?.tipo==='CC'?' selected':''}>CC</option>
        <option value="CE"${data?.tipo==='CE'?' selected':''}>CE</option>
      </select>
    </div>
    <div class="field">
      <label class="field-label">Documento</label>
      <input class="field-input" type="text" name="documento" value="${data?.documento||''}">
    </div>
    <div class="field">
      <label class="field-label">Nombres</label>
      <input class="field-input" type="text" name="nombres" value="${data?.nombres||''}">
    </div>
    <div class="field">
      <label class="field-label">Apellidos</label>
      <input class="field-input" type="text" name="apellidos" value="${data?.apellidos||''}">
    </div>
    <div class="field" style="justify-content:flex-end">
      <button type="button" class="btn-remove" onclick="this.closest('.aprendiz-row').remove()">✕</button>
    </div>`;
  list.appendChild(row);
}

document.getElementById('formNuevoGrupo').onsubmit = (e) => {
  e.preventDefault();

  const aprendices = [];
  document.querySelectorAll('.aprendiz-row').forEach(row => {
    const tipo = row.querySelector('[name=tipo]').value;
    const doc  = row.querySelector('[name=documento]').value.trim();
    const nom  = row.querySelector('[name=nombres]').value.trim();
    const ape  = row.querySelector('[name=apellidos]').value.trim();
    if (doc || nom) {
      aprendices.push({
        id: 'a_' + Date.now() + '_' + Math.random().toString(36).slice(2,5),
        tipoDoc: tipo,
        documento: doc,
        nombres: nom.toUpperCase(),
        apellidos: ape.toUpperCase(),
        estado: 'EN FORMACION',
        faltas: 0,
        asistencia: {}
      });
    }
  });

  const group = {
    year:       document.getElementById('fAno').value,
    trimestre:  document.getElementById('fTrimestre').value,
    programa:   document.getElementById('fPrograma').value.trim().toUpperCase(),
    ficha:      document.getElementById('fFicha').value.trim(),
    grupo:      document.getElementById('fGrupo').value.trim().toUpperCase(),
    nombre:     document.getElementById('fGrupo').value.trim().toUpperCase(),
    competencia:document.getElementById('fCompetencia').value.trim().toUpperCase(),
    ra:         document.getElementById('fRA').value.trim().toUpperCase(),
    instructor: document.getElementById('fInstructor').value.trim().toUpperCase(),
    regional:   document.getElementById('fRegional').value.trim().toUpperCase(),
    centro:     document.getElementById('fCentro').value.trim().toUpperCase(),
    horario1:   document.getElementById('fHorario1').value.trim().toUpperCase(),
    horario2:   document.getElementById('fHorario2').value.trim().toUpperCase(),
    aprendices,
    sesiones: []
  };

  const id = saveGroup(group);
  window.location.href = `grupo.html?id=${id}`;
};

init();
