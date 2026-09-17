import twTranslations from './generated-translations.json';
import ekoleTranslations from '../ekole-translations.js';

const addAdditionalTranslations = editorMessages => {
    for (const locale of Object.keys(editorMessages)) {
        const toMixIn = twTranslations[locale.toLowerCase()];
        if (toMixIn) {
            Object.assign(editorMessages[locale], toMixIn);
        }
    }

    // We reuse our `es` translations for `es-419` instead of maintaining separate translations.
    Object.assign(editorMessages['es-419'], twTranslations.es);

    // ekole: French strings missing from TurboWarp's translations
    for (const locale of Object.keys(ekoleTranslations)) {
        if (editorMessages[locale]) {
            Object.assign(editorMessages[locale], ekoleTranslations[locale]);
        }
    }
};

export default addAdditionalTranslations;
