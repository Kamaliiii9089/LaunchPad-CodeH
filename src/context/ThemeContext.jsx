import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

/**
 * ============================================
 * BREACHBUDDY THEME CONTEXT
 * Dynamic Theme Engine for Multi-Theme Support
 * ============================================
 * 
 * This context provides:
 * - Theme switching between 'breach-dark', 'security-blue', 'high-contrast'
 * - Persistence to localStorage
 * - Backend sync for authenticated users
 * - Smooth theme transition animations
 * - GSAP/Framer Motion animation duration sync
 */

// Available themes configuration
export const THEMES = {
  'breach-dark': {
    id: 'breach-dark',
    name: 'Breach Dark',
    description: 'Sleek cybersecurity-inspired dark theme',
    icon: '🛡️',
    preview: {
      primary: '#00d4ff',
      secondary: '#6b73ff',
      bg: '#0a0a0a'
    }
  },
  'security-blue': {
    id: 'security-blue',
    name: 'Security Blue',
    description: 'Professional corporate security theme',
    icon: '🔒',
    preview: {
      primary: '#3b82f6',
      secondary: '#0ea5e9',
      bg: '#0f172a'
    }
  },
  'high-contrast': {
    id: 'high-contrast',
    name: 'High Contrast',
    description: 'WCAG AAA compliant accessibility theme',
    icon: '♿',
    preview: {
      primary: '#00e5ff',
      secondary: '#ffeb3b',
      bg: '#000000'
    }
  }
};

// Animation duration constants (in seconds) - synced with CSS variables
export const ANIMATION_DURATIONS = {
  fast: 0.2,
  normal: 0.4,
  slow: 0.6,
  verySlow: 1.0
};

// Storage key for theme preference
const THEME_STORAGE_KEY = 'breachbuddy-theme';

// Theme context
const ThemeContext = createContext(undefined);

/**
 * Theme Provider Component
 * Wraps the application to provide theme state and controls
 */
export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState('breach-dark');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [systemPrefersDark, setSystemPrefersDark] = useState(true);

  // Get initial theme from localStorage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    
    if (savedTheme && THEMES[savedTheme]) {
      setThemeState(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setSystemPrefersDark(prefersDark);
      // Default to breach-dark for dark preference, security-blue for light
      const defaultTheme = prefersDark ? 'breach-dark' : 'security-blue';
      setThemeState(defaultTheme);
      document.documentElement.setAttribute('data-theme', defaultTheme);
    }
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e) => {
      setSystemPrefersDark(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  /**
   * Set theme with smooth transition animation
   * @param {string} newTheme - Theme ID to switch to
   * @param {boolean} persist - Whether to save to localStorage (default: true)
   */
  const setTheme = useCallback(async (newTheme, persist = true) => {
    if (!THEMES[newTheme] || newTheme === theme) return;

    // Start transition
    setIsTransitioning(true);
    document.documentElement.classList.add('theme-transitioning');

    // Wait for next frame to ensure class is applied
    await new Promise(resolve => requestAnimationFrame(resolve));

    // Apply new theme
    document.documentElement.setAttribute('data-theme', newTheme);
    setThemeState(newTheme);

    // Persist to localStorage
    if (persist) {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    }

    // End transition after animation completes
    setTimeout(() => {
      setIsTransitioning(false);
      document.documentElement.classList.remove('theme-transitioning');
    }, 400); // Match CSS transition duration
  }, [theme]);

  /**
   * Cycle to next theme
   */
  const cycleTheme = useCallback(() => {
    const themeKeys = Object.keys(THEMES);
    const currentIndex = themeKeys.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themeKeys.length;
    setTheme(themeKeys[nextIndex]);
  }, [theme, setTheme]);

  /**
   * Reset to default theme
   */
  const resetTheme = useCallback(() => {
    localStorage.removeItem(THEME_STORAGE_KEY);
    setTheme('breach-dark');
  }, [setTheme]);

  /**
   * Get CSS variable value for current theme
   * Useful for GSAP/Framer Motion animations
   * @param {string} variableName - CSS variable name (without --)
   */
  const getThemeVariable = useCallback((variableName) => {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(`--theme-${variableName}`)
      .trim();
  }, []);

  /**
   * Get animation duration in seconds
   * @param {'fast' | 'normal' | 'slow' | 'verySlow'} speed - Animation speed
   */
  const getAnimationDuration = useCallback((speed = 'normal') => {
    return ANIMATION_DURATIONS[speed] || ANIMATION_DURATIONS.normal;
  }, []);

  /**
   * Get theme-aware animation config for Framer Motion
   */
  const getMotionConfig = useCallback((speed = 'normal') => {
    return {
      duration: getAnimationDuration(speed),
      ease: [0.4, 0, 0.2, 1] // Smooth easing
    };
  }, [getAnimationDuration]);

  /**
   * Get current theme's primary color
   */
  const getPrimaryColor = useCallback(() => {
    return THEMES[theme]?.preview?.primary || '#00d4ff';
  }, [theme]);

  /**
   * Get current theme's secondary color
   */
  const getSecondaryColor = useCallback(() => {
    return THEMES[theme]?.preview?.secondary || '#6b73ff';
  }, [theme]);

  // Context value
  const value = {
    // Current state
    theme,
    themeConfig: THEMES[theme],
    availableThemes: THEMES,
    isTransitioning,
    systemPrefersDark,
    
    // Actions
    setTheme,
    cycleTheme,
    resetTheme,
    
    // Utilities
    getThemeVariable,
    getAnimationDuration,
    getMotionConfig,
    getPrimaryColor,
    getSecondaryColor,
    
    // Constants
    ANIMATION_DURATIONS
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * Hook to access theme context
 * @throws {Error} If used outside ThemeProvider
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
};

/**
 * Hook to get theme-aware animation parameters for GSAP
 * @param {gsap} gsap - GSAP instance
 */
export const useGsapTheme = (gsap) => {
  const { getThemeVariable, getAnimationDuration, theme } = useTheme();
  
  // Update GSAP defaults when theme changes
  useEffect(() => {
    if (gsap) {
      gsap.defaults({
        duration: getAnimationDuration('normal'),
        ease: 'power2.out'
      });
    }
  }, [gsap, theme, getAnimationDuration]);
  
  return {
    duration: {
      fast: getAnimationDuration('fast'),
      normal: getAnimationDuration('normal'),
      slow: getAnimationDuration('slow')
    },
    colors: {
      primary: getThemeVariable('primary'),
      secondary: getThemeVariable('secondary'),
      accent: getThemeVariable('accent')
    },
    getVar: getThemeVariable
  };
};

export default ThemeContext;
