import { Packr, Unpackr, decode } from "msgpackr/index-no-eval";
import * as fflate from "fflate";
import { getDatabase, presetTemplate, type Database } from "./database.svelte";
import localforage from "localforage";
import { forageStorage } from "../globalApi.svelte";
import { isNodeServer, isTauri } from "src/ts/platform"
import type { SaveKVData, SaveKVSource } from "./saveKV"
import {
    writeFile,
    BaseDirectory,
    exists,
    mkdir,
    readFile,
} from "@tauri-apps/plugin-fs"

const packr = new Packr({
    useRecords:false
});

const unpackr = new Unpackr({
    int64AsType: 'number',
    useRecords:false
})

const disableRemoteSaving = () => {
    try {
        const db = getDatabase()
        return !db.enableRemoteSaving
    } catch (error) {
        return true
    }
}
const checkedRemoteExistence = new Set<string>();
const magicHeader = new Uint8Array([0, 82, 73, 83, 85, 83, 65, 86, 69, 0, 7]); 
const magicCompressedHeader = new Uint8Array([0, 82, 73, 83, 85, 83, 65, 86, 69, 0, 8]);
const magicStreamCompressedHeader = new Uint8Array([0, 82, 73, 83, 85, 83, 65, 86, 69, 0, 9]);
const magicRisuSaveHeader = new TextEncoder().encode("RISUSAVE\0");


