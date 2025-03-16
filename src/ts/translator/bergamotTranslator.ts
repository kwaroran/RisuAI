import { LatencyOptimisedTranslator, TranslatorBacking } from "@browsermt/bergamot-translator";
import { gunzipSync } from 'fflate';

// Cache Translations Models
class CacheDB {
    private readonly name: string;
    private cache: Cache = null;

    constructor(name: string = "cache") {
        this.name = name;
    }

    private async getCache(): Promise<Cache> {
        return this.cache ??= await caches.open(this.name);
    }

    async load(url: string, checksum: string): Promise<ArrayBuffer | null> {
        const cache = await this.getCache();
        const res = await cache.match(url);
        if (!res) { return null;}
        if (res.headers.get("x-checksum") == checksum) {
            return res.arrayBuffer();
        }
        await cache.delete(url);
        return null;
    }

    async save(url: string, checksum: string, buffer: ArrayBuffer): Promise<void> {
        const cache = await this.getCache();
        const res = new Response(buffer, { headers: new Headers({"x-checksum": checksum})});
        await cache.put(url, res);
    }

    async clear(): Promise<void> {
        const cache = await this.getCache();
        const keys = await cache.keys();
        await Promise.all(keys.map((key) => cache.delete(key)));
    }
}

// Mozilla Firefox Translations Models
class FirefoxBacking extends TranslatorBacking {
    private cache: CacheDB;
    downloadTimeout: number;

    constructor(options?) {
        const registryUrl = 'https://raw.githubusercontent.com/mozilla/firefox-translations-models/refs/heads/main/registry.json';
        options = options || {};
        options.registryUrl = options.registryUrl || registryUrl;
        super(options);
        this.cache = new CacheDB("firefox-translations-models");
    }

    async loadModelRegistery() {
        const modelUrl = 'https://media.githubusercontent.com/media/mozilla/firefox-translations-models/refs/heads/main/models';
        const registry = await super.loadModelRegistery();
        for (const entry of registry) {
            for(const name in entry.files) {
                const file = entry.files[name];
                file.name = `${modelUrl}/${file.modelType}/${entry.from}${entry.to}/${file.name}.gz`;
            }
        }
        return registry;
    }

    async fetch(url, checksum, extra) {
        const cacheBuffer = await this.cache.load(url, checksum);
        if (cacheBuffer) { return cacheBuffer; }
        const res = await fetch(url, {
            credentials: 'omit',
        });
        // Decompress GZip
        const buffer = await res.arrayBuffer();
        const decomp = await decompressGZip(buffer);
        await this.cache.save(url, checksum, decomp);
        return decomp;
    }
}

async function decompressGZip(buffer:ArrayBuffer) {
    if (typeof DecompressionStream !== "undefined") {
        const decompressor = new DecompressionStream('gzip');
        const stream = new Response(buffer).body.pipeThrough(decompressor);
        return await new Response(stream).arrayBuffer();
    } else {    // GZip decompression fallback
        return gunzipSync(new Uint8Array(buffer)).buffer;
    }
}

let translator = null;
let translateTask = null;

// Translate
export async function bergamotTranslate(text:string, from:string, to:string, html:boolean|null) {
    translator ??= new LatencyOptimisedTranslator({}, new FirefoxBacking())
    const result = await (translateTask = translate());
    return result.target.text;

    // Wait for previous tasks...
    async function translate() {
        await translateTask;
        return translator.translate({
            from: from, to: to,
            text: text, html: html,
        });
    }
}

// Clear Cache
export async function clearCache() {
    await new CacheDB("firefox-translations-models").clear();
}