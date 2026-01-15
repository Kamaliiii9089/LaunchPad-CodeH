import React from 'react';
import { useTheme, THEMES } from '../../context/ThemeContext';
import { FiMoon, FiSun, FiMonitor, FiCheck } from 'react-icons/fi';
import './ThemeSwitcher.css';

/**
 * ============================================
 * THEME SWITCHER COMPONENT
 * Elegant theme selection UI with previews
 * ============================================
 */

const ThemeSwitcher = ({
    variant = 'dropdown', // 'dropdown' | 'inline' | 'compact'
    showLabels = true,
    className = ''
}) => {
    const {
        theme,
        setTheme,
        cycleTheme,
        availableThemes,
        isTransitioning
    } = useTheme();

    // Compact variant - just a cycle button
    if (variant === 'compact') {
        return (
            <button
                className={`theme-switcher-compact ${className}`}
                onClick={cycleTheme}
                disabled={isTransitioning}
                aria-label="Switch theme"
                title={`Current: ${availableThemes[theme]?.name}`}
            >
                <span className="theme-icon">{availableThemes[theme]?.icon}</span>
            </button>
        );
    }

    // Inline variant - all options visible
    if (variant === 'inline') {
        return (
            <div className={`theme-switcher-inline ${className}`}>
                {showLabels && <span className="theme-label">Theme:</span>}
                <div className="theme-options">
                    {Object.values(availableThemes).map((themeOption) => (
                        <button
                            key={themeOption.id}
                            className={`theme-option ${theme === themeOption.id ? 'active' : ''}`}
                            onClick={() => setTheme(themeOption.id)}
                            disabled={isTransitioning}
                            aria-label={`Switch to ${themeOption.name}`}
                            title={themeOption.description}
                        >
                            <span className="theme-icon">{themeOption.icon}</span>
                            {showLabels && (
                                <span className="theme-name">{themeOption.name}</span>
                            )}
                            {theme === themeOption.id && (
                                <FiCheck className="check-icon" />
                            )}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // Default dropdown variant
    return (
        <div className={`theme-switcher-dropdown ${className}`}>
            <button
                className="theme-trigger"
                aria-label="Open theme selector"
                aria-haspopup="true"
            >
                <span className="theme-icon">{availableThemes[theme]?.icon}</span>
                {showLabels && (
                    <span className="theme-name">{availableThemes[theme]?.name}</span>
                )}
            </button>

            <div className="theme-dropdown-menu" role="menu">
                <div className="dropdown-header">
                    <span>🎨 Choose Theme</span>
                </div>

                {Object.values(availableThemes).map((themeOption) => (
                    <button
                        key={themeOption.id}
                        className={`dropdown-item ${theme === themeOption.id ? 'active' : ''}`}
                        onClick={() => setTheme(themeOption.id)}
                        disabled={isTransitioning}
                        role="menuitem"
                        aria-current={theme === themeOption.id ? 'true' : 'false'}
                    >
                        <div className="theme-preview">
                            <div
                                className="preview-swatch"
                                style={{
                                    background: `linear-gradient(135deg, ${themeOption.preview.primary}, ${themeOption.preview.secondary})`,
                                }}
                            />
                        </div>

                        <div className="theme-info">
                            <span className="theme-icon">{themeOption.icon}</span>
                            <div className="theme-details">
                                <span className="theme-name">{themeOption.name}</span>
                                <span className="theme-description">{themeOption.description}</span>
                            </div>
                        </div>

                        {theme === themeOption.id && (
                            <FiCheck className="check-icon" />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};

/**
 * Theme Card Component for Settings Page
 * Full preview card with hover effects
 */
export const ThemeCard = ({ themeId, onSelect }) => {
    const { theme, setTheme, isTransitioning } = useTheme();
    const themeConfig = THEMES[themeId];
    const isActive = theme === themeId;

    const handleSelect = () => {
        if (onSelect) {
            onSelect(themeId);
        } else {
            setTheme(themeId);
        }
    };

    return (
        <div
            className={`theme-card ${isActive ? 'active' : ''}`}
            onClick={handleSelect}
            role="button"
            tabIndex={0}
            aria-pressed={isActive}
            onKeyPress={(e) => e.key === 'Enter' && handleSelect()}
        >
            <div
                className="theme-card-preview"
                style={{ background: themeConfig.preview.bg }}
            >
                <div className="preview-elements">
                    <div
                        className="preview-header"
                        style={{
                            background: `linear-gradient(135deg, ${themeConfig.preview.primary}, ${themeConfig.preview.secondary})`
                        }}
                    />
                    <div className="preview-content">
                        <div
                            className="preview-card"
                            style={{ borderColor: themeConfig.preview.primary }}
                        />
                        <div
                            className="preview-card"
                            style={{ borderColor: themeConfig.preview.secondary }}
                        />
                    </div>
                    <div
                        className="preview-button"
                        style={{
                            background: `linear-gradient(135deg, ${themeConfig.preview.primary}, ${themeConfig.preview.secondary})`
                        }}
                    />
                </div>
            </div>

            <div className="theme-card-info">
                <div className="theme-card-header">
                    <span className="theme-icon">{themeConfig.icon}</span>
                    <span className="theme-name">{themeConfig.name}</span>
                    {isActive && <FiCheck className="check-icon" />}
                </div>
                <p className="theme-description">{themeConfig.description}</p>
            </div>

            {isActive && <div className="active-indicator" />}
        </div>
    );
};

export default ThemeSwitcher;
