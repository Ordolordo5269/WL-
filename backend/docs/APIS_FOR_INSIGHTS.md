# APIs Adicionales para Enriquecer Insights de IA

Este documento lista APIs externas que podrían enriquecer el contexto enviado a DeepSeek para generar insights más completos y contextualizados.

## APIs Recomendadas por Categoría

### 1. Noticias y Eventos Geopolíticos

#### GDELT Project API
- **URL**: `https://api.gdeltproject.org/api/v2/doc/doc`
- **Gratis**: Sí (con límites)
- **Datos**: Eventos geopolíticos, protestas, conflictos, acuerdos comerciales
- **Uso**: Contexto de eventos recientes que afectan la economía del país
- **Ejemplo**: "En los últimos 6 meses, se registraron X protestas y Y acuerdos comerciales en [país]"

#### Event Registry API
- **URL**: `http://eventregistry.org/api`
- **Gratis**: Plan gratuito limitado
- **Datos**: Eventos globales categorizados por tipo y ubicación
- **Uso**: Eventos económicos y políticos relevantes

#### NewsAPI (Ampliar uso actual)
- **URL**: `https://newsapi.org/v2/everything`
- **Gratis**: Sí (500 requests/día)
- **Datos**: Noticias económicas y políticas recientes
- **Uso**: Ya la usas para conflictos; ampliar para buscar noticias económicas del país

### 2. Datos de Mercado y Finanzas

#### Alpha Vantage
- **URL**: `https://www.alphavantage.co/query`
- **Gratis**: Sí (5 calls/min, 500/día)
- **Datos**: Índices bursátiles, tipos de cambio, commodities
- **Uso**: Contexto de mercados financieros del país
- **Ejemplo**: "El índice bursátil principal de [país] ha mostrado una tendencia [alcista/bajista]"

#### Exchange Rates API
- **URL**: `https://api.exchangerate-api.com/v4/latest/`
- **Gratis**: Sí
- **Datos**: Tipos de cambio históricos y actuales
- **Uso**: Contexto de depreciación/apreciación de moneda

### 3. Comercio Internacional

#### UN Comtrade API
- **URL**: `https://comtradeapi.un.org/`
- **Gratis**: Sí (con registro)
- **Datos**: Importaciones/exportaciones por país y producto
- **Uso**: Contexto de comercio exterior y dependencias comerciales
- **Ejemplo**: "Las exportaciones principales de [país] son [productos], representando X% del PIB"

#### Trade Map (ITC)
- **URL**: `https://www.trademap.org/`
- **Gratis**: Parcial (algunos datos requieren suscripción)
- **Datos**: Estadísticas de comercio internacional detalladas

### 4. Energía y Recursos

#### IEA (International Energy Agency)
- **URL**: `https://www.iea.org/api`
- **Gratis**: Sí (datos públicos)
- **Datos**: Producción y consumo de energía
- **Uso**: Contexto para países exportadores/importadores de energía

#### EIA (US Energy Information Administration)
- **URL**: `https://www.eia.gov/opendata/`
- **Gratis**: Sí
- **Datos**: Datos de energía y petróleo globales

### 5. Desarrollo y Calidad de Vida

#### UNDP API
- **URL**: `https://api.hdr.undp.org/`
- **Gratis**: Sí
- **Datos**: Índices de desarrollo humano (HDI)
- **Uso**: Contexto de nivel de desarrollo del país

#### OECD API
- **URL**: `https://stats.oecd.org/SDMX-JSON/`
- **Gratis**: Sí (datos públicos)
- **Datos**: Estadísticas de países desarrollados
- **Uso**: Comparaciones con países desarrollados

### 6. Transparencia y Gobernanza

#### Transparency International
- **URL**: `https://www.transparency.org/` (datos disponibles, verificar API)
- **Gratis**: Sí
- **Datos**: Índices de corrupción (CPI)
- **Uso**: Contexto de gobernanza y corrupción

#### Freedom House API
- **URL**: Verificar disponibilidad de API
- **Datos**: Libertad y democracia
- **Uso**: Contexto político y de derechos

### 7. Clima y Desastres Naturales

#### OpenWeatherMap API
- **URL**: `https://api.openweathermap.org/data/2.5/`
- **Gratis**: Sí (60 calls/min)
- **Datos**: Datos climáticos históricos y actuales
- **Uso**: Contexto de desastres naturales que afectan economía (agricultura, turismo)

