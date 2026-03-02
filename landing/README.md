# Worldlore Interface 2

Este proyecto es una aplicación web desarrollada con Vite, React, TypeScript, Tailwind CSS y Framer Motion.

## Tecnologías utilizadas

- [Vite](https://vitejs.dev/) - Herramienta de construcción rápida para desarrollo web
- [React](https://react.dev/) - Biblioteca de JavaScript para construir interfaces de usuario
- [TypeScript](https://www.typescriptlang.org/) - Superset tipado de JavaScript
- [Tailwind CSS](https://tailwindcss.com/) - Framework CSS de utilidades de primera clase
- [Framer Motion](https://www.framer.com/motion/) - Biblioteca para animaciones en React

## Requisitos previos

- Node.js (versión 18 o superior)
- npm (incluido con Node.js)

## Instalación

```bash
# Instalar dependencias
npm install
```

## Desarrollo

```bash
# Iniciar servidor de desarrollo
npm run dev
```

El servidor de desarrollo estará disponible en http://localhost:5174/

## Construcción para producción

```bash
# Construir para producción
npm run build
```

## Vista previa de la construcción

```bash
# Previsualizar la construcción de producción
npm run preview
```

## Estructura del proyecto

```
/
├── public/            # Archivos estáticos
├── src/               # Código fuente
│   ├── assets/        # Recursos (imágenes, fuentes, etc.)
│   ├── components/    # Componentes de React
│   │   ├── Card.tsx           # Componente de tarjeta con Tailwind CSS
│   │   └── MotionExample.tsx  # Componente de ejemplo con Framer Motion
│   ├── App.tsx        # Componente principal
│   ├── main.tsx       # Punto de entrada
│   └── index.css      # Estilos globales con Tailwind
├── index.html         # Plantilla HTML
├── tailwind.config.ts # Configuración de Tailwind CSS
├── postcss.config.js  # Configuración de PostCSS
└── vite.config.ts     # Configuración de Vite
```

## Uso de Framer Motion

Framer Motion está instalado y listo para usar en cualquier componente. Puedes importar `motion` desde 'framer-motion':

```tsx
import { motion } from 'framer-motion';

const MyComponent = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      Contenido animado
    </motion.div>
  );
};
```

Consulta el componente `MotionExample.tsx` para ver un ejemplo práctico de implementación.
