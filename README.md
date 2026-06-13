# Ecosistema de Formación SENA

Sistema web para gestión de grupos de formación. Corre 100% en el navegador — sin servidor, sin base de datos externa.

## ¿Qué hace?

- Organiza grupos por **Año → Trimestre → Grupo**
- Almacena aprendices, sesiones y asistencia en el navegador (localStorage)
- **Genera automáticamente el Excel completo** con las 9 hojas:
  - PLAN DE TRABAJO
  - APRENDICES
  - ASISTENCIA
  - EVIDENCIAS
  - RESUMEN (con alertas automáticas)
  - Formato GFPI-F-176 (Ruta de atención)
  - TABLA 1 Y 2
  - Instrucciones
  - CALC_RUTA
- **Regla automática**: ≥ 2 faltas → Llamado de atención en el Excel

---

## Cómo montar en GitHub Pages (paso a paso)

### 1. Crear el repositorio

1. Ve a [github.com](https://github.com) e inicia sesión
2. Clic en **"New repository"** (botón verde)
3. Nombre: `ecosistema-formacion` (o el que quieras)
4. Marca **"Public"**
5. Clic en **"Create repository"**

### 2. Subir los archivos

**Opción A — Desde GitHub (más fácil):**
1. En tu repositorio vacío, clic en **"uploading an existing file"**
2. Arrastra TODA la carpeta `ecosistema-formacion` (o los archivos sueltos)
3. Clic en **"Commit changes"**

**Opción B — Con GitHub Desktop:**
1. Descarga [GitHub Desktop](https://desktop.github.com)
2. Clona tu repositorio vacío
3. Copia los archivos a la carpeta clonada
4. Commit y Push

### 3. Activar GitHub Pages

1. En tu repositorio → pestaña **Settings**
2. En el menú izquierdo → **Pages**
3. En "Source" → selecciona **"Deploy from a branch"**
4. Branch: **main** · Folder: **/ (root)**
5. Clic en **Save**

### 4. Acceder al sistema

En 1-2 minutos tu sistema estará en:
```
https://TU_USUARIO.github.io/ecosistema-formacion/
```

---

## Estructura de archivos

```
ecosistema-formacion/
├── index.html          ← Página principal (años/trimestres/grupos)
├── nuevo-grupo.html    ← Formulario para crear grupo
├── grupo.html          ← Panel del grupo + generador Excel
├── css/
│   └── main.css        ← Estilos
├── js/
│   ├── storage.js      ← Base de datos (localStorage)
│   ├── index.js        ← Lógica página principal
│   ├── nuevo-grupo.js  ← Lógica formulario
│   ├── grupo.js        ← Lógica panel de grupo
│   └── excel-generator.js ← Generador Excel (.xlsx)
└── README.md
```

## Notas importantes

- Los datos se guardan en el **navegador** (localStorage). No se sincronizan entre dispositivos automáticamente.
- Para hacer backup, usa el botón **"Exportar datos"** (próxima versión).
- El Excel generado es compatible con Microsoft Excel, LibreOffice y Google Sheets.
- La regla de alertas: **≥ 2 faltas** en el trimestre → aparece en la hoja RESUMEN y en la GFPI-F-176 automáticamente.
