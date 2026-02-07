# 📊 Nuevos Indicadores en Statistics Panel

## 🎯 Indicadores Seleccionados para el Mapa (5 nuevos)

### Indicadores Actuales (5)
1. ✅ GDP (current US$) - Logarítmico
2. ✅ GDP per Capita (US$) - Logarítmico
3. ✅ Inflation Rate (%) - Lineal
4. ✅ GINI Index - Lineal (0-100)
5. ✅ Exports (US$) - Logarítmico

### Nuevos Indicadores (5)

#### 1. **Life Expectancy** (Society)
- **Slug**: `life-expectancy`
- **DB Code**: `LIFE_EXPECTANCY`
- **WB Code**: `SP.DYN.LE00.IN`
- **Unidad**: Años
- **Escala**: Lineal (50-85 años típicamente)
- **Cobertura**: ~200 países
- **Interpretación**: Verde = alta esperanza vida, Rojo = baja

#### 2. **Population Density** (Society)
- **Slug**: `population-density`
- **DB Code**: `POPULATION_DENSITY`
- **WB Code**: `SP.POP.DNST`
- **Unidad**: Personas por km²
- **Escala**: Logarítmica (0.1 - 20,000)
- **Cobertura**: ~200 países
- **Interpretación**: Muestra urbanización/concentración poblacional

#### 3. **Military Expenditure** (Defense)
- **Slug**: `military-expenditure`
- **DB Code**: `MILITARY_EXPENDITURE_PCT_GDP`
- **WB Code**: `MS.MIL.XPND.GD.ZS`
- **Unidad**: % del GDP
- **Escala**: Lineal (0-15% típicamente)
- **Cobertura**: ~160 países
- **Interpretación**: Muestra inversión en defensa nacional

#### 4. **Democracy Index** (Politics)
- **Slug**: `democracy-index`
- **DB Code**: `WGI_VOICE_ACCOUNTABILITY`
- **WB Code**: `VA.EST`
- **Unidad**: Índice 0-10
- **Escala**: Lineal
- **Cobertura**: ~180 países
- **Nota**: Calculado desde WGI Voice & Accountability: `((VA.EST + 2.5) / 5) * 10`
- **Interpretación**: Verde = más democrático, Rojo = menos democrático

#### 5. **Trade (% of GDP)** (International)
- **Slug**: `trade-gdp`
- **DB Code**: `TRADE_PERCENT_GDP`
- **WB Code**: `NE.TRD.GNFS.ZS`
- **Unidad**: % del GDP
- **Escala**: Lineal (0-200%, algunos países pequeños >100%)
- **Cobertura**: ~190 países
- **Interpretación**: Muestra apertura comercial del país

---

## 🎨 Configuración de Visualización

### Life Expectancy
```typescript
{
  slug: 'life-expectancy',
  buckets: 7,
  useLog: false,
  formatter: (v) => `${v.toFixed(1)} years`,
  palette: ['#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c']
}
```

### Population Density
```typescript
{
  slug: 'population-density',
  buckets: 7,
  useLog: true,
  formatter: (v) => `${v.toFixed(1)} /km²`,
  palette: ['#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8']
}
```

### Military Expenditure
```typescript
{
  slug: 'military-expenditure',
  buckets: 7,
  useLog: false,
  formatter: (v) => `${v.toFixed(2)}%`,
  palette: ['#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309']
}
```

### Democracy Index
```typescript
{
  slug: 'democracy-index',
  buckets: 7,
  useLog: false,
  formatter: (v) => v.toFixed(1),
  palette: ['#fee2e2', '#fecaca', '#fca5a5', '#86efac', '#4ade80', '#22c55e', '#16a34a']
  // Note: Inverted colors (low = red, high = green)
}
```

### Trade % GDP
```typescript
{
  slug: 'trade-gdp',
  buckets: 7,
  useLog: false,
  formatter: (v) => `${v.toFixed(1)}%`,
  palette: ['#e0e7ff', '#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5', '#4338ca']
}
```

---

## 📂 Archivos Modificados

### Backend
- ✅ `backend/src/services/indicator.service.ts` - Mapeo de slugs actualizado

### Frontend
- ✅ `frontend/components/WorldMap.tsx` - MetricId type actualizado, layers añadidos
- ✅ `frontend/src/App.tsx` - Estados y tipos añadidos
- ✅ `frontend/services/indicators-db.ts` - Fallback codes añadidos
- ⏳ `frontend/src/App.tsx` - Efectos useEffect pendientes
- ⏳ `frontend/components/LeftSidebar.tsx` - UI pendiente

---

## 🚀 Próximos Pasos

### 1. Completar App.tsx
Agregar 5 useEffect similares a los existentes (GDP, Inflation, etc.)

### 2. Actualizar LeftSidebar.tsx
Añadir controles Show/Hide para los 5 nuevos indicadores en el panel de Statistics

### 3. Testing
Verificar que cada indicador se visualice correctamente en el mapa

---

## 💡 Orden en UI (Sugerido)

```
Statistics Panel:
├── Economy (5)
│   ├── GDP (US$)
│   ├── GDP per Capita (US$)
│   ├── Inflation Rate (%)
│   ├── GINI Index
│   └── Exports (US$)
│
├── Society (2)
│   ├── Life Expectancy NEW
│   └── Population Density NEW
│
├── Politics (1)
│   └── Democracy Index NEW
│
├── Defense (1)
│   └── Military Expenditure (% GDP) NEW
│
└── International (1)
    └── Trade (% GDP) NEW
```

**Total**: 10 indicadores (5 actuales + 5 nuevos)