async function checkCompressionStreams(){
    if(!CompressionStream){
        const {makeCompressionStream} = await import('compression-streams-polyfill/ponyfill');
        //@ts-expect-error polyfill CompressionStream type is incompatible with globalThis.CompressionStream
        globalThis.CompressionStream = makeCompressionStream(TransformStream);
    }
    if(!DecompressionStream){
        const {makeDecompressionStream} = await import('compression-streams-polyfill/ponyfill');
        //@ts-expect-error polyfill DecompressionStream type is incompatible with globalThis.DecompressionStream
        globalThis.DecompressionStream = makeDecompressionStream(TransformStream);
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
    loadouts: boolean;
    plugins: boolean;
    pluginCustomStorage: boolean;
    /** SaveKV namespaces to re-encode */
    kv?: string[];
}

enum RisuSaveType {
    CONFIG = 0,
    ROOT = 1,
    CHARACTER_WITH_CHAT = 2,
    CHAT = 3,
    BOTPRESET = 4,
    MODULES = 5,
    REMOTE = 6,
    CHARACTER_WITHOUT_CHAT = 7,
    ROOT_COMPONENT = 8,
    PLUGINS = 9,
    LOADOUTS = 10,
    PLUGIN_STORAGE = 11,
    /** SaveKV namespace (`kv:<namespace>`), see saveKV.ts */
    KV = 12,
}

const KV_BLOCK_PREFIX = 'kv:'

type EncodeBlockArg = {
    compression:boolean
    data:string
    type:RisuSaveType
    name:string
    cache?:boolean
    skipRemoteSaving?:boolean
}

type EncodeBlockOption = {
    remote: 'none'|'prefer'|'force'
}

const risuSaveCacheForage = localforage.createInstance({
    name: 'risuSaveCache'
});
export class RisuSaveEncoder {

    private blocks: { [key: string]: Uint8Array } = {};
    private compression: boolean = false;
    private kv: SaveKVSource | null = null;
    /** false: never write blocks to separate remote files (self-contained exports) */
    private allowRemote: boolean;
    /** false: do not write blocks to the local block cache (exports must not touch the live save's cache) */
    private cacheBlocks: boolean;

    constructor(options: { remote?: boolean, cache?: boolean } = {}){
        this.allowRemote = options.remote ?? true;
        this.cacheBlocks = options.cache ?? true;
    }

    async init(data:Database,arg:{
        compression?: boolean,
        skipRemoteSavingOnCharacters?: boolean,
        kv?: SaveKVSource | null
    } = {}){
        const {
            compression = false,
            skipRemoteSavingOnCharacters = true,
            kv = null
        } = arg;
        this.compression = compression;
        this.kv = kv;
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
        this.blocks['loadouts'] = await this.encodeBlock({
            compression,
            data: JSON.stringify(data.loadouts),
            type: RisuSaveType.LOADOUTS,
            name: 'loadouts'
        });
        this.blocks['plugins'] = await this.encodeBlock({
            compression,
            data: JSON.stringify(data.plugins),
            type: RisuSaveType.PLUGINS,
            name: 'plugins'
        });
        this.blocks['pluginStorage'] = await this.encodeBlock({
            compression,
            data: JSON.stringify(data.pluginCustomStorage),
            type: RisuSaveType.PLUGIN_STORAGE,
            name: 'pluginStorage'
        });
        for( const character of data.characters ?? []) {
            this.blocks[character.chaId] = await this.encodeBlock({
                compression,
                data: JSON.stringify(character),
                type: RisuSaveType.CHARACTER_WITH_CHAT,
                name: character.chaId,
                skipRemoteSaving: skipRemoteSavingOnCharacters
            }, {
                remote: 'prefer'
            });
        }
        for(const ns of kv?.namespaces() ?? []){
            await this.encodeKVBlock(ns);
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
            if(
                key !== 'characters' && key !== 'botPresets' && key !== 'modules' &&
                key !== 'loadouts' && key !== 'plugins' && key !== 'pluginCustomStorage'
            ){
                obj[key] = data[key]
            }
        }

        const savedId = new Set<string>();
        for(const character of data.characters) {
            const index = toSave.character.indexOf(character.chaId);
            if (index !== -1) {
                this.blocks[character.chaId] = await this.encodeBlock({
                    compression: this.compression,
                    data: JSON.stringify(character),
                    type: RisuSaveType.CHARACTER_WITH_CHAT,
                    name: character.chaId
                }, {
                    remote: 'prefer'
                });
                savedId.add(character.chaId);
                toSave.character.splice(index, 1);
            }
            else if(!this.blocks[character.chaId]){
                this.blocks[character.chaId] = await this.encodeBlock({
                    compression: this.compression,
                    data: JSON.stringify(character),
                    type: RisuSaveType.CHARACTER_WITH_CHAT,
                    name: character.chaId
                }, {
                    remote: 'prefer'
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

        if(toSave.loadouts){
            this.blocks['loadouts'] = await this.encodeBlock({
                compression: this.compression,
                data: JSON.stringify(data.loadouts),
                type: RisuSaveType.LOADOUTS,
                name: 'loadouts'
            });
        }

        if(toSave.pluginCustomStorage){
            this.blocks['pluginStorage'] = await this.encodeBlock({
                compression: this.compression,
                data: JSON.stringify(data.pluginCustomStorage),
                type: RisuSaveType.PLUGIN_STORAGE,
                name: 'pluginStorage'
            });
        }

        if(toSave.plugins){
            this.blocks['plugins'] = await this.encodeBlock({
                compression: this.compression,
                data: JSON.stringify(data.plugins),
                type: RisuSaveType.PLUGINS,
                name: 'plugins'
            });
        }

        for(const ns of toSave.kv ?? []){
            await this.encodeKVBlock(ns);
        }

        obj["__directory"] = Object.keys(this.blocks).filter(key => key !== 'root');
        this.blocks['root'] = await this.encodeBlock({
            compression: this.compression,
            data: JSON.stringify(obj),
            type: RisuSaveType.ROOT,
            name: 'root'
        });
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

    private async encodeKVBlock(ns: string){
        const name = KV_BLOCK_PREFIX + ns
        const content = this.kv ? this.kv.encodeNamespace(ns) : null
        if(content === null){
            delete this.blocks[name]
            return
        }
        this.blocks[name] = await this.encodeBlock({
            compression: this.compression,
            data: content,
            type: RisuSaveType.KV,
            name
        });
    }

    async encodeBlock(arg:EncodeBlockArg, option:EncodeBlockOption = { remote: 'none' }){
        if(
            this.allowRemote &&
            (
                option.remote === 'force' ||
                (
                    option.remote === 'prefer' &&
                    (
                        isTauri ||
                        isNodeServer
                    )
                ) &&
                !disableRemoteSaving()
            )
        ){
            return await this.encodeRemoteBlock(arg);
        }
        return await this.encodeRawBlock(arg);
    }

    async encodeRawBlock(arg:EncodeBlockArg){
        let databuf: Uint8Array;
        const cacheBlock = arg.cache ?? true;
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
        if(this.cacheBlocks && cacheBlock){
            await risuSaveCacheForage.setItem(`risuSaveBlock_${arg.name}`, {
                type: arg.type,
                data: arg.data,
                name: arg.name,
            });
        }
        return buf;
    }

    async encodeRemoteBlock(arg:EncodeBlockArg){
        console.log(`Encoding remote block: ${arg.name}`);
        const encoded = new TextEncoder().encode(arg.data);
        const fileName = `remotes/${arg.name}.local.bin`

        if(arg.skipRemoteSaving && checkedRemoteExistence.has(arg.name) === false){
            let fileExists = false;
            if(isTauri){
                fileExists = await exists(fileName, { baseDir: BaseDirectory.AppData });
            }
            else{
                const stored = await forageStorage.keys();
                if(stored.includes(fileName)){
                    fileExists = true;
                }
            }
            if(!fileExists){
                console.log(`Remote file ${fileName} does not exist, disabling skipRemoteSaving for this block.`);
                arg.skipRemoteSaving = false;
            }
            checkedRemoteExistence.add(arg.name);
        }

        if(!arg.skipRemoteSaving){
            if(isTauri){
                if(!(await exists('remotes', { baseDir: BaseDirectory.AppData }))){
                    await mkdir('remotes', { recursive: true, baseDir: BaseDirectory.AppData });
                }
                await writeFile(fileName, encoded!, { baseDir: BaseDirectory.AppData });
            }
            else{
                await forageStorage.setItem(fileName, encoded);
            }
        }
        return await this.encodeBlock({
            compression: false,
            data: JSON.stringify({
                v: 1,
                type: arg.type,
                name: arg.name,
            }),
            type: RisuSaveType.REMOTE,
            name: arg.name
        });
    }
}

export class RisuSaveDecoder {
    private blocks: {
        name: string;
        type: RisuSaveType;
        compression: boolean;
        content: string;
    }[] = []
    async decode(data: Uint8Array): Promise<DecodedRisuSave> {
        console.log('Decoding RisuSave data');
        let offset = magicRisuSaveHeader.length;
        //@ts-expect-error Database has required fields, but we initialize empty and populate incrementally during decode
        let db:Database = {}
        const kv: SaveKVData = {}
        const loadedBlocks = new Set<string>();
        while (offset < data.length) {
            try {
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

                loadedBlocks.add(name);
                this.blocks.push({
                    name,
                    type,
                    compression,
                    content: new TextDecoder().decode(blockData)
                })   
            } catch (error) {
                continue
            }
        }
        console.log('blocks',this.blocks)
        let directory: string[] = []
        for(let i = 0; i < this.blocks.length; i++){
            const key = i;
            try {
                switch(this.blocks[key].type){
                    case RisuSaveType.ROOT:{
                        const rootData = JSON.parse(this.blocks[key].content);
                        for(const rootKey in rootData){
                            if(!db[rootKey] && !rootKey.startsWith('__')){
                                db[rootKey] = rootData[rootKey];
                            }
                            if(rootKey === '__directory'){
                                directory = rootData[rootKey];
                                console.log('RisuSave directory:', directory);
                                for(const dirKey of directory){
                                    if(!loadedBlocks.has(dirKey)){
                                        try {
                                            console.log(`Loading directory block ${dirKey} from cache`);
                                            const dirData:{
                                                type:RisuSaveType
                                                data:string
                                                name:string
                                            } = await risuSaveCacheForage.getItem(`risuSaveBlock_${dirKey}`) as any;

                                            if(dirData){
                                                this.blocks.push({
                                                    name: dirData.name,
                                                    type: dirData.type,
                                                    compression: false,
                                                    content: dirData.data
                                                });
                                                loadedBlocks.add(dirKey);
                                            }
                                        } catch (error) {
                                            console.error(`Error loading directory block ${dirKey}:`, error);
                                        }
                                    }
                                }
                            }
                        }
                        break;
                    }
                    case RisuSaveType.CHARACTER_WITH_CHAT:
                    case RisuSaveType.CHARACTER_WITHOUT_CHAT:{
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
                    case RisuSaveType.CONFIG:{
                        //ignore for now
                        break;
                    }
                    case RisuSaveType.PLUGINS:{
                        db.plugins = JSON.parse(this.blocks[key].content);
                        break;
                    }
                    case RisuSaveType.LOADOUTS:{
                        db.loadouts = JSON.parse(this.blocks[key].content);
                        break;
                    }
                    case RisuSaveType.PLUGIN_STORAGE:{
                        db.pluginCustomStorage = JSON.parse(this.blocks[key].content);
                        break;
                    }
                    case RisuSaveType.KV:{
                        const name = this.blocks[key].name;
                        if(name.startsWith(KV_BLOCK_PREFIX)){
                            kv[name.slice(KV_BLOCK_PREFIX.length)] = JSON.parse(this.blocks[key].content);
                        }
                        break;
                    }
                    case RisuSaveType.REMOTE:{
                        const remoteInfo:{
                            v:number
                            type:RisuSaveType
                            name:string
                        } = JSON.parse(this.blocks[key].content);
                        const fileName = `remotes/${remoteInfo.name}.local.bin`
                        let remoteData:Uint8Array|null = null
                        if(isTauri){
                            try {
                                if(await exists(fileName, { baseDir: BaseDirectory.AppData })){
                                    remoteData = await readFile(fileName, { baseDir: BaseDirectory.AppData });
                                }
                            } catch (error) {
                                console.error(`Error reading remote file ${fileName} in Tauri:`, error);
                            }
                        }
                        else{
                            const stored = await forageStorage.getItem(fileName);
                            if(stored){
                                remoteData = stored as Uint8Array;
                            }
                        }

                        if(!remoteData){
                            console.warn(`Remote file ${fileName} not found.`);
                            break;
                        }
                        const decoded = new TextDecoder().decode(remoteData)

                        //add to blocks for further processing
                        this.blocks.push({
                            name: remoteInfo.name,
                            type: remoteInfo.type,
                            compression: false,
                            content: decoded
                        });
                        break;
                    }
                    case RisuSaveType.ROOT_COMPONENT:{
                        const componentData:{
                            data:any
                            key:string
                        } = JSON.parse(this.blocks[key].content);
                        db[componentData.key] = componentData.data;
                        break;
                    }
                    default:{
                        console.warn(`Not Implemented RisuSaveType: ${this.blocks[key].type} for ${this.blocks[key].name}`);
                    }
                }   
            } catch (error) {
                console.error(`Error processing block ${this.blocks[key].name}:`, error);

                if(this.blocks[key].type === RisuSaveType.ROOT){
                    throw new Error('Failed to decode root block, cannot proceed with decoding RisuSave data');
                }
            }
        }
        //to fix botpreset bugs
        if(!Array.isArray(db.botPresets) || db.botPresets.length === 0){
            db.botPresets = [presetTemplate]
            db.botPresetsId = 0
        }
        console.log('Decoded RisuSave data', db);
        return { database: db, kv };
    }
}

export type DecodedRisuSave = {
    database: Database
    /** SaveKV namespaces stored in the save (empty for formats older than RisuSave blocks) */
    kv: SaveKVData
}

/**
 * Decodes any save format. Returns the database and the SaveKV data separately;
 * the caller decides whether they become live (setDatabase + saveKV.load).
 */
export async function decodeRisuSave(data:Uint8Array): Promise<DecodedRisuSave>{
    const header = checkHeader(data)
    if(header === 'risusave'){
        try {
            const decoder = new RisuSaveDecoder();
            return await decoder.decode(data);
        } catch (error) {
            //kept from the original decoder: a failed RisuSave decode still tries the legacy fallbacks
            console.error('Error decoding RisuSave data:', error);
            return { database: await decodeFallback(data), kv: {} }
        }
    }
    return { database: await decodeLegacyRisuSave(data, header), kv: {} }
}

async function decodeLegacyRisuSave(data:Uint8Array, header:ReturnType<typeof checkHeader>){
    try {
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
        }
        return unpackr.decode(data)
    }
    catch (error) {
        console.error('Error decoding RisuSave data:', error);
        //data may already be sliced past the header here, as before
        return await decodeFallback(data)
    }
}

/** last-resort decoders for older/odd save formats */
async function decodeFallback(data:Uint8Array){
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

/**
 * Encodes a complete, self-contained save file in the RisuSave block format (backups, exports, migrations).
 * Never writes remote block files or the local block cache.
 */
export async function encodeRisuSave(data:Database|Record<string, never>, arg:{
    compression?: boolean,
    kv?: SaveKVSource | null
} = {}): Promise<Uint8Array>{
    const encoder = new RisuSaveEncoder({ remote: false, cache: false });
    await encoder.init(data as Database, {
        compression: arg.compression ?? false,
        kv: arg.kv ?? null
    });
    return new Uint8Array(encoder.encode());
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