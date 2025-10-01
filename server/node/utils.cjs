const { Packr, Unpackr, decode } = require('msgpackr');
const fflate = require('fflate');

// Magic headers for different save formats
const magicHeader = new Uint8Array([0, 82, 73, 83, 85, 83, 65, 86, 69, 0, 7]); 
const magicCompressedHeader = new Uint8Array([0, 82, 73, 83, 85, 83, 65, 86, 69, 0, 8]);
const magicStreamCompressedHeader = new Uint8Array([0, 82, 73, 83, 85, 83, 65, 86, 69, 0, 9]);
const magicRisuSaveHeader = new TextEncoder().encode("RISUSAVE\0");

// Save type enums
const RisuSaveType = {
    CONFIG: 0,
    ROOT: 1,
    CHARACTERWITHCHAT: 2,
    CHAT: 3,
    BOTPRESET: 4,
    MODULES: 5
};

// Packr/Unpackr instances
const packr = new Packr({
    useRecords: false
});

const unpackr = new Unpackr({
    int64AsType: 'number',
    useRecords: false
});

// Preset template for bot presets
const presetTemplate = {
    name: "Default",
    // Add other default properties as needed
    // This should match the presetTemplate from your client code
};

/**
 * Check compression streams availability and polyfill if needed
 */
async function checkCompressionStreams() {
    if (!CompressionStream) {
        const { makeCompressionStream } = await import('compression-streams-polyfill/ponyfill');
        globalThis.CompressionStream = makeCompressionStream(TransformStream);
    }
    if (!DecompressionStream) {
        const { makeDecompressionStream } = await import('compression-streams-polyfill/ponyfill');
        globalThis.DecompressionStream = makeDecompressionStream(TransformStream);
    }
}

/**
 * Check the header type of saved data
 * @param {Uint8Array} data - The data to check
 * @returns {string} - The header type
 */
function checkHeader(data) {
    let header = 'raw';

    if (data.length < magicHeader.length) {
        return false;
    }

    for (let i = 0; i < magicHeader.length; i++) {
        if (data[i] !== magicHeader[i]) {
            header = 'none';
            break;
        }
    }

    if (header === 'none') {
        header = 'compressed';
        for (let i = 0; i < magicCompressedHeader.length; i++) {
            if (data[i] !== magicCompressedHeader[i]) {
                header = 'none';
                break;
            }
        }
    }

    if (header === 'none') {
        header = 'stream';
        for (let i = 0; i < magicStreamCompressedHeader.length; i++) {
            if (data[i] !== magicStreamCompressedHeader[i]) {
                header = 'none';
                break;
            }
        }
    }

    if (header === 'none') {
        header = 'risusave';
        for (let i = 0; i < magicRisuSaveHeader.length; i++) {
            if (data[i] !== magicRisuSaveHeader[i]) {
                header = 'none';
                break;
            }
        }
    }

    return header;
}

/**
 * RisuSave decoder class
 */
class RisuSaveDecoder {
    constructor() {
        this.blocks = [];
    }

    async decode(data) {
        let offset = magicRisuSaveHeader.length;
        let db = {};
        
        while (offset < data.length) {
            const type = data[offset];
            const compression = data[offset + 1] === 1;
            offset += 2;

            const nameLength = data[offset];
            offset += 1;
            const name = new TextDecoder().decode(data.subarray(offset, offset + nameLength));
            offset += nameLength;

            const newArrayBuf = new ArrayBuffer(4);
            const lengthSubUint8Buf = data.slice(offset, offset + 4);
            new Uint8Array(newArrayBuf).set(lengthSubUint8Buf);
            const length = new Uint32Array(newArrayBuf)[0];
            offset += 4;

            let blockData = data.subarray(offset, offset + length);
            offset += length;

            if (compression) {
                await checkCompressionStreams();
                const cs = new DecompressionStream('gzip');
                const writer = cs.writable.getWriter();
                writer.write(blockData);
                writer.close();
                const buf = await new Response(cs.readable).arrayBuffer();
                blockData = new Uint8Array(buf);
            }

            this.blocks.push({
                name,
                type,
                compression,
                content: new TextDecoder().decode(blockData)
            });
        }
        
        for (const key in this.blocks) {
            switch (this.blocks[key].type) {
                case RisuSaveType.ROOT: {
                    const rootData = JSON.parse(this.blocks[key].content);
                    for (const rootKey in rootData) {
                        if (!db[rootKey]) {
                            db[rootKey] = rootData[rootKey];
                        }
                    }
                    break;
                }
                case RisuSaveType.CHARACTERWITHCHAT: {
                    db.characters ??= [];
                    const character = JSON.parse(this.blocks[key].content);
                    db.characters.push(character);
                    break;
                }
                case RisuSaveType.BOTPRESET: {
                    db.botPresets = JSON.parse(this.blocks[key].content);
                    break;
                }
                case RisuSaveType.MODULES: {
                    db.modules = JSON.parse(this.blocks[key].content);
                    break;
                }
                default: {
                    //console.warn(`Not Implemented RisuSaveType: ${this.blocks[key].type} for ${this.blocks[key].name}`);
                }
            }
        }
        if(!Array.isArray(db.characters)){
            db.characters = [];
        }
        // Fix botpreset bugs
        if (!Array.isArray(db.botPresets) || db.botPresets.length === 0) {
            db.botPresets = [presetTemplate];
            db.botPresetsId = 0;
        }

        return db;
    }
}

/**
 * Decode RisuSave data
 * @param {Uint8Array} data - The data to decode
 * @returns {Promise<Object>} - The decoded database
 */
