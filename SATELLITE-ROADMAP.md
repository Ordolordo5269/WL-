# Satellite Intel — Roadmap de Mejoras

## Estado actual
- 253 militares (US/RU/CN/EU/IN/CA), 135 meteorologicos, 31 estaciones, ~10K Starlink
- Iconos SVG para military/weather/stations, puntos verdes para Starlink
- Popup basico con nombre, NORAD ID, pais, altitud, coordenadas
- Ground track (1.5 orbitas centradas) al hacer click
- Web Worker propagando posiciones cada 2s

---

## Fase 1 — Base de datos de perfiles de satelite

**Objetivo**: Enriquecer cada satelite con mision, operador, cobertura y descripcion sin llamadas externas.

**Archivo nuevo**: `apps/web/src/features/world-map/map/satellite-database.ts`

**Estructura**:
```ts
interface SatelliteProfile {
  program: string;        // "GPS Block IIF"
  operator: string;       // "US Space Force / 2nd SOPS"
  purpose: string;        // "Navigation & precision timing"
  coverage: string;       // "Global (MEO constellation)"
  orbitType: string;      // "MEO circular, ~20,200 km, 55° inclination"
  description: string;    // 2-3 frases estilo Wikipedia
}
```

**Lookup por regex sobre OBJECT_NAME** (~35 entradas cubriendo):

| Patron | Programa |
|--------|----------|
| `GPS B` | GPS Block IIF/III — US Space Force |
| `COSMOS (7XX)` / `GLONASS` | GLONASS — Russian Aerospace Forces |
| `BEIDOU` | BeiDou-3 — PLA Strategic Support Force |
| `GALILEO` / `GSAT0` | Galileo — European GNSS Agency |
| `IRNSS` | NavIC — ISRO |
| `QZSS` / `MICHIBIKI` | QZSS — Japan Cabinet Office |
| `USA-` (generic military) | NRO/DoD classified payload |
| `SBIRS` | SBIRS — US Space Force missile warning |
| `WGS` | Wideband Global SATCOM — US Space Force |
| `MUOS` | MUOS — US Navy narrowband comms |
| `GSSAP` | GSSAP — US Space Force space surveillance |
| `DMSP` | DMSP — DoD weather (legacy) |
| `NOSS` | NOSS — US Naval ocean surveillance |
| `GOES` | GOES — NOAA geostationary weather |
| `NOAA` / `JPSS` / `SUOMI` | JPSS — NOAA polar-orbiting weather |
| `METEOSAT` / `METOP` | EUMETSAT — European weather |
| `FENGYUN` / `FY-` | Fengyun — China Meteorological Admin |
| `HIMAWARI` | Himawari — Japan Meteorological Agency |
| `METEOR-M` | Meteor-M — Roshydromet weather |
| `ELEKTRO` | Elektro-L — Russian geostationary weather |
| `INSAT-3D` | INSAT-3D — ISRO/IMD weather |
| `ISS` / `ZARYA` / `NAUKA` | ISS — NASA/Roscosmos/ESA/JAXA/CSA |
| `CSS` / `TIANHE` / `WENTIAN` | Tiangong — CMSA |
| `SHENZHOU` | Shenzhou crewed — CMSA |
| `SOYUZ` | Soyuz crewed — Roscosmos |
| `CREW DRAGON` | Crew Dragon — SpaceX/NASA |
| `STARLINK` | Starlink — SpaceX LEO broadband |
| `MOLNIYA` | Molniya — Russian HEO comms (legacy) |
| `TDRS` | TDRSS — NASA relay |
| `PRAETORIAN` | SDA Tranche — US Space Development Agency |
| `SAPPHIRE` | Sapphire — Canadian Armed Forces SSA |
| `SARSAT` / `COSPAS` | COSPAS-SARSAT — international SAR |

**Fallback por pais**: Si no hay match por nombre, devuelve perfil generico basado en `COUNTRY` code.

**Eficiencia**: Lookup es un array de `[RegExp, SatelliteProfile]` recorrido una vez al abrir la ficha. Sin API calls, sin fetch. ~5KB gzipped.

**Archivos modificados**: Ninguno. Solo archivo nuevo.

---

## Fase 2 — Ficha orbital expandida (card tipo VIIRS)

**Objetivo**: Reemplazar el popup Mapbox por una card inmersiva con la misma estetica que las fichas de instrumentos (VIIRS, MODIS, etc.).

**Patron a reutilizar**: Exactamente el mismo de App.tsx L1193-1390 (expanded overlay card):
- 3D tilt con `perspective(800px)`
- Cursor-following radial gradient shine
- Gradient border violeta
- Framer Motion spring entrance
- Backdrop blur overlay

**Implementacion**:

1. **Estado nuevo en App.tsx**:
```ts
const [expandedSatellite, setExpandedSatellite] = useState<SatelliteClickData | null>(null);
```

2. **Evento**: El click en satelite ya dispara `wl-satellite-click`. Cambiar para que en vez de abrir un popup Mapbox, haga `setExpandedSatellite(data)` desde el `useEffect` del LeftSidebar.

3. **Card render** en App.tsx (bloque condicional junto al `expandedOverlay`):
```
+------------------------------------------+
|  [SVG icono satelite]  gradient bg       | 180px
|  ── fade ──                              |
+------------------------------------------+
|  🇺🇸  UNITED STATES                      | 8px uppercase, flag emoji
|                                          |
|  GPS BIIF-12 (USA-266)                   | 20px, bold
|  GPS Navigation System                   | 13px, muted
|                                          |
|  "The Global Positioning System Block    | 12px, muted
|   IIF constellation provides..."         |
|                                          |
|  ── separator ──                         |
|                                          |
|  ○ MEO circular, 55° incl.              | orbit type
|  ○ 20,200 km                            | altitud (live)
|  ○ Global coverage                      | cobertura
|  ○ US Space Force / 2nd SOPS            | operador
|                                          |
|  ── separator ──                         |
|                                          |
|  [ 🛰 Enter POV ]                       | boton fase 3
|                                          |
|  NORAD 40294 · 2014-068A                | 9px, muy tenue
|  CELESTRAK · WORLDLORE                   | source badge
+------------------------------------------+
```

