import React from 'react';
import { LoadingSpinner, ChatMessageSkeleton, PricingCardSkeleton, ProfileSkeleton, UsageDashboardSkeleton } from './Skeleton';
import { cn } from '@/lib/utils';

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  className?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  message = 'Loading...',
  className,
}) => {
  if (!isVisible) return null;

  return (
    <div className={cn(
      'fixed inset-0 bg-black/50 flex items-center justify-center z-50',
      className
    )}>
      <div className="bg-white rounded-lg p-6 flex items-center gap-4 shadow-lg">
        <LoadingSpinner size="lg" />
        <span className="text-gray-700">{message}</span>
      </div>
    </div>
  );
};

interface PageLoaderProps {
  type: 'chat' | 'pricing' | 'profile' | 'dashboard';
  className?: string;
}

export const PageLoader: React.FC<PageLoaderProps> = ({ type, className }) => {
  const renderLoader = () => {
    switch (type) {
      case 'chat':
        return (
          <div className="space-y-4 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <ChatMessageSkeleton key={i} />
            ))}
          </div>
        );

      case 'pricing':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <PricingCardSkeleton key={i} />
            ))}
          </div>
        );

      case 'profile':
        return <ProfileSkeleton />;

      case 'dashboard':
        return <UsageDashboardSkeleton />;

      default:
        return <LoadingSpinner size="lg" />;
    }
  };

  return (
    <div className={cn('animate-pulse', className)}>
      {renderLoader()}
    </div>
  );
};

// Button loading state
interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

export const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ loading = false, loadingText, children, disabled, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center',
          loading && 'cursor-not-allowed opacity-75',
          className
        )}
        {...props}
      >
        {loading && <LoadingSpinner size="sm" className="mr-2" />}
        {loading ? (loadingText || 'Loading...') : children}
      </button>
    );
  }
);

LoadingButton.displayName = 'LoadingButton';

// Form loading state
interface FormLoaderProps {
  isLoading: boolean;
  children: React.ReactNode;
  loadingText?: string;
}

export const FormLoader: React.FC<FormLoaderProps> = ({
  isLoading,
  children,
  loadingText = 'Submitting...',
}) => {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-md">
          <div className="flex items-center gap-2">
            <LoadingSpinner size="sm" />
            <span className="text-sm text-gray-600">{loadingText}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Progressive loading hook
export const useProgressiveLoading = (items: any[], batchSize: number = 10) => {
  const [loadedItems, setLoadedItems] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (items.length === 0) {
      setIsLoading(false);
      return;
    }

    let currentIndex = 0;

    const loadBatch = () => {
      const nextBatch = items.slice(currentIndex, currentIndex + batchSize);
      setLoadedItems(prev => [...prev, ...nextBatch]);
      currentIndex += batchSize;

      if (currentIndex < items.length) {
        setTimeout(loadBatch, 100); // Small delay for smooth loading
      } else {
        setIsLoading(false);
      }
    };

    loadBatch();
  }, [items, batchSize]);

  return { loadedItems, isLoading };
};

// Intersection Observer for lazy loading
export const useLazyLoading = (threshold: number = 0.1) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const [hasBeenVisible, setHasBeenVisible] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          setHasBeenVisible(true);
        } else {
          setIsVisible(false);
        }
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible, hasBeenVisible };
};
