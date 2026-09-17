/**
 * Blocs Ékole is served under /blocs/ on the Classify4Kids origin, which also serves the
 * Classify4Kids extension at /scratch/extension.js. That extension needs the page itself
 * (camera, DOM, IndexedDB of the origin), so it cannot run in TurboWarp's sandbox.
 *
 * - Scripts under /scratch/ on the SAME origin are trusted: they load unsandboxed, without a prompt.
 * - The Classify4Kids extension is loaded once when the editor is ready (first project shown),
 *   so projects opened afterwards that use it (whatever URL they saved) find it already loaded.
 * Every other custom extension keeps TurboWarp's behaviour (sandbox and prompts).
 */
import log from './log';

export const EKOLE_EXTENSION_PATH = '/scratch/extension.js';

// Must match the id in getInfo() of the Classify4Kids extension.
export const EKOLE_EXTENSION_ID = 'classify4kids';

// A script file under /scratch/: plain path segments only, no encoded characters.
const TRUSTED_PATH = /^\/scratch\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-][A-Za-z0-9_.-]*$/;

const getPageOrigin = () => (typeof location === 'undefined' ? 'null' : location.origin);

const isHttpOrigin = origin => typeof origin === 'string' && /^https?:\/\/[^/]+$/.test(origin);

/**
 * @param {string} [origin] Origin of the page, defaults to the current one.
 * @returns {string} Absolute URL of the Classify4Kids extension on that origin.
 */
export const getEkoleExtensionURL = (origin = getPageOrigin()) => `${origin}${EKOLE_EXTENSION_PATH}`;

/**
 * @param {unknown} url Extension URL requested by the editor or a project.
 * @param {string} [origin] Origin of the page, defaults to the current one.
 * @returns {boolean} True if the URL is a script under /scratch/ on the page's own http(s) origin.
 */
export const isTrustedSameOriginExtension = (url, origin = getPageOrigin()) => {
    if (typeof url !== 'string' || !isHttpOrigin(origin)) {
        return false;
    }
    let parsed;
    try {
        // No base URL: relative URLs are rejected, like the VM does.
        parsed = new URL(url);
    } catch (e) {
        return false;
    }
    return (
        (parsed.protocol === 'https:' || parsed.protocol === 'http:') &&
        parsed.origin === origin &&
        parsed.username === '' &&
        parsed.password === '' &&
        TRUSTED_PATH.test(parsed.pathname)
    );
};

// VM -> promise of the startup load, so the extension is requested once per VM.
const startupLoads = new WeakMap();

/**
 * @param {string} url Script URL.
 * @param {function} fetchFn fetch implementation.
 * @returns {Promise<boolean>} True if the script answers with a 2xx status.
 */
const scriptExists = async (url, fetchFn) => {
    try {
        const response = await fetchFn(url, {method: 'HEAD', credentials: 'same-origin'});
        return response.ok;
    } catch (e) {
        return false;
    }
};

/**
 * @param {object} vm scratch-vm instance.
 * @param {string} url Extension URL.
 * @param {function} fetchFn fetch implementation.
 * @returns {Promise<void>} Resolves when loaded or skipped, rejects if the VM failed to load it.
 */
const loadIfAvailable = async (vm, url, fetchFn) => {
    // A failed loadExtensionURL() also rejects projects waiting for extensions, so the default
    // project would not load: only ask the VM once the script is known to exist.
    if (!await scriptExists(url, fetchFn)) {
        log.warn(`Blocs Ékole: ${url} is not available, the Classify4Kids blocks are not loaded`);
        return;
    }
    const extensionManager = vm.extensionManager;
    // A project may have loaded it while we were checking.
    if (extensionManager.isExtensionLoaded(EKOLE_EXTENSION_ID) || extensionManager.isExtensionURLLoaded(url)) {
        return;
    }
    await extensionManager.loadExtensionURL(url);
    log.info(`Blocs Ékole: loaded ${url}`);
};

/**
 * Load the Classify4Kids extension from the page's origin, once per VM.
 * Call it after the GUI security manager is installed (otherwise the VM would sandbox it) and while
 * no project is loading (see tw-security-manager.jsx).
 * @param {object} vm scratch-vm instance.
 * @param {object} [options] Options.
 * @param {string} [options.origin] Origin of the page, defaults to the current one.
 * @param {function} [options.fetch] fetch implementation, defaults to the browser's.
 * @returns {Promise<void>} Always resolves; a failure is logged and a later call retries.
 */
export const loadEkoleExtension = (vm, {
    origin = getPageOrigin(),
    // Wrapped so window.fetch is never called with a wrong `this` (Illegal invocation).
    fetch: fetchFn = (typeof fetch === 'function' ? (...args) => fetch(...args) : null)
} = {}) => {
    if (!isHttpOrigin(origin) || !fetchFn) {
        return Promise.resolve();
    }
    if (startupLoads.has(vm)) {
        return startupLoads.get(vm);
    }
    const extensionManager = vm.extensionManager;
    const url = getEkoleExtensionURL(origin);
    if (extensionManager.isExtensionLoaded(EKOLE_EXTENSION_ID) || extensionManager.isExtensionURLLoaded(url)) {
        return Promise.resolve();
    }
    const loading = loadIfAvailable(vm, url, fetchFn).catch(error => {
        startupLoads.delete(vm);
        log.warn(`Blocs Ékole: could not load ${url}`, error);
    });
    startupLoads.set(vm, loading);
    return loading;
};
