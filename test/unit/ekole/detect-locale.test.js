// Blocs Ékole: French by default, the browser language is ignored.
// Runs in Jest's node environment: the few browser globals used are stubbed.
import {detectLocale, LANGUAGE_KEY} from '../../../src/lib/detect-locale.js';

const SUPPORTED = ['en', 'es', 'fr', 'pt-br', 'de', 'it'];

const setBrowser = ({search = '', stored = null, language = 'en-US'} = {}) => {
    global.location = {search};
    global.navigator = {language};
    global.localStorage = {
        getItem: key => (key === LANGUAGE_KEY ? stored : null)
    };
};

describe('detectLocale (Blocs Ékole)', () => {
    afterEach(() => {
        delete global.location;
        delete global.navigator;
        delete global.localStorage;
    });

    test('defaults to French when nothing is saved and there is no URL parameter', () => {
        setBrowser({language: 'en-US'});
        expect(detectLocale(SUPPORTED)).toEqual('fr');
    });

    test('ignores the browser language', () => {
        setBrowser({language: 'pt-BR'});
        expect(detectLocale(SUPPORTED)).toEqual('fr');
    });

    test('uses the language saved from the language menu first', () => {
        setBrowser({stored: 'de', search: '?locale=it'});
        expect(detectLocale(SUPPORTED)).toEqual('de');
    });

    test('ignores an unsupported saved language', () => {
        setBrowser({stored: 'xx'});
        expect(detectLocale(SUPPORTED)).toEqual('fr');
    });

    test('uses ?locale= from the URL (case insensitive)', () => {
        setBrowser({search: '?locale=pt-BR'});
        expect(detectLocale(SUPPORTED)).toEqual('pt-br');
    });

    test('also accepts ?lang= and uses the first value', () => {
        setBrowser({search: '?lang=it&lang=de'});
        expect(detectLocale(SUPPORTED)).toEqual('it');
    });

    test('falls back to French for an unsupported or empty URL locale', () => {
        setBrowser({search: '?lang=sv'});
        expect(detectLocale(SUPPORTED)).toEqual('fr');
        setBrowser({search: '?locale='});
        expect(detectLocale(SUPPORTED)).toEqual('fr');
    });

    test('falls back to English if French is not supported', () => {
        setBrowser();
        expect(detectLocale(['en', 'de'])).toEqual('en');
    });

    test('survives a localStorage that throws', () => {
        setBrowser();
        global.localStorage = {
            getItem: () => {
                throw new Error('blocked');
            }
        };
        expect(detectLocale(SUPPORTED)).toEqual('fr');
    });
});
