import { useEffect } from 'react';

export interface KeyboardShortcuts {
  onOpenSettings?: () => void;
  onOpenDashboard?: () => void;
  onOpenHistory?: () => void;
  onClearChat?: () => void;
  onFocusInput?: () => void;
  onStopGeneration?: () => void;
}

/**
 * Hook to handle global keyboard shortcuts
 * 
 * Shortcuts:
 * - Ctrl/Cmd + K: Open Settings
 * - Ctrl/Cmd + D: Open Dashboard
 * - Ctrl/Cmd + H: Open History
 * - Ctrl/Cmd + L: Clear Chat
 * - Ctrl/Cmd + /: Focus input
 * - Escape: Stop generation (if active)
 */
export const useKeyboardShortcuts = (shortcuts: KeyboardShortcuts) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow Escape to stop generation even when typing
        if (e.key === 'Escape' && shortcuts.onStopGeneration) {
          e.preventDefault();
          shortcuts.onStopGeneration();
        }
        // Allow Ctrl/Cmd + / to focus input
        if ((e.ctrlKey || e.metaKey) && e.key === '/') {
          e.preventDefault();
          if (shortcuts.onFocusInput) {
            shortcuts.onFocusInput();
          }
        }
        return;
      }

      // Global shortcuts (only when not typing)
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'k':
            e.preventDefault();
            if (shortcuts.onOpenSettings) {
              shortcuts.onOpenSettings();
            }
            break;
          case 'd':
            e.preventDefault();
            if (shortcuts.onOpenDashboard) {
              shortcuts.onOpenDashboard();
            }
            break;
          case 'h':
            e.preventDefault();
            if (shortcuts.onOpenHistory) {
              shortcuts.onOpenHistory();
            }
            break;
          case 'l':
            e.preventDefault();
            if (shortcuts.onClearChat) {
              shortcuts.onClearChat();
            }
            break;
          case '/':
            e.preventDefault();
            if (shortcuts.onFocusInput) {
              shortcuts.onFocusInput();
            }
            break;
        }
      } else if (e.key === 'Escape') {
        // Escape key to stop generation
        if (shortcuts.onStopGeneration) {
          e.preventDefault();
          shortcuts.onStopGeneration();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts]);
};

