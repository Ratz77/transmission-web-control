<p align="center">
<img src="https://github.com/Ratz77/transmission-web-control/raw/master/src/tr-web-control/logo.png"><br/>
<a href="https://github.com/Ratz77/transmission-web-control/releases" title="GitHub Releases"><img src="https://img.shields.io/github/release/Ratz77/transmission-web-control.svg"></a>
<img src="https://img.shields.io/badge/transmission-%3E=2.40%20(RPC%20%3E14)-green.svg" title="Support Transmission Version">
<img src="https://img.shields.io/badge/transmission%204.x-compatible-brightgreen.svg" title="Transmission 4.x compatible">
<a href="https://github.com/Ratz77/transmission-web-control/blob/master/LICENSE" title="GitHub license"><img src="https://img.shields.io/github/license/Ratz77/transmission-web-control.svg"></a>
</p>

----

# Transmission Web Control (fork mantenido)

> **Fork de [ronggang/transmission-web-control](https://github.com/ronggang/transmission-web-control)**, proyecto archivado en 2025.
> Este fork corrige la compatibilidad con **Transmission 4.x** (RPC v17/v18) y sigue recibiendo mantenimiento.

## Novedades respecto al original

| Problema / Mejora | Fix / Nueva función |
|---|---|
| Script de instalación falla en Transmission 4.0+ (`/web` no existe) | Detección automática de `public_html` vs `web` |
| `trackerAdd`/`trackerReplace` deprecados en Transmission 4.0 (RPC v17) | Uso automático de `trackerList` en v17+ |
| Campos snake_case en Transmission 4.1+ (RPC v18) rompen la UI | Capa de normalización que traduce snake_case → camelCase |
| Valor de cifrado `"allowed"` no reconocido en el desplegable | Normalizado a `"tolerated"` internamente |
| `cache-size-mb` renombrado a `cache-size-mib` en 4.1+ | Mapeado al campo legacy para la UI |
| Crash en trackers con `lastAnnounceResult` nulo | Comprobación defensiva añadida |
| **Interfaz móvil**: no era posible subir ficheros `.torrent` | Nuevo selector de fichero + envío por base64 vía RPC |
| Despliegue con Docker | `docker-compose.yml` y `Dockerfile` incluidos |

## Instalación

El método de instalación es el mismo que el original. Ejecuta en tu servidor:

```bash
# Método recomendado (curl)
bash <(curl -s https://raw.githubusercontent.com/Ratz77/transmission-web-control/master/release/install-tr-control.sh)
```

```bash
# Alternativa (wget)
wget https://raw.githubusercontent.com/Ratz77/transmission-web-control/master/release/install-tr-control.sh
bash install-tr-control.sh
```

El script detecta automáticamente si tu Transmission usa `/web` (≤3.x) o `/public_html` (≥4.0).

### Instalación automática (sin menú)

```bash
bash install-tr-control.sh auto
```

### Versiones soportadas

| Transmission | RPC | Estado |
|---|---|---|
| 2.40 – 3.00 | v14 – v16 | ✅ Soportado |
| 4.0.x | v17 | ✅ Soportado |
| 4.1.x | v18 | ✅ Soportado |
| 4.2.x | v18.1 | ✅ Soportado |

## Docker

### Opción A — docker-compose (recomendado)

Monta el directorio `src/` directamente en el contenedor. Cualquier cambio en los ficheros se refleja sin reconstruir la imagen.

```bash
docker compose up -d
```

La interfaz estará disponible en `http://localhost:9091`.

Ajusta `TZ` en [`docker-compose.yml`](docker-compose.yml) con tu zona horaria si lo necesitas.

### Opción B — imagen propia (Dockerfile)

Construye una imagen autocontenida con la UI incluida:

```bash
docker build -t transmission-web-control .
docker run -d \
  -e PUID=1000 -e PGID=1000 \
  -p 9091:9091 -p 51413:51413 -p 51413:51413/udp \
  -v ./config:/config \
  -v ./downloads:/downloads \
  --name transmission \
  transmission-web-control
```

## Previsualización

![screenshots](https://user-images.githubusercontent.com/8065899/38598199-0d2e684c-3d8e-11e8-8b21-3cd1f3c7580a.png)

## Acerca de

Este proyecto mejora la interfaz web de [Transmission](https://www.transmissionbt.com/) añadiendo:
- Agrupación y estado de trackers
- Gestión avanzada de torrents
- Soporte multidioma
- Temas visuales

Transmission debe instalarse por separado: https://www.transmissionbt.com/

## Changelog

Ver [CHANGELOG.md](CHANGELOG.md) para el historial de cambios del proyecto original.
Los cambios de este fork están documentados en los mensajes de commit.

## Créditos

- Proyecto original: [ronggang](https://github.com/ronggang) y colaboradores
- Fork mantenido por: [Ratz77](https://github.com/Ratz77)
