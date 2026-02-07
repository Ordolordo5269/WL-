# Análisis de fluidez y rendimiento - WorldLore

## Resumen ejecutivo

La aplicación presenta varias causas que pueden afectar la fluidez:

1. **Exceso de estado y re-renders** en `App.tsx`
2. **backdrop-filter** costoso en muchos elementos
3. **Efectos del mapa** que se re-ejecutan con demasiada frecuencia
4. **Handlers de mousemove** sin throttling
5. **Falta de memoización** en componentes pesados
6. **Llamadas API simultáneas** al abrir el sidebar

---

## 1. App.tsx – Demasiado estado centralizado

**Problema:** Más de 30 variables `useState` en un solo componente. Cada cambio de estado provoca un re-render completo del árbol (WorldMap, LeftSidebar, CountrySidebar, etc.).

**Ubicación:** `frontend/src/App.tsx` líneas 55-118

**Impacto:** Alto – cualquier toggle (GDP, inflación, sidebar, etc.) re-renderiza todo.

**Recomendaciones:**
- Dividir estado en contextos o sub-componentes
- Usar `useReducer` para estado relacionado (ej. todos los indicadores de choropleth)
- Mover el estado de la sidebar izquierda a un contexto separado

---

## 2. backdrop-filter – Coste GPU elevado

**Problema:** `backdrop-filter: blur(18px–25px)` en muchos elementos. El blur se recalcula en cada frame durante animaciones y scroll.

**Archivos afectados:**
- `sidebar.css`: `.country-sidebar` blur(20px), `.left-sidebar` blur(25px)
- `compare-countries.css`: múltiples blur(4px–20px)
- `conflict-tracker.css`: blur(20px)
- `geocoder.css`: blur(25px) !important
- `predictive-analysis.css`, `dashboard.css`, `auth-forms.css`

**Recomendaciones:**
- Reducir blur en elementos que se animan (ej. 20px → 12px en sidebars)
- Evitar `backdrop-filter` en overlays animados; usar `background: rgba()` sólido
- En móviles, usar `blur(8px)` o desactivar si no es esencial

---

## 3. WorldMap – useEffect con demasiadas dependencias

**Problema:** El efecto principal (línea ~1623) depende de `[conflicts, handleCountrySelection, applyFog, applyPhysicalModeTweaks, styleKey, minimalModeOn, setBaseFeaturesVisibility]`.

Cuando cambia `styleKey` o `minimalModeOn`:
- Se eliminan todos los event listeners
- Se vuelven a añadir capas
- Se reconfigura el mapa

**Ubicación:** `frontend/src/components/WorldMap.tsx` ~línea 1623

**Recomendaciones:**
- Separar efectos: uno para listeners (click, mousemove) y otro para estilos/capas
- Usar refs para `applyFog`, `applyPhysicalModeTweaks` en lugar de incluirlos en el array de dependencias
- Evitar que `styleKey` y `minimalModeOn` provoquen re-registro de listeners

---

## 4. mousemove sin throttling

**Problema:** `handleMouseMove` se ejecuta en cada movimiento del ratón sobre el mapa. Hay debounce de 50ms para `setFeatureState`, pero el handler se invoca en cada evento.

**Ubicación:** `frontend/src/components/WorldMap.tsx` ~líneas 1393–1418

**Recomendaciones:**
- Añadir `throttle` (ej. 100ms) al handler de mousemove
- Usar `requestAnimationFrame` para limitar actualizaciones a ~60fps
- Evitar acceso a `e.features` en cada evento si no es necesario

---

## 5. Falta de React.memo

**Problema:** No se usa `React.memo` en componentes pesados. Cualquier re-render de `App` obliga a re-renderizar:
- WorldMap
- CountrySidebar
- LeftSidebar
- ConflictTracker
- CompareCountriesView
- etc.

**Recomendaciones:**
- Envolver `WorldMap`, `CountrySidebar`, `LeftSidebar` en `React.memo`
- Asegurar que las props estables usen `useCallback`/`useMemo` en el padre
- Revisar que `handleToggleLeftSidebar` no cambie en cada render (hoy depende de `sidebars.menu`)

---

## 6. CountrySidebar – Datos en paralelo

**Problema:** Al abrir o expandir el sidebar se disparan varias peticiones a la vez:
- useCountryBasicInfo
- useEconomyData, useSocietyData, usePoliticsData, etc. (cuando están abiertas)

**Ubicación:** `frontend/components/CountrySidebar.tsx` líneas 161–220

**Nota:** Ya existe lazy loading por categoría; el problema es cuando se expande la vista.

**Recomendaciones:**
- Secuenciar peticiones (prioridad: BasicInfo → Economy → Society → …)
- Usar `React.Suspense` o estados de carga para evitar bloqueos
- Cachear respuestas por país (React Query/SWR ya lo hacen en los hooks)

---

## 7. will-change usado en exceso

**Problema:** `will-change: transform, opacity` en varios elementos. Crea capas de composición; demasiadas aumentan el uso de memoria.

**Ubicación:** `sidebar.css`, `index.css`

**Recomendaciones:**
- Usar `will-change` solo durante animaciones activas
- Quitar `will-change` cuando la animación termine (en `onAnimationComplete` o similar)

---

## 8. Mapbox – Cambios de estilo

**Problema:** Cambiar el estilo del mapa (night/light/outdoors) fuerza:
- Recarga de tiles
- Recreación de capas
- Posible parpadeo

**Recomendaciones:**
- Ya está en `performanceMetricsCollection: false` ✓
- Considerar transiciones más suaves o pre-carga de estilos

---

## 9. Framer Motion

**Problema:** `AnimatePresence` y `motion.div` añaden trabajo de animación. En componentes con mucho contenido (sidebar, comparador) puede notarse.

**Recomendaciones:**
- Usar `layout={false}` donde no se necesite layout animation
- Reducir duración de transiciones (ej. 0.3s → 0.2s)
- Evitar animaciones en listas largas; usar `layout` solo en elementos visibles

---

## Prioridad de actuación

| Prioridad | Tema              | Impacto | Esfuerzo |
|-----------|-------------------|---------|-----------|
| 1         | backdrop-filter   | Alto    | Bajo      |
| 2         | React.memo        | Alto    | Medio     |
| 3         | mousemove throttle| Medio   | Bajo      |
| 4         | Dividir App state | Alto    | Alto      |
| 5         | useEffect WorldMap| Medio   | Medio     |
| 6         | will-change       | Bajo    | Bajo      |

---

## Cambios rápidos sugeridos

1. **sidebar.css**: Reducir `backdrop-filter: blur(20px)` a `blur(12px)` en `.country-sidebar`
2. **WorldMap**: Añadir throttle al handler de mousemove
3. **App.tsx**: Envolver `WorldMap` en `React.memo` y pasar callbacks estables
4. **sidebar.css**: Usar `will-change` solo durante animaciones de entrada/salida