#### NASA Earth Data
- **URL**: `https://earthdata.nasa.gov/`
- **Gratis**: Sí
- **Datos**: Datos ambientales y climáticos

### 8. Migración y Demografía

#### UN Migration API
- **URL**: Verificar disponibilidad
- **Datos**: Flujos migratorios
- **Uso**: Contexto de migración que afecta economía (remesas, fuerza laboral)

### 9. Sanidad

#### WHO API
- **URL**: Verificar disponibilidad de API pública
- **Datos**: Datos de salud pública
- **Uso**: Contexto de salud que afecta productividad económica

## Implementación Sugerida

### Opción 1: Servicio de Contexto Enriquecido

Crear un nuevo servicio `context-enrichment.service.ts` que:

1. **Consulte múltiples APIs** según el tipo de indicador
2. **Agregue contexto relevante** al prompt de DeepSeek
3. **Cachee resultados** para evitar rate limits

### Opción 2: Modificar `deepseek.service.ts`

Agregar una función que enriquezca el `dataSummary` con contexto adicional:

```typescript
async function enrichContext(
  countryName: string,
  iso3: string,
  indicatorName: string
): Promise<string> {
  const contextParts: string[] = [];
  
  // 1. Noticias económicas recientes (NewsAPI)
  try {
    const news = await fetchRecentEconomicNews(countryName);
    if (news.length > 0) {
      contextParts.push(`Noticias económicas recientes: ${news.slice(0, 3).map(n => n.title).join('; ')}`);
    }
  } catch (e) {
    // Silently fail, no bloquea el insight
  }
  
  // 2. Eventos geopolíticos (GDELT)
  try {
    const events = await fetchRecentGeopoliticalEvents(iso3);
    if (events.length > 0) {
      contextParts.push(`Eventos geopolíticos recientes: ${events.slice(0, 3).map(e => e.title).join('; ')}`);
    }
  } catch (e) {
    // Silently fail
  }
  
  // 3. Datos de mercado (Alpha Vantage) - solo para indicadores económicos
  if (indicatorName.toLowerCase().includes('gdp') || indicatorName.toLowerCase().includes('export')) {
    try {
      const marketData = await fetchMarketData(iso3);
      if (marketData) {
        contextParts.push(`Contexto de mercado: ${marketData.summary}`);
      }
    } catch (e) {
      // Silently fail
    }
  }
  
  return contextParts.length > 0 
    ? `\n\nCONTEXTO ADICIONAL:\n${contextParts.join('\n')}`
    : '';
}
```

### Opción 3: Integración Gradual

1. **Fase 1**: Integrar NewsAPI para noticias económicas (ya la tienes)
2. **Fase 2**: Agregar GDELT para eventos geopolíticos
3. **Fase 3**: Agregar Alpha Vantage para datos de mercado
4. **Fase 4**: Agregar otras APIs según necesidad

## Consideraciones

### Rate Limits
- Implementar caché para evitar exceder límites
- Usar timeouts cortos (5-10s) para no bloquear insights
- Fallar silenciosamente si una API no responde

### Costos
- Priorizar APIs gratuitas
- Considerar límites de uso diario/mensual
- Implementar circuit breakers para APIs pagas

### Rendimiento
- Consultar APIs en paralelo cuando sea posible
- Cachear resultados por país/indicador (TTL: 1-24 horas)
- No bloquear la generación de insights si las APIs fallan

### Privacidad y Términos
- Revisar términos de servicio de cada API
- Respetar límites de uso
- No almacenar datos sensibles innecesariamente

## Ejemplo de Prompt Enriquecido

```
País: Argentina
Indicador: GDP
Período histórico: 2008 - 2023 (15 años de datos)
[... datos históricos ...]

CONTEXTO ADICIONAL:
- Noticias económicas recientes: "Argentina negocia nuevo acuerdo con FMI"; "Inflación alcanza nuevo récord"
- Eventos geopolíticos: "Protestas masivas por políticas económicas"; "Nuevo acuerdo comercial con China"
- Contexto de mercado: "Peso argentino se deprecia 15% en último trimestre"
```

Esto permite que la IA genere insights más contextualizados y relevantes.















