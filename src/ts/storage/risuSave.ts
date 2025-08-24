import { Packr, Unpackr, decode } from "msgpackr";
import * as fflate from "fflate";
import { AppendableBuffer, isTauri } from "../globalApi.svelte";
import { presetTemplate, type Database } from "./database.svelte";
import { compare } from 'fast-json-patch'

const packr = new Packr({
    useRecords:false
});

const unpackr = new Unpackr({
    int64AsType: 'number',
    useRecords:false
})

const magicHeader = new Uint8Array([0, 82, 73, 83, 85, 83, 65, 86, 69, 0, 7]); 
const magicCompressedHeader = new Uint8Array([0, 82, 73, 83, 85, 83, 65, 86, 69, 0, 8]);
const magicStreamCompressedHeader = new Uint8Array([0, 82, 73, 83, 85, 83, 65, 86, 69, 0, 9]);
const magicRisuSaveHeader = new TextEncoder().encode("RISUSAVE\0");


async function checkCompressionStreams(){
    if(!CompressionStream){
        const {makeCompressionStream} = await import('compression-streams-polyfill/ponyfill');
        //@ts-ignore
        globalThis.CompressionStream = makeCompressionStream(TransformStream);
    }
    if(!DecompressionStream){
        const {makeDecompressionStream} = await import('compression-streams-polyfill/ponyfill');
        //@ts-ignore
        globalThis.DecompressionStream = makeDecompressionStream(TransformStream);
    }
}

export function encodeRisuSaveLegacy(data:any, compression:'noCompression'|'compression' = 'noCompression'){
    let encoded:Uint8Array = packr.encode(data)
    if(compression === 'compression'){
        encoded = fflate.compressSync(encoded)
        const result = new Uint8Array(encoded.length + magicCompressedHeader.length);
        result.set(magicCompressedHeader, 0)
        result.set(encoded, magicCompressedHeader.length)
        return result
    }
    else{
        const result = new Uint8Array(encoded.length + magicHeader.length);
        result.set(magicHeader, 0)
        result.set(encoded, magicHeader.length)
        return result
    }
}

export async function encodeRisuSaveCompressionStream(data:any) {
    await checkCompressionStreams()
    let encoded:Uint8Array = packr.encode(data)
    const cs = new CompressionStream('gzip');
    const writer = cs.writable.getWriter();
    writer.write(encoded as any);
    writer.close();
    const buf = await new Response(cs.readable).arrayBuffer()
    const result = new Uint8Array(new Uint8Array(buf).length + magicStreamCompressedHeader.length);
    result.set(magicStreamCompressedHeader, 0)
    result.set(new Uint8Array(buf), magicStreamCompressedHeader.length)
    return result
}

export type toSaveType = {
    character: string[];
    chat: [string, string][];
    botPreset: boolean;
    modules: boolean;
}

enum RisuSaveType {
    CONFIG = 0,
    ROOT = 1,
    CHARACTERWITHCHAT = 2,
    CHAT = 3,
    BOTPRESET = 4,
    MODULES = 5
}

export class RisuSaveEncoder {

    private blocks: { [key: string]: Uint8Array } = {};
    private compression: boolean = false;

    async init(data:Database,arg:{
        compression?: boolean
    } = {}){
        const { compression = false } = arg;
        this.compression = compression;
        let obj:Record<any,any> = {}
        let keys = Object.keys(data)
        for(const key of keys){
            if(key !== 'characters' && key !== 'botPresets' && key !== 'modules'){
                obj[key] = data[key]
            }
        }
        this.blocks['root'] = await this.encodeBlock({
            compression,
            data: JSON.stringify(obj),
            type: RisuSaveType.ROOT,
            name: 'root'
        });
        this.blocks['preset'] = await this.encodeBlock({
            compression,
            data: JSON.stringify(data.botPresets),
            type: RisuSaveType.BOTPRESET,
            name: 'preset'
        });
        this.blocks['modules'] = await this.encodeBlock({
            compression,
            data: JSON.stringify(data.modules),
            type: RisuSaveType.MODULES,
            name: 'modules'
        });
        for( const character of data.characters) {
            this.blocks[character.chaId] = await this.encodeBlock({
                compression,
                data: JSON.stringify(character),
                type: RisuSaveType.CHARACTERWITHCHAT,
                name: character.chaId
            });
        }
        this.blocks['config'] = await this.encodeBlock({
            compression,
            data: JSON.stringify({
                version: 1
            }),
            type: RisuSaveType.CONFIG,
            name: "config"
        })
    }