async function decodeRisuSave(data) {
    try {
        const header = checkHeader(data);
        switch (header) {
            case "compressed":
                data = data.slice(magicCompressedHeader.length);
                return decode(fflate.decompressSync(data));
            case "raw":
                data = data.slice(magicHeader.length);
                return unpackr.decode(data);
            case "stream": {
                await checkCompressionStreams();
                data = data.slice(magicStreamCompressedHeader.length);
                const cs = new DecompressionStream('gzip');
                const writer = cs.writable.getWriter();
                writer.write(data);
                writer.close();
                const buf = await new Response(cs.readable).arrayBuffer();
                return unpackr.decode(new Uint8Array(buf));
            }
            case "risusave": {
                const decoder = new RisuSaveDecoder();
                return await decoder.decode(data);
            }
        }
        return unpackr.decode(data);
    } catch (error) {
        console.error('Error decoding RisuSave data:', error);
        try {
            const risuSaveHeader = new Uint8Array(Buffer.from("\u0000\u0000RISU", 'utf-8'));
            const realData = data.subarray(risuSaveHeader.length);
            const dec = unpackr.decode(realData);
            return dec;
        } catch (error) {
            const buf = Buffer.from(fflate.decompressSync(Buffer.from(data)));
            try {
                return JSON.parse(buf.toString('utf-8'));
            } catch (error) {
                return unpackr.decode(buf);
            }
        }
    }
}

/**
 * Encode data using legacy format
 * @param {Object} data - The data to encode
 * @param {string} compression - Compression type ('noCompression' or 'compression')
 * @returns {Uint8Array} - The encoded data
 */
function encodeRisuSaveLegacy(data, compression = 'noCompression') {
    let encoded = packr.encode(data);
    if (compression === 'compression') {
        encoded = fflate.compressSync(encoded);
        const result = new Uint8Array(encoded.length + magicCompressedHeader.length);
        result.set(magicCompressedHeader, 0);
        result.set(encoded, magicCompressedHeader.length);
        return result;
    } else {
        const result = new Uint8Array(encoded.length + magicHeader.length);
        result.set(magicHeader, 0);
        result.set(encoded, magicHeader.length);
        return result;
    }
}

/**
 * Calculate compositional hash for an object
 * @param {Object} obj - The object to hash
 * @returns {string} - The hash string
 */

const PRIME_MULTIPLIER = 31;
    
const SEED_OBJECT = 17;
const SEED_ARRAY = 19;
const SEED_STRING = 23;
const SEED_NUMBER = 29;
const SEED_BOOLEAN = 31;
const SEED_NULL = 37;

function calculateHash(node) {
    if (node === null || node === undefined) return SEED_NULL;
    switch (typeof node) {
        case 'object':
            if (Array.isArray(node)) {
                let arrayHash = SEED_ARRAY;
                for (const item of node)
                    arrayHash = (Math.imul(arrayHash, PRIME_MULTIPLIER) + calculateHash(item)) >>> 0;
                return arrayHash;
            } else {
                let objectHash = SEED_OBJECT;
                for (const key in node)
                    objectHash += (Math.imul(calculateHash(key), PRIME_MULTIPLIER) + calculateHash(node[key]));
                return objectHash >>> 0;
            }
        case 'string':
            let strHash = 2166136261;
            for (let i = 0; i < node.length; i++)
                strHash = Math.imul(strHash ^ node.charCodeAt(i), 16777619);
            return Math.imul(SEED_STRING, PRIME_MULTIPLIER) + (strHash >>> 0);
        case 'number':
            let numHash;
            if (Number.isInteger(node) && node >= -2147483648 && node <= 2147483647) 
                numHash = node >>> 0; 
            else {
                const str = node.toString();
                numHash = 2166136261;
                for (let i = 0; i < str.length; i++) 
                    numHash = Math.imul(numHash ^ str.charCodeAt(i), 16777619);
                numHash = numHash >>> 0;
            }
            return Math.imul(SEED_NUMBER, PRIME_MULTIPLIER) + numHash;
        case 'boolean':
            return Math.imul(SEED_BOOLEAN, PRIME_MULTIPLIER) + (node ? 1 : 0);
            
        default:
            return 0;
    }
}

/**
 * Normalize JSON data for consistent hashing
 * @param {*} value - The value to normalize
 * @returns {*} - The normalized value
 */
function normalizeJSON(value) {
    if (value === null || value === undefined) return null;
    if (typeof value !== 'object') {
        if (typeof value === 'number' && !isFinite(value)) return null;
        if (typeof value === 'function' || 
            typeof value === 'symbol' || 
            typeof value === 'bigint') 
            return undefined; 
        return value;
    }
    if (value instanceof Date) return value.toISOString();
    if (value instanceof RegExp || value instanceof Error) return {};
    if (Array.isArray(value)) {
        const result = [];
        for (const item of value) {
            if (item === undefined) {
                result.push(null);
            } else {
                const normalized = normalizeJSON(item);
                result.push(normalized === undefined ? null : normalized);
            }
        }
        return result;
    }
    const result = {};
    for (const key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
            const propValue = value[key];
            if (propValue !== undefined) {
                const normalized = normalizeJSON(propValue);
                if (normalized !== undefined) 
                    result[key] = normalized;
            }
        }
    }
    return result;
}

module.exports = {
    // Classes
    RisuSaveDecoder,
    
    // Functions
    decodeRisuSave,
    encodeRisuSaveLegacy,
    calculateHash,
    normalizeJSON,
    checkHeader,
    checkCompressionStreams,
    
    // Constants
    RisuSaveType,
    magicHeader,
    magicCompressedHeader,
    magicStreamCompressedHeader,
    magicRisuSaveHeader,
    presetTemplate
};
