import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import es from './locales/es.json';
import hi from './locales/hi.json';

i18n
    // detect user language
    .use(LanguageDetector)
    // pass the i18n instance to react-i18next.
    .use(initReactI18next)
    // init i18next
    .init({
        resources: {
            en: { translation: en },
            es: { translation: es },
            hi: { translation: hi }
        },
        fallbackLng: 'en',
        debug: false, // Set to true for development debugging

        interpolation: {
            escapeValue: false, // not needed for react as it escapes by default
        },

        detector: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
        }
    });

export default i18n;