    async set(data:Database, toSave:toSaveType){
        let obj:Record<any,any> = {}
        let keys = Object.keys(data)
        for(const key of keys){
            if(key !== 'characters' && key !== 'botPresets'){
                obj[key] = data[key]
            }
        }
        this.blocks['root'] = await this.encodeBlock({
            compression: this.compression,
            data: JSON.stringify(obj),
            type: RisuSaveType.ROOT,
            name: 'root'
        });

        const savedId = new Set<string>();
        for(const character of data.characters) {
            const index = toSave.character.indexOf(character.chaId);
            if (index !== -1) {
                this.blocks[character.chaId] = await this.encodeBlock({
                    compression: this.compression,
                    data: JSON.stringify(character),
                    type: RisuSaveType.CHARACTERWITHCHAT,
                    name: character.chaId
                });
                savedId.add(character.chaId);
                toSave.character.splice(index, 1);
            }
            else if(!this.blocks[character.chaId]){
                this.blocks[character.chaId] = await this.encodeBlock({
                    compression: this.compression,
                    data: JSON.stringify(character),
                    type: RisuSaveType.CHARACTERWITHCHAT,
                    name: character.chaId
                });
                savedId.add(character.chaId);
            }
        }
        if(toSave.character.length > 0){
            console.log(`Deleting character data: ${toSave.character.join(', ')}`);
            //probably deleted characters
            for(const chaId of toSave.character){
                if(!savedId.has(chaId)){
                    delete this.blocks[chaId];
                }
            }
        }

        if(toSave.botPreset){
            this.blocks['preset'] = await this.encodeBlock({
                compression: this.compression,
                data: JSON.stringify(data.botPresets),
                type: RisuSaveType.BOTPRESET,
                name: 'preset'
            });
        }
        if(toSave.modules){
            this.blocks['modules'] = await this.encodeBlock({
                compression: this.compression,
                data: JSON.stringify(data.modules),
                type: RisuSaveType.MODULES,
                name: 'modules'
            });
        }
    }

    encode(arg:{
        compression?: boolean
    } = {}){
        if(!this.blocks['config']){
            return null
        }
        let totalLength = 0
        for(const key in this.blocks){
            totalLength += this.blocks[key].length;
        }
        totalLength += magicRisuSaveHeader.length;
        const arrayBuf = new ArrayBuffer(totalLength);
        const view = new Uint8Array(arrayBuf);
        let offset = 0;
        view.set(magicRisuSaveHeader, offset);
        offset += magicRisuSaveHeader.length;
        for(const key in this.blocks){
            view.set(this.blocks[key], offset);
            offset += this.blocks[key].length;
        }
        console.log(Object.keys(this.blocks).length, 'blocks encoded');
        return arrayBuf;
    }

    async encodeBlock(arg:{
        compression:boolean
        data:string
        type:RisuSaveType
        name:string
    }){
        let databuf: Uint8Array;
        if(arg.compression){
            await checkCompressionStreams();
            const cs = new CompressionStream('gzip');
            const writer = cs.writable.getWriter();
            writer.write(new TextEncoder().encode(arg.data));
            writer.close();
            const compressedData = await new Response(cs.readable).arrayBuffer();
            databuf = (new Uint8Array(compressedData));
        }
        else{
            databuf = (new TextEncoder().encode(arg.data));
        }
        const nameBuf = new TextEncoder().encode(arg.name);
        const lengthBuf = new ArrayBuffer(4);
        new Uint32Array(lengthBuf)[0] = databuf.length;
        const arrayBuf = new ArrayBuffer(2 + 1 + nameBuf.length + 4 + databuf.length);
        const buf = new Uint8Array(arrayBuf);
        buf.set(new Uint8Array([arg.type, arg.compression ? 1 : 0]), 0);
        buf.set(new Uint8Array([nameBuf.length]), 2);
        buf.set(nameBuf, 3);
        buf.set(new Uint8Array(lengthBuf), 3 + nameBuf.length);
        buf.set(databuf, 7 + nameBuf.length);
        return buf;
    }
}

export class RisuSaveDecoder {
    private blocks: {
        name: string;
        type: RisuSaveType;
        compression: boolean;
        content: string;
    }[] = []
    async decode(data: Uint8Array): Promise<Database> {
        console.log('Decoding RisuSave data');
        let offset = magicRisuSaveHeader.length;
        //@ts-ignore
        let db:Database = {}
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
                //decode using DecompressionStream
                await checkCompressionStreams();
                const cs = new DecompressionStream('gzip');
                const writer = cs.writable.getWriter();
                writer.write(blockData as any);
                writer.close();
                const buf = await new Response(cs.readable).arrayBuffer();
                blockData = new Uint8Array(buf);
            }

