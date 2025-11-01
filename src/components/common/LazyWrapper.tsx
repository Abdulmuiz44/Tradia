import React, { Suspense, ComponentType } from 'react';
import { LoadingSpinner } from './Skeleton';

interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  delay?: number;
  centerSpinner?: boolean;
}

export const LazyWrapper: React.FC<LazyWrapperProps> = ({
  children,
  fallback,
  delay = 5000, // Reduced from 100ms to 5 seconds
  centerSpinner = false
}) => {
  const [showLoader, setShowLoader] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setShowLoader(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const defaultFallback = showLoader ? (
    centerSpinner ? (
      <LoadingSpinner size="lg" centered={true} />
    ) : (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    )
  ) : null;

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  );
};

// Higher-order component for lazy loading
export function withLazyLoading<P extends object>(
  importFunc: () => Promise<{ default: ComponentType<P> }>,
  fallback?: React.ReactNode
) {
  const LazyComponent = React.lazy(importFunc);

  return React.forwardRef<ComponentType<P>, P>((props, ref) => (
    <LazyWrapper fallback={fallback}>
      <LazyComponent {...props} ref={ref} />
    </LazyWrapper>
  ));
}

// Utility for lazy loading pages
export function lazyPage(importFunc: () => Promise<any>) {
  return React.lazy(importFunc);
}
