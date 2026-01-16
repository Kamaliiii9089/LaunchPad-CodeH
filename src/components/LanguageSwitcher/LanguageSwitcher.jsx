import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FiGlobe, FiChevronDown } from 'react-icons/fi';
import './LanguageSwitcher.css';

const LANGUAGES = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'hi', name: 'हिंदी', flag: '🇮🇳' }
];

const LanguageSwitcher = ({ variant = 'dropdown' }) => {
    const { i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const changeLanguage = (langCode) => {
        i18n.changeLanguage(langCode);
        setIsOpen(false);

        // Optional: Save to backend if user is logged in (handled via side-effect later or here)
    };

    const toggleDropdown = () => setIsOpen(!isOpen);

    if (variant === 'compact') {
        return (
            <div className="language-switcher compact" ref={dropdownRef}>
                <button
                    className="lang-btn-compact"
                    onClick={toggleDropdown}
                    aria-label="Select Language"
                    title={currentLang.name}
                >
                    <FiGlobe className="lang-icon" />
                    <span className="lang-code">{currentLang.code.toUpperCase()}</span>
                </button>

                {isOpen && (
                    <div className="lang-dropdown">
                        {LANGUAGES.map((lang) => (
                            <button
                                key={lang.code}
                                className={`lang-option ${i18n.language === lang.code ? 'active' : ''}`}
                                onClick={() => changeLanguage(lang.code)}
                            >
                                <span className="lang-flag">{lang.flag}</span>
                                <span className="lang-name">{lang.name}</span>
                                {i18n.language === lang.code && <span className="check-mark">✓</span>}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // Default dropdown variant
    return (
        <div className="language-switcher" ref={dropdownRef}>
            <button className="lang-btn" onClick={toggleDropdown}>
                <FiGlobe className="lang-icon-left" />
                <span className="current-lang-name">{currentLang.name}</span>
                <FiChevronDown className={`lang-chevron ${isOpen ? 'open' : ''}`} />
            </button>

            {isOpen && (
                <div className="lang-dropdown">
                    {LANGUAGES.map((lang) => (
                        <button
                            key={lang.code}
                            className={`lang-option ${i18n.language === lang.code ? 'active' : ''}`}
                            onClick={() => changeLanguage(lang.code)}
                        >
                            <span className="lang-flag">{lang.flag}</span>
                            <span className="lang-name">{lang.name}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LanguageSwitcher;