            this.blocks.push({
                name,
                type,
                compression,
                content: new TextDecoder().decode(blockData)
            })
        }
        console.log('blocks',this.blocks)
        for(const key in this.blocks){
            switch(this.blocks[key].type){
                case RisuSaveType.ROOT:{
                    const rootData = JSON.parse(this.blocks[key].content);
                    for(const rootKey in rootData){
                        if(!db[rootKey]){
                            db[rootKey] = rootData[rootKey];
                        }
                    }
                    break;
                }
                case RisuSaveType.CHARACTERWITHCHAT:{
                    db.characters ??= [];
                    const character = JSON.parse(this.blocks[key].content);
                    db.characters.push(character);
                    break
                }
                case RisuSaveType.BOTPRESET:{
                    db.botPresets = JSON.parse(this.blocks[key].content);
                    break;
                }
                case RisuSaveType.MODULES:{
                    db.modules = JSON.parse(this.blocks[key].content);
                    break;
                }
                default:{
                    console.warn(`Not Implemented RisuSaveType: ${this.blocks[key].type} for ${this.blocks[key].name}`);
                }
            }
        }
        //to fix botpreset bugs
        if(!Array.isArray(db.botPresets) || db.botPresets.length === 0){
            db.botPresets = [presetTemplate]
            db.botPresetsId = 0
        }
        console.log('Decoded RisuSave data', db);
        return db;
    }
}

export async function decodeRisuSave(data:Uint8Array){
    try {
        const header = checkHeader(data)
        switch(header){
            case "compressed":
                data = data.slice(magicCompressedHeader.length)
                return decode(fflate.decompressSync(data))
            case "raw":
                data = data.slice(magicHeader.length)
                return unpackr.decode(data)
            case "stream":{
                await checkCompressionStreams()
                data = data.slice(magicStreamCompressedHeader.length)
                const cs = new DecompressionStream('gzip');
                const writer = cs.writable.getWriter();
                writer.write(data as any);
                writer.close();
                const buf = await new Response(cs.readable).arrayBuffer()
                return unpackr.decode(new Uint8Array(buf))
            }
            case "risusave":{
                const decoder = new RisuSaveDecoder();
                return await decoder.decode(data);
            }
        }
        return unpackr.decode(data)
    }
    catch (error) {
        console.error('Error decoding RisuSave data:', error);
        try {
            console.log('risudecode')
            const risuSaveHeader = new Uint8Array(Buffer.from("\u0000\u0000RISU",'utf-8'))
            const realData = data.subarray(risuSaveHeader.length)
            const dec = unpackr.decode(realData)
            return dec   
        } catch (error) {
            const buf = Buffer.from(fflate.decompressSync(Buffer.from(data)))
            try {
                return JSON.parse(buf.toString('utf-8'))                            
            } catch (error) {
                return unpackr.decode(buf)
            }
        }
    }
}

function checkHeader(data: Uint8Array) {

    let header:'none'|'compressed'|'raw'|'stream'|'risusave' = 'raw'

    if (data.length < magicHeader.length) {
      return false;
    }
  
    for (let i = 0; i < magicHeader.length; i++) {
      if (data[i] !== magicHeader[i]) {
        header = 'none'
        break
      }
    }

    if(header === 'none'){
        header = 'compressed'
        for (let i = 0; i < magicCompressedHeader.length; i++) {
            if (data[i] !== magicCompressedHeader[i]) {
                header = 'none'
                break
            }
        }
    }

    if(header === 'none'){
        header = 'stream'
        for (let i = 0; i < magicStreamCompressedHeader.length; i++) {
            if (data[i] !== magicStreamCompressedHeader[i]) {
                header = 'none'
                break
            }
        }
    }

    if(header === 'none'){
        header = 'risusave'
        for (let i = 0; i < magicRisuSaveHeader.length; i++) {
            if (data[i] !== magicRisuSaveHeader[i]) {
                header = 'none'
                break
            }
        }
    }

    // All bytes matched
    return header;
}

const PRIME_MULTIPLIER = 31;

const SEED_OBJECT = 17;
const SEED_ARRAY = 19;
const SEED_STRING = 23;
const SEED_NUMBER = 29;
const SEED_BOOLEAN = 31;
const SEED_NULL = 37;

