'use client';

import { useTheme } from '@/lib/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // Avoid hydration mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return <div className="p-2 w-9 h-9" />;

    const isDark = theme === 'dark' || (theme === undefined && typeof window !== 'undefined' && document.documentElement.classList.contains('dark'));

    return (
        <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-300 flex items-center justify-center border border-gray-200 dark:border-gray-700 cursor-pointer shadow-sm active:scale-95"
            aria-label="Toggle Theme"
        >
            {isDark ? (
                <Sun size={18} className="text-yellow-400 animate-fadeIn" />
            ) : (
                <Moon size={18} className="text-blue-600 animate-fadeIn" />
            )}
        </button>
    );
}
