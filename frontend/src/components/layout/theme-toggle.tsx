'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor } from 'lucide-react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center gap-1 p-1 bg-secondary rounded-lg border border-border">
        <div className="w-7 h-7 rounded-md bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-1 p-1 bg-secondary rounded-lg border border-border shadow-xs"
      role="radiogroup"
      aria-label="Select color theme"
    >
      <button
        onClick={() => setTheme('light')}
        className={`p-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
          theme === 'light'
            ? 'bg-card text-foreground shadow-xs'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        title="Light mode"
        aria-checked={theme === 'light'}
        role="radio"
      >
        <Sun className="w-3.5 h-3.5 text-amber-500" />
        <span className="hidden sm:inline text-xs">Light</span>
      </button>

      <button
        onClick={() => setTheme('dark')}
        className={`p-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
          theme === 'dark'
            ? 'bg-card text-foreground shadow-xs'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        title="Dark mode"
        aria-checked={theme === 'dark'}
        role="radio"
      >
        <Moon className="w-3.5 h-3.5 text-blue-400" />
        <span className="hidden sm:inline text-xs">Dark</span>
      </button>

      <button
        onClick={() => setTheme('system')}
        className={`p-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
          theme === 'system'
            ? 'bg-card text-foreground shadow-xs'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        title="Follow system theme"
        aria-checked={theme === 'system'}
        role="radio"
      >
        <Monitor className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="hidden sm:inline text-xs">System</span>
      </button>
    </div>
  );
}
