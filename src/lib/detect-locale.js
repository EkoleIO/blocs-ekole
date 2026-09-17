/**
 * @fileoverview
 * Utility function to detect locale from the saved language or a parameter on the URL.
 * ekole: French by default, the browser setting is ignored.
 */

import queryString from 'query-string';

// tw: read language from localStorage
export const LANGUAGE_KEY = 'tw:language';

// ekole: Blocs Ékole is used by French-speaking classes whose Chrome may be set to another
// language, so the browser language is ignored and French is the default.
export const DEFAULT_LOCALE = 'fr';

/**
 * Pick the editor language.
 * Order (ekole): language saved from the language menu, then ?locale= or ?lang= in the URL,
 * then French. The browser language is not used.
 * @param {Array.string} supportedLocales An array of supported locale codes.
 * @return {string} the preferred locale
 */
const detectLocale = supportedLocales => {
    // tw: read language from localStorage
    try {
        const storedLanguage = localStorage.getItem(LANGUAGE_KEY);
        if (storedLanguage && supportedLocales.includes(storedLanguage)) {
            return storedLanguage;
        }
    } catch (e) { /* ignore */ }

    const queryParams = queryString.parse(location.search);
    // Flatten potential arrays and remove falsy values
    const potentialLocales = [].concat(queryParams.locale, queryParams.lang).filter(l => l);
    if (potentialLocales.length) {
        const urlLocale = potentialLocales[0].toLowerCase();
        if (supportedLocales.includes(urlLocale)) {
            return urlLocale;
        }
    }

    return supportedLocales.includes(DEFAULT_LOCALE) ? DEFAULT_LOCALE : 'en';
};

export {
    detectLocale
};
