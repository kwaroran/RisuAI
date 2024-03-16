import type { Tiktoken } from "@dqbd/tiktoken";
import type { Tokenizer } from "@mlc-ai/web-tokenizers";
import { DataBase, type character } from "./storage/database";
import { get } from "svelte/store";
import type { OpenAIChat } from "./process";
import { supportsInlayImage } from "./process/files/image";
import { risuChatParser } from "./parser";
import { tokenizeGGUFModel } from "./process/models/local";

async function encode(data:string):Promise<(number[]|Uint32Array|Int32Array)>{
    let db = get(DataBase)
    if(db.aiModel.startsWith('novellist')){
        const nv= await tokenizeWebTokenizers(data, 'novellist')
        return nv
    }
    if(db.aiModel.startsWith('claude')){
        return await tokenizeWebTokenizers(data, 'claude')
    }
    if(db.aiModel.startsWith('novelai')){
        return await tokenizeWebTokenizers(data, 'novelai')
    }
    if(db.aiModel.startsWith('mistral')){
        return await tokenizeWebTokenizers(data, 'mistral')
    }
    if(db.aiModel === 'mancer' ||
        db.aiModel === 'textgen_webui' ||
        (db.aiModel === 'reverse_proxy' && db.reverseProxyOobaMode)){
        return await tokenizeWebTokenizers(data, 'llama')
    }
    if(db.aiModel.startsWith('local_')){
        return await tokenizeGGUFModel(data)
    }
    if(db.aiModel === 'ooba'){
        if(db.reverseProxyOobaArgs.tokenizer === 'mixtral' || db.reverseProxyOobaArgs.tokenizer === 'mistral'){
            return await tokenizeWebTokenizers(data, 'mistral')
        }
        else if(db.reverseProxyOobaArgs.tokenizer === 'llama'){
            return await tokenizeWebTokenizers(data, 'llama')
        }
        else{
            return await tokenizeWebTokenizers(data, 'llama')
        }
    }

    return await tikJS(data)
}

type tokenizerType = 'novellist'|'claude'|'novelai'|'llama'|'mistral'

let tikParser:Tiktoken = null
let tokenizersTokenizer:Tokenizer = null
let tokenizersType:tokenizerType = null

async function tikJS(text:string) {
    if(!tikParser){
        const {Tiktoken} = await import('@dqbd/tiktoken')
        const cl100k_base = await import("@dqbd/tiktoken/encoders/cl100k_base.json");
    
        tikParser = new Tiktoken(
            cl100k_base.bpe_ranks,
            cl100k_base.special_tokens,
            cl100k_base.pat_str
        );
    }
    return tikParser.encode(text)
}

async function tokenizeWebTokenizers(text:string, type:tokenizerType) {
    if(type !== tokenizersType || !tokenizersTokenizer){
        const webTokenizer = await import('@mlc-ai/web-tokenizers')
        switch(type){
            case "novellist":
                tokenizersTokenizer = await webTokenizer.Tokenizer.fromSentencePiece(
                    await (await fetch("/token/trin/spiece.model")
                ).arrayBuffer())
                break
            case "claude":
                tokenizersTokenizer = await webTokenizer.Tokenizer.fromJSON(
                    await (await fetch("/token/claude/claude.json")
                ).arrayBuffer())
                break
            case 'novelai':
                tokenizersTokenizer = await webTokenizer.Tokenizer.fromSentencePiece(
                    await (await fetch("/token/nai/nerdstash_v2.model")
                ).arrayBuffer())
                
                break
            case 'llama':
                tokenizersTokenizer = await webTokenizer.Tokenizer.fromSentencePiece(
                    await (await fetch("/token/llama/llama.model")
                ).arrayBuffer())
                break
            case 'mistral':
                tokenizersTokenizer = await webTokenizer.Tokenizer.fromSentencePiece(
                    await (await fetch("/token/mistral/tokenizer.model")
                ).arrayBuffer())
                break

        }
        tokenizersType = type
    }
    return (tokenizersTokenizer.encode(text))
}

export async function tokenizerChar(char:character) {
    const encoded = await encode(char.name + '\n' + char.firstMessage + '\n' + char.desc)
    return encoded.length
}

export async function tokenize(data:string) {
    const encoded = await encode(data)
    return encoded.length
}

export async function tokenizeAccurate(data:string, consistantChar?:boolean) {
    data = risuChatParser(data.replace('{{slot}}',''), {
        tokenizeAccurate: true,
        consistantChar: consistantChar,
    })
    const encoded = await encode(data)
    return encoded.length
}


export class ChatTokenizer {

    private chatAdditonalTokens:number
    private useName:'name'|'noName'

    constructor(chatAdditonalTokens:number, useName:'name'|'noName'){
        this.chatAdditonalTokens = chatAdditonalTokens
        this.useName = useName
    }
    async tokenizeChat(data:OpenAIChat) {
        if(data.memo && data.memo.startsWith('inlayImage')){
            const db = get(DataBase)
            if(!supportsInlayImage()){
                return this.chatAdditonalTokens
            }
            if(db.gptVisionQuality === 'low'){
                return 87
            }

            let encoded = this.chatAdditonalTokens
            const memo = data.memo.split('-')
            let height = parseInt(memo[1])
            let width = parseInt(memo[2])

            if(height === width){
                if(height > 768){
                    height = 768
                    width = 768
                }
            }
            else if(height > width){
                if(width > 768){
                    width = 768
                    height = height * (768 / width)
                }
            }
            else{
                if(height > 768){
                    height = 768
                    width = width * (768 / height)
                }
            }

            const chunkSize = Math.ceil(width / 512) * Math.ceil(height / 512)
            encoded += chunkSize * 2
            encoded += 85

            return encoded
        }

        let encoded = (await encode(data.content)).length + this.chatAdditonalTokens
        if(data.name && this.useName ==='name'){
            encoded += (await encode(data.name)).length + 1
        }
        return encoded
    }

    
}

export async function tokenizeNum(data:string) {
    const encoded = await encode(data)
    return encoded
}

export async function strongBan(data:string, bias:{[key:number]:number}) {

    if(localStorage.getItem('strongBan_' + data)){
        return JSON.parse(localStorage.getItem('strongBan_' + data))
    }
    const performace = performance.now()
    const length = Object.keys(bias).length
    let charAlt = [
        data,
        data.trim(),
        data.toLocaleUpperCase(),
        data.toLocaleLowerCase(),
        data[0].toLocaleUpperCase() + data.slice(1),
        data[0].toLocaleLowerCase() + data.slice(1),
    ]

    let banChars = " !\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~“”‘’«»「」…–―※"
    let unbanChars:number[] = []

    for(const char of banChars){
        unbanChars.push((await tokenizeNum(char))[0])
    }



    for(const char of banChars){
        const encoded = await tokenizeNum(char)
        if(encoded.length > 0){
            if(!unbanChars.includes(encoded[0])){
                bias[encoded[0]] = -100
            }
        }
        for(const alt of charAlt){
            let fchar = char

            const encoded = await tokenizeNum(alt + fchar)
            if(encoded.length > 0){
                if(!unbanChars.includes(encoded[0])){
                    bias[encoded[0]] = -100
                }
            }
            const encoded2 = await tokenizeNum(fchar + alt)
            if(encoded2.length > 0){
                if(!unbanChars.includes(encoded2[0])){
                    bias[encoded2[0]] = -100
                }
            }
        }
    }
    localStorage.setItem('strongBan_' + data, JSON.stringify(bias))
    return bias
}