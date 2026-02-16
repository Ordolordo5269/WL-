import React, { memo, Suspense } from 'react';
import type { ReactNode } from 'react';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';

interface LazySectionProps {
  children: ReactNode;
  fallback?: ReactNode;
  className?: string;
  threshold?: number;
  rootMargin?: string;
}

const LazySection: React.FC<LazySectionProps> = memo(({ 
  children, 
  fallback = <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-white/60">Cargando...</div></div>, 
  className = '',
  threshold = 0.1,
  rootMargin = '100px'
}) => {
  const { elementRef, hasIntersected } = useIntersectionObserver({
    threshold,
    rootMargin,
    triggerOnce: true
  });

  return (
    <div ref={elementRef as React.RefObject<HTMLDivElement>} className={className}>
      {hasIntersected ? (
        <Suspense fallback={fallback}>
          {children}
        </Suspense>
      ) : (
        fallback
      )}
    </div>
  );
});

LazySection.displayName = 'LazySection';

export default LazySection;