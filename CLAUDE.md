# Transmission Web Control — Fork mantenido por Ratz77

## Qué es este proyecto

Fork activo de [ronggang/transmission-web-control](https://github.com/ronggang/transmission-web-control) (archivado en 2025).
Mejora la interfaz web de Transmission añadiendo compatibilidad con Transmission 4.x (RPC v17/v18) y nuevas funcionalidades.

**Repo:** https://github.com/Ratz77/transmission-web-control  
**Rama principal:** master

---

## Fixes aplicados respecto al original

| Problema | Fix |
|---|---|
| Script de instalación falla en Transmission 4.0+ (`/web` no existe) | `detectHtmlFolderName()` detecta `public_html` vs `web` |
| Script de instalación copiaba ficheros a ruta incorrecta | `install()` reescrita para copiar desde `src/` directamente a `WEB_FOLDER` |
| `trackerAdd`/`trackerReplace` deprecados en RPC v17 | `addTrackers()`, `replaceTracker()`, `removeTracker()` version-aware |
| Campos snake_case en RPC v18 rompen la UI | Capa de normalización en `_normalizeSessionData()`, `_normalizeTorrent()`, `_normalizeTrackerStat()` |
| `fields.base` solo pedía camelCase → datos vacíos en Tr 4.1+ | Se añaden equivalentes snake_case a todos los arrays de campos |
| Valor de cifrado `"allowed"` no reconocido | Normalizado a `"tolerated"` internamente |
| `cache-size-mb` renombrado a `cache-size-mib` en 4.1+ | Mapeado al campo legacy |
| Crash en trackers con `lastAnnounceResult` nulo | Guard defensivo añadido |
| index.html/index.mobile.html cargaban JS minificado desactualizado | Cambiado a cargar los fuentes directamente |
| Interfaz móvil sin soporte de subida de ficheros `.torrent` | Añadido `<input type="file">` + función `addFile()` con base64 vía RPC |

---

## Arquitectura del proyecto

```
twc-fork/
├── src/                          ← Ficheros que se instalan en Transmission
│   ├── index.html                ← UI escritorio (EasyUI + jQuery)
│   ├── index.mobile.html         ← UI móvil (jQuery Mobile)
│   └── tr-web-control/
│       ├── script/
│       │   ├── transmission.js           ← Capa RPC (MODIFICADO)
│       │   ├── transmission.torrents.js  ← Gestión de torrents (MODIFICADO)
│       │   ├── system.js                 ← Sistema escritorio (MODIFICADO)
│       │   ├── system.mobile.js          ← Sistema móvil (MODIFICADO)
│       │   └── min/                      ← Minificados OBSOLETOS (no se usan)
│       ├── template/
│       │   ├── dialog-system-config.html (MODIFICADO)
│       │   └── dialog-torrent-attribute-add-tracker.html (MODIFICADO)
│       └── i18n/                 ← Traducciones
├── release/
│   ├── install-tr-control.sh         ← Script instalación (MODIFICADO)
│   ├── install-tr-control-cn.sh      ← Script CN (MODIFICADO)
│   └── install-tr-control-gitee.sh   ← Script Gitee (MODIFICADO)
├── docker-compose.yml            ← Monta src/ vía TRANSMISSION_WEB_HOME
├── Dockerfile                    ← Imagen autocontenida
└── CLAUDE.md                     ← Este fichero
```

---

## Ficheros clave y qué hacen

### `transmission.js`
- `rpcVersion`: se rellena al hacer `session-get`, usado por llamadas version-aware
- `_normalizeSessionData(data)`: mapea snake_case → hyphenated para RPC v18
- `_normalizeStatsData(data)`: mapea snake_case → camelCase en session-stats
- `getSession(callback)`: llama a `session-get`, normaliza y actualiza `rpcVersion`
- `addTrackers(id, urls, cb)`: usa `trackerList` en v17+, `trackerAdd` en v16-
- `replaceTracker(id, old, new, cb)`: version-aware
- `removeTracker(id, url, cb)`: version-aware
- `addTorrentFromFile(file, path, paused, cb)`: lee fichero, codifica base64, llama RPC

### `transmission.torrents.js`
- `fields.base`: incluye camelCase Y snake_case (ambas versiones ignorarán las que no conocen)
- `_normalizeTorrent(item)`: añade aliases camelCase para todos los campos snake_case
- `_normalizeTrackerStat(s)`: normaliza stats anidados de tracker + guard null
- `getallids()`: llama a `torrent-get` con todos los campos, normaliza respuesta
- `searchAndReplaceTrackers()`: usa `transmission.replaceTracker()` version-aware

### `system.js`
- `version: "1.6.1-fork"`, `codeupdate: "20250519"`
- `reloadSession()`: acepta `result["alt-speed-enabled"] || result["alt_speed_enabled"]`, etc.
- `getFreeSpace`: acepta `size-bytes` y `size_bytes` en la respuesta
- `getTorrentInfos()`: campos de `getMoreInfos` incluyen ambas variantes (camelCase + snake_case)

### `system.mobile.js`
- `version: "1.6.1-fork"`
- `reloadSession()`: igual que system.js, con fallbacks snake_case

### `index.mobile.html`
- Carga `system.mobile.js` (fuente, no minificado)
- Sección `#content-add-torrent`: tiene `<input type="file" accept=".torrent">` + botón "añadir fichero"
- Función `addFile()`: lee ficheros seleccionados, llama `transmission.addTorrentFromFile()`
- Función `addUrl()`: añade torrents por URL/magnet (comportamiento original)

### Scripts de instalación
- `detectHtmlFolderName(base)`: detecta `public_html` (Tr ≥4.0) vs `web` (Tr ≤3.x)
- `install()`: extraer tar sin argumento → copiar de `transmission-web-control-master/src/.` a `WEB_FOLDER/`
  - **BUG anterior**: creaba subdirectorio, extraía ahí, copiaba estructura incorrecta → UI rota

---

## Versiones de Transmission soportadas

| Transmission | RPC | Estado |
|---|---|---|
| 2.40 – 3.00 | v14–v16 | ✅ |
| 4.0.x | v17 | ✅ |
| 4.1.x | v18 | ✅ |
| 4.2.x | v18.1 | ✅ |

---

## Docker

```bash
# Opción A: bind-mount (cambios en src/ se reflejan sin rebuilding)
docker compose up -d

# Opción B: imagen autocontenida
docker build -t transmission-web-control .
docker run -d -p 9091:9091 -v ./config:/config -v ./downloads:/downloads transmission-web-control
```

---

## Instalación en servidor

```bash
bash <(curl -s https://raw.githubusercontent.com/Ratz77/transmission-web-control/master/release/install-tr-control.sh)
```

O sin menú:
```bash
bash install-tr-control.sh auto
```

---

## Convenciones del proyecto

- No modificar los ficheros `min/` — son obsoletos y no se sirven
- Los fuentes JS se cargan directamente con `?v=20250519` para cache-busting
- La normalización es ADITIVA: añade aliases, nunca elimina claves originales
- Compatibilidad hacia atrás siempre: código que funciona en Tr 2.x debe seguir funcionando