function calculateHash(node: any): number {
    if (node === null || node === undefined) return SEED_NULL;
    switch (typeof node) {
        case 'object':
            if (Array.isArray(node)) {
                let arrayHash = SEED_ARRAY;
                for (const item of node)
                    arrayHash = (Math.imul(arrayHash, PRIME_MULTIPLIER) + calculateHash(item)) >>> 0;
                return arrayHash;
            } else {
                // Independent of key order
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

function normalizeJSON(value: any): any {
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

export class RisuSavePatcher {
    private lastSyncedDb: any;
    private hashBlocks: { [key: string]: number } = {};
    private curPatch: any[] = [];

    hash(): string {
        
        this.hashBlocks['characters'] = SEED_ARRAY;
        for (const character of this.lastSyncedDb.characters) {
            this.hashBlocks['characters'] = (Math.imul(this.hashBlocks['characters'], PRIME_MULTIPLIER) + this.hashBlocks[character.chaId]) >>> 0;
        }
        
        const keys = Object.keys(this.lastSyncedDb)
        
        let rootHash = SEED_OBJECT;
        for (const key of keys) {
            rootHash += (Math.imul(calculateHash(key), PRIME_MULTIPLIER) + this.hashBlocks[key])
        }
        return (rootHash >>> 0).toString(16);
    }

    async init(data: any) {
        this.lastSyncedDb = normalizeJSON(data);
        this.hashBlocks = {};

        const keys = Object.keys(this.lastSyncedDb)

        for(const key of keys){
            if(key !== 'characters'){
                this.hashBlocks[key] = calculateHash(this.lastSyncedDb[key]);
            }
        }

        for(const character of this.lastSyncedDb.characters) {
            this.hashBlocks[character.chaId] = calculateHash(character);
        }
    }

    async set(data: any, toSave: toSaveType): Promise<{ patch: any[]; expectedHash: string }> {
        const expectedHash: string = this.hash();
        const patch: any[] = []

        const { 
            characters: lastCharacters, 
            botPresets: lastBotPresets, 
            modules: lastModules, 
            ...lastRoot 
        } = this.lastSyncedDb

        const { 
            characters: curCharacters, 
            botPresets: curBotPresets, 
            modules: curModules, 
            ...curRoot 
        } = data

        const normRoot = normalizeJSON(curRoot)
        patch.push(...compare(lastRoot, normRoot))
        const keys = Object.keys(normRoot)
        for(const key of keys) {
            this.hashBlocks[key] = calculateHash(normRoot[key]);
        }

        if(toSave.botPreset) {
            const normBotPresets = normalizeJSON(curBotPresets)
            patch.push(...compare({botPresets: lastBotPresets}, {botPresets: normBotPresets}))
            this.hashBlocks['botPresets'] = calculateHash(normBotPresets);
            this.lastSyncedDb.botPresets = normBotPresets;
        }

        if(toSave.modules) {
            const normModules = normalizeJSON(curModules)
            patch.push(...compare({modules: lastModules}, {modules: normModules}))
            this.hashBlocks['modules'] = calculateHash(normModules);
            this.lastSyncedDb.modules = normModules;
        }

        for(let i = 0; i < Math.max(lastCharacters.length, curCharacters.length); i++) {
            const lastChar = lastCharacters[i]
            const curChar = curCharacters[i]

            if(toSave.character.includes(curChar?.chaId ?? '') ||
               toSave.character.includes(lastChar?.chaId ?? '') ||
               lastChar?.chaId != curChar?.chaId) 
            {
                const normChar = normalizeJSON(curChar)

                if(!normChar) {
                    patch.push({op: 'remove', path: `/characters/${i}`})
                    this.lastSyncedDb.characters[i] = null;
                }
                else if(!lastChar) {
                    patch.push({op: 'add', path: `/characters/${i}`, value: normChar})
                    this.hashBlocks[normChar.chaId] = calculateHash(normChar);
                    this.lastSyncedDb.characters[i] = normChar;
                }
                else {
                    let charPatch = compare(lastChar, normChar).map((v) => {
                        v.path = `/characters/${i}` + v.path;
                        return v;
                    })
                    patch.push(...charPatch);
                    this.hashBlocks[normChar.chaId] = calculateHash(normChar);
                    this.lastSyncedDb.characters[i] = normChar;
                }
            }
        }
        this.lastSyncedDb.characters = this.lastSyncedDb.characters.filter(Boolean);

        this.lastSyncedDb = {
            characters: this.lastSyncedDb.characters,
            botPresets: this.lastSyncedDb.botPresets,
            modules: this.lastSyncedDb.modules,
            ...normRoot
        }

        return {
            patch,
            expectedHash
        }
    }
}