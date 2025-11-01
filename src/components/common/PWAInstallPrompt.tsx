import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Download, Smartphone, Monitor } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { cn } from '@/lib/utils';

interface PWAInstallPromptProps {
  className?: string;
  autoShow?: boolean;
  showDelay?: number;
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({
  className,
  autoShow = true,
  showDelay = 30000, // 30 seconds
}) => {
  const { isInstalled, isInstallable, canInstall, installPWA, dismissPrompt } = usePWAInstall();
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenShown, setHasBeenShown] = useState(false);

  useEffect(() => {
    if (!autoShow || isInstalled || hasBeenShown) return;

    // Check if user has already dismissed the prompt
    const dismissed = localStorage.getItem('pwa-prompt-dismissed');
    if (dismissed) return;

    // Show prompt after delay
    const timer = setTimeout(() => {
      if (isInstallable) {
        setIsVisible(true);
        setHasBeenShown(true);
      }
    }, showDelay);

    return () => clearTimeout(timer);
  }, [autoShow, isInstalled, isInstallable, hasBeenShown, showDelay]);

  const handleInstall = async () => {
    const success = await installPWA();
    if (success) {
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('pwa-prompt-dismissed', 'true');
    dismissPrompt();
  };

  // Don't show if not installable, already installed, or dismissed
  if (!isVisible || !isInstallable || isInstalled) {
    return null;
  }

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  return (
    <div className={cn(
      'fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-2',
      className
    )}>
      <Card className="shadow-lg border-2 border-blue-200">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-blue-100 rounded">
                <Download className="w-4 h-4 text-blue-600" />
              </div>
              <CardTitle className="text-sm">Install Tradia</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-6 w-6 p-0"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <CardDescription className="text-xs">
            Install Tradia for a better experience with offline support and faster loading.
          </CardDescription>

          <div className="flex items-center gap-2 text-xs text-gray-600">
            {isIOS ? (
              <>
                <Smartphone className="w-3 h-3" />
                <span>Tap Share → Add to Home Screen</span>
              </>
            ) : isAndroid ? (
              <>
                <Smartphone className="w-3 h-3" />
                <span>Tap menu → Add to Home screen</span>
              </>
            ) : (
              <>
                <Monitor className="w-3 h-3" />
                <span>Click install button above</span>
              </>
            )}
          </div>

          <div className="flex gap-2">
            {canInstall && (
              <Button
                size="sm"
                onClick={handleInstall}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <Download className="w-3 h-3 mr-1" />
                Install Now
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={handleDismiss}
              className="flex-1"
            >
              Maybe Later
            </Button>
          </div>

          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-xs">
              Offline Ready
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Push Notifications
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Fast Loading
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
