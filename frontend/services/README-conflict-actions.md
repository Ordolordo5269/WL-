# Conflict Actions Service

Este módulo maneja todas las acciones relacionadas con conflictos de manera independiente, reduciendo la carga del componente ConflictTracker.

## Características

- **Separación de responsabilidades**: Las acciones de conflictos están separadas de la lógica de UI
- **Reutilizable**: Puede ser usado por otros componentes que necesiten manejar conflictos
- **Manejo de estado**: Mantiene el estado del conflicto seleccionado internamente
- **API limpia**: Proporciona una interfaz simple para manejar acciones

## Uso

### Con useConflictActions (Recomendado para React)

```typescript
import { useConflictActions } from '../services/conflict-actions';

const MyComponent = ({ onBack, onCenterMap, onConflictSelect }) => {
  const { handleConflictClick, handleBack, getSelectedConflict, clearSelection } = useConflictActions({
    onBack,
    onCenterMap,
    onConflictSelect
  });

  // Usar las funciones...
};
```

### Con ConflictActionService directamente

```typescript
import { ConflictActionService } from '../services/conflict-actions';

const actionService = new ConflictActionService({
  onBack: () => console.log('Back'),
  onCenterMap: (coords) => console.log('Center map', coords),
  onConflictSelect: (id) => console.log('Select conflict', id)
});

actionService.handleConflictClick(conflict);
```

## API

### ConflictActionHandlers

```typescript
interface ConflictActionHandlers {
  onCenterMap?: (coordinates: { lat: number; lng: number }) => void;
  onConflictSelect?: (conflictId: string | null) => void;
  onBack: () => void;
}
```

### Métodos principales

- `handleConflictClick(conflict)`: Maneja el clic en un conflicto
- `handleBack()`: Maneja la acción de volver
- `getSelectedConflict()`: Obtiene el conflicto actualmente seleccionado
- `clearSelection()`: Limpia la selección actual

## Beneficios

1. **Reducción de código**: El ConflictTracker ya no necesita manejar estas acciones
2. **Mejor testabilidad**: Las acciones pueden ser probadas independientemente
3. **Reutilización**: Otros componentes pueden usar el mismo servicio
4. **Mantenibilidad**: Cambios en la lógica de acciones solo afectan este módulo