4. **Eliminar** el popup Mapbox de `satellite-visualization.ts showPopup()`. El click ahora solo dispara el evento, no crea popup.

5. **Ground track**: Se sigue mostrando al seleccionar un satelite (ya funciona). Se limpia al cerrar la card.

**Archivos modificados**:
- `App.tsx` — nuevo estado + render de card (copiar patron existente)
- `satellite-visualization.ts` — eliminar `showPopup()`, simplificar
- `LeftSidebar.tsx` — cambiar handler de `wl-satellite-click` para setear estado en App
- `satellite-database.ts` — importar para lookup

**Reutilizacion**: El 90% del JSX/CSS de la card ya existe en el bloque `expandedOverlay`. Se copia y adapta campos.

---

## Fase 3 — Satellite POV Mode

**Objetivo**: Al pulsar "Enter POV" en la ficha, la camara vuela a la posicion del satelite y lo sigue en tiempo real.

**Mecanismo** (reutiliza funciones existentes):

1. **Entrada al POV**:
```ts
map.flyTo({
  center: [satLon, satLat],
  zoom: 4.5,
  pitch: 55,
  bearing: satHeading,  // calculado del ground track
  duration: 1200,
  easing: (t) => 1 - Math.pow(1 - t, 3)
});
applyThemeAtmosphere(map, 'void', 'void', 1.0);  // espacio negro + estrellas
```

2. **Auto-follow** (RAF loop, mismo patron que auto-rotate):
```ts
const povStep = (ts: number) => {
  // El worker ya propaga posiciones cada 2s
  // Buscamos el feature del satelite seleccionado en el ultimo batch
  const sat = lastPositions.find(f => f.properties.noradId === selectedId);
  if (!sat) return;
  map.easeTo({
    center: sat.geometry.coordinates,
    duration: 2000,  // smooth 2s transition matching worker tick
    easing: (t) => t  // linear para seguimiento suave
  });
  povRafRef.current = requestAnimationFrame(povStep);
};
```

3. **Mini HUD overlay** (div absoluto sobre el mapa, no un popup):
```
╭─────────────────────────────╮
│  GPS BIIF-12 · 🇺🇸           │
│  Alt: 20,204 km  V: 3.87 km/s│
│  Lat: 38.221°  Lon: -94.331° │
│              [Exit POV]       │
╰─────────────────────────────╯
```

4. **Salida del POV**:
- Restaurar preset anterior (mismo patron que `nightLightsPrevStyle`)
- `flyTo({ center: [0,20], zoom: 2, pitch: 0, bearing: 0 })`
- Detener RAF loop

**Calculo de heading**: Del ground track, tomar los 2 puntos mas cercanos a `now` y calcular bearing con `Math.atan2(dlat, dlon)`. No necesita libreria extra.

**Calculo de velocidad**: `altitud` ya viene del worker. Velocidad orbital = `sqrt(GM / (R_earth + alt))` — constante calculable client-side.

**Archivos modificados**:
- `App.tsx` — estado `povMode`, boton en la card, HUD overlay
- `WorldMap.tsx` — nueva funcion imperative `enterSatellitePOV(noradId)` / `exitSatellitePOV()`
- `types.ts` — nuevos metodos en MapRefType
- `useSatelliteTracking.ts` — exponer `lastPositions` ref para que el POV loop lea posiciones

**Archivos nuevos**: Ninguno. Todo se integra en archivos existentes.

---

## Fase 4 — Skin contextual del globo

**Objetivo**: Cambiar automaticamente la atmosfera del globo segun el tipo de satelite al entrar en POV.

**Implementacion** (1 funcion, ~15 lineas):

```ts
const SAT_ATMOSPHERE: Record<string, { planet: PlanetPreset; space: SpacePreset; star: number }> = {
  military: { planet: 'crimson', space: 'void', star: 0.4 },
  weather:  { planet: 'arctic', space: 'deep', star: 0.95 },
  stations: { planet: 'orbital', space: 'deep', star: 1.0 },
  starlink: { planet: 'violet', space: 'galaxy', star: 0.9 },
};
```

Se aplica al entrar en POV y se restaura al salir (reutilizando el patron `nightLightsPrevStyle`).

**Archivos modificados**: Solo `WorldMap.tsx` (dentro de `enterSatellitePOV`).

---

## Resumen de dependencias entre fases

```
Fase 1 (database)
  └─► Fase 2 (card) ── usa los perfiles de Fase 1
        └─► Fase 3 (POV) ── boton en la card de Fase 2
              └─► Fase 4 (skin) ── se aplica dentro del POV de Fase 3
```

Cada fase es funcional por separado:
- Fase 1 sola = datos listos pero sin UI
- Fase 1+2 = ficha orbital completa sin POV
- Fase 1+2+3 = experiencia completa con follow-cam
- Fase 1+2+3+4 = toque visual final

## Estimacion de complejidad

| Fase | Archivos nuevos | Archivos modificados | Lineas estimadas |
|------|----------------|---------------------|-----------------|
| 1 | 1 | 0 | ~250 |
| 2 | 0 | 4 | ~200 (90% copiado) |
| 3 | 0 | 3 | ~150 |
| 4 | 0 | 1 | ~20 |
| **Total** | **1** | **4** | **~620** |
