// Blocs Ékole: same-origin extensions under /scratch/ are trusted, and the Classify4Kids
// extension is loaded once at startup. Runs in Jest's node environment.
import {
    EKOLE_EXTENSION_ID,
    getEkoleExtensionURL,
    isTrustedSameOriginExtension,
    loadEkoleExtension
} from '../../../src/lib/ekole-extension.js';

const ORIGIN = 'https://ekole-classify4kids.netlify.app';

const makeVM = ({loadedIds = [], loadedURLs = [], load = () => Promise.resolve()} = {}) => {
    const calls = [];
    return {
        calls,
        extensionManager: {
            isExtensionLoaded: id => loadedIds.includes(id),
            isExtensionURLLoaded: url => loadedURLs.includes(url),
            loadExtensionURL: url => {
                calls.push(url);
                return load(url);
            }
        }
    };
};

describe('getEkoleExtensionURL', () => {
    test('is /scratch/extension.js on the given origin', () => {
        expect(getEkoleExtensionURL(ORIGIN)).toEqual(`${ORIGIN}/scratch/extension.js`);
        expect(getEkoleExtensionURL('http://localhost:8123')).toEqual('http://localhost:8123/scratch/extension.js');
    });
});

describe('isTrustedSameOriginExtension', () => {
    test('trusts the Classify4Kids extension on the same origin', () => {
        expect(isTrustedSameOriginExtension(`${ORIGIN}/scratch/extension.js`, ORIGIN)).toBe(true);
    });

    test('trusts other scripts under /scratch/, with or without a query string', () => {
        expect(isTrustedSameOriginExtension(`${ORIGIN}/scratch/v2/extension.js?v=3`, ORIGIN)).toBe(true);
        expect(isTrustedSameOriginExtension('http://localhost:8123/scratch/extension.js', 'http://localhost:8123'))
            .toBe(true);
    });

    test('does not trust the same path on another origin', () => {
        expect(isTrustedSameOriginExtension('https://classify4kids.netlify.app/scratch/extension.js', ORIGIN))
            .toBe(false);
        expect(isTrustedSameOriginExtension(`${ORIGIN}.evil.example/scratch/extension.js`, ORIGIN)).toBe(false);
        expect(isTrustedSameOriginExtension('http://ekole-classify4kids.netlify.app/scratch/extension.js', ORIGIN))
            .toBe(false);
    });

    test('does not trust same-origin files outside /scratch/', () => {
        expect(isTrustedSameOriginExtension(`${ORIGIN}/blocs/extension.js`, ORIGIN)).toBe(false);
        expect(isTrustedSameOriginExtension(`${ORIGIN}/scratchy/extension.js`, ORIGIN)).toBe(false);
        expect(isTrustedSameOriginExtension(`${ORIGIN}/scratch`, ORIGIN)).toBe(false);
        expect(isTrustedSameOriginExtension(`${ORIGIN}/api/model?key=ABC234`, ORIGIN)).toBe(false);
    });

    test('does not trust path tricks', () => {
        expect(isTrustedSameOriginExtension(`${ORIGIN}/scratch/../api/image`, ORIGIN)).toBe(false);
        expect(isTrustedSameOriginExtension(`${ORIGIN}/scratch/%2e%2e/api/image`, ORIGIN)).toBe(false);
        expect(isTrustedSameOriginExtension(`${ORIGIN}/scratch/..%2Fapi/image`, ORIGIN)).toBe(false);
        expect(isTrustedSameOriginExtension(`${ORIGIN}/scratch/%5c..%5capi/image`, ORIGIN)).toBe(false);
    });

    test('does not trust non-http URLs, relative URLs or non-strings', () => {
        expect(isTrustedSameOriginExtension('data:text/javascript,alert(1)', ORIGIN)).toBe(false);
        expect(isTrustedSameOriginExtension('/scratch/extension.js', ORIGIN)).toBe(false);
        expect(isTrustedSameOriginExtension(null, ORIGIN)).toBe(false);
        expect(isTrustedSameOriginExtension({}, ORIGIN)).toBe(false);
    });

    test('does not trust anything when the page has no real origin (file://)', () => {
        expect(isTrustedSameOriginExtension('file:///scratch/extension.js', 'null')).toBe(false);
    });
});

describe('loadEkoleExtension', () => {
    const scriptFound = () => Promise.resolve({ok: true, status: 200});
    const options = {origin: ORIGIN, fetch: scriptFound};

    test('checks the script, then loads the same-origin extension once per VM', async () => {
        const vm = makeVM();
        const requested = [];
        const fetch = (url, init) => {
            requested.push([url, init.method]);
            return scriptFound();
        };
        await loadEkoleExtension(vm, {origin: ORIGIN, fetch});
        await loadEkoleExtension(vm, {origin: ORIGIN, fetch});
        expect(requested).toEqual([[`${ORIGIN}/scratch/extension.js`, 'HEAD']]);
        expect(vm.calls).toEqual([`${ORIGIN}/scratch/extension.js`]);
    });

    test('does not load it again when a project already loaded the extension id', async () => {
        const vm = makeVM({loadedIds: [EKOLE_EXTENSION_ID]});
        await loadEkoleExtension(vm, options);
        expect(vm.calls).toEqual([]);
    });

    test('does not load it again when the URL is already loaded', async () => {
        const vm = makeVM({loadedURLs: [`${ORIGIN}/scratch/extension.js`]});
        await loadEkoleExtension(vm, options);
        expect(vm.calls).toEqual([]);
    });

    test('does not ask the VM to load a missing script (a failed load would break project loading)', async () => {
        const vm = makeVM();
        await expect(loadEkoleExtension(vm, {origin: ORIGIN, fetch: () => Promise.resolve({ok: false, status: 404})}))
            .resolves.toBeUndefined();
        await expect(loadEkoleExtension(makeVM(), {origin: ORIGIN, fetch: () => Promise.reject(new Error('offline'))}))
            .resolves.toBeUndefined();
        expect(vm.calls).toEqual([]);
    });

    test('never rejects when loading fails, and a later call retries', async () => {
        let attempts = 0;
        const vm = makeVM({
            load: () => {
                attempts++;
                return attempts === 1 ? Promise.reject(new Error('script error')) : Promise.resolve();
            }
        });
        await expect(loadEkoleExtension(vm, options)).resolves.toBeUndefined();
        await loadEkoleExtension(vm, options);
        expect(attempts).toBe(2);
    });

    test('does nothing when the page has no real origin', async () => {
        const vm = makeVM();
        await loadEkoleExtension(vm, {origin: 'null', fetch: scriptFound});
        expect(vm.calls).toEqual([]);
    });
});
