import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Minus, Square, X, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

type WindowState = {
  isMaximized: boolean;
  isFullScreen: boolean;
};

const Titlebar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.electron) {
      return;
    }

    let cleanup: (() => void) | undefined;

    window.electron
      .getWindowState?.()
      .then((state) => {
        if (!state) return;
        setIsMaximized(state.isMaximized || state.isFullScreen);
      })
      .catch((error) => {
        console.error('[Titlebar] Failed to fetch initial window state:', error);
      });

    cleanup = window.electron.onWindowStateChange?.((state: WindowState) => {
      setIsMaximized(state.isMaximized || state.isFullScreen);
    });

    return () => {
      cleanup?.();
    };
  }, []);

  const handleMinimize = useCallback(() => {
    window.electron?.minimize?.();
  }, []);

  const handleMaximizeToggle = useCallback(() => {
    window.electron?.maximize?.();
  }, []);

  const handleClose = useCallback(() => {
    window.electron?.close?.();
  }, []);

  const containerStyle = useMemo(
    () => ({ WebkitAppRegion: 'drag' } as React.CSSProperties),
    [],
  );

  const noDragStyle = useMemo(
    () => ({ WebkitAppRegion: 'no-drag' } as React.CSSProperties),
    [],
  );

  const handleDoubleClick = useCallback(() => {
    window.electron?.maximize?.();
  }, []);

  const ControlIcon = isMaximized ? Copy : Square;

  const controlButtonBase =
    'flex h-8 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

  return (
    <>
      <div
        className="fixed top-0 left-0 right-0 z-[60] flex h-10 items-center justify-between gap-3 border-b border-border bg-background px-3 text-sm font-medium text-foreground select-none"
        style={containerStyle}
        onDoubleClick={handleDoubleClick}
      >
        <div className="flex flex-1 items-center gap-2 overflow-hidden">
          <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            SimpleCRM
          </span>
        </div>
        <div
          className="flex items-center gap-1"
          style={noDragStyle}
        >
          <button
            type="button"
            aria-label="Minimize window"
            className={cn(controlButtonBase, 'hover:bg-muted')}
            onClick={handleMinimize}
          >
            <Minus className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
          <button
            type="button"
            aria-label={isMaximized ? 'Restore window' : 'Maximize window'}
            className={cn(controlButtonBase, 'hover:bg-muted')}
            onClick={handleMaximizeToggle}
          >
            <ControlIcon className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
          <button
            type="button"
            aria-label="Close window"
            className={cn(
              controlButtonBase,
              'hover:bg-destructive hover:text-destructive-foreground',
            )}
            onClick={handleClose}
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
      </div>
      <div className="h-10 w-full" aria-hidden />
    </>
  );
};

export default Titlebar;
