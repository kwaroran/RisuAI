import DOMPurify from 'dompurify';
import markdownit from 'markdown-it'
import { appVer, getCurrentCharacter, getDatabase, type Database, type character, type customscript, type groupChat, type triggerscript } from '../storage/database.svelte';
import { DBState, selIdState } from '../stores.svelte';
import { aiWatermarkingLawApplies, getFileSrc } from '../globalApi.svelte';
import { isTauri, isNodeServer } from "src/ts/platform"
import { getChatVar, setChatVar, getGlobalChatVar } from './chatVar.svelte';
import { processScriptFull } from '../process/scripts';
import { get } from 'svelte/store';
import css, { type CssAtRuleAST } from '@adobe/css-tools'
import { selectedCharID } from '../stores.svelte';
import { calcString } from '../process/infunctions';
import { findCharacterbyId, getPersonaPrompt, getUserIcon, getUserName, pickHashRand, replaceAsync} from '../util';
import { getInlayAssetBlob } from '../process/files/inlays';
import { getModuleAssets, getModuleLorebooks, getModules } from '../process/modules';
import hljs from 'highlight.js/lib/core'
import 'highlight.js/styles/atom-one-dark.min.css'
import { language } from 'src/lang';
import katex from 'katex'
import { getModelInfo } from '../model/modellist';
import { registerCBS, type matcherArg, type RegisterCallback } from '../cbs';
import cssSelectorParser from 'postcss-selector-parser'

const markdownItOptions = {
    html: true,
    breaks: true,
    linkify: false,
    typographer: true,
    quotes: '\u{E9b0}\u{E9b1}\u{E9b2}\u{E9b3}', //placeholder characters to convert to real quotes
}

const md = markdownit(markdownItOptions)
const mdHighlight = markdownit({
    highlight: function (str, lang) {
        if(lang){
            return `<pre-hljs-placeholder lang="${lang}">`+ str +'</pre-hljs-placeholder>';
        }
        return ''
    },
    ...markdownItOptions
})

md.disable(['code'])
mdHighlight.disable(['code'])

DOMPurify.addHook("uponSanitizeElement", (node: HTMLElement, data) => {
    if (data.tagName === "iframe") {
       const src = node.getAttribute("src") || "";
       if (!src.startsWith("https://www.youtube.com/embed/")) {
          return node.parentNode.removeChild(node);
       }
    }
    if(data.tagName === 'img'){
        // Hide external images when hideAllImages is enabled
        if(DBState.db?.hideAllImages){
            const src = node.getAttribute("src") || "";
            // Replace with placeholder if it's an external/loaded image
            if(src && !src.startsWith('data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP')){
                node.setAttribute("src", "/none.webp");
                node.setAttribute("alt", "?");
            }
            return;
        }
        
        const loading = node.getAttribute("loading")
        if(!loading){
            node.setAttribute("loading","lazy")
        }
        const decoding = node.getAttribute("decoding")
        if(!decoding){
            node.setAttribute("decoding", "async")
        }
    }
});

DOMPurify.addHook("uponSanitizeAttribute", (node, data) => {
    switch(data.attrName){
        case 'style':{
            // Remove background-image URLs when hideAllImages is enabled
            if(DBState.db?.hideAllImages && data.attrValue){
                // Remove background-image property from inline styles
                data.attrValue = data.attrValue.replace(/background(-image)?:\s*url\([^)]*\);?/gi, '')
                // Also remove background property if it contains url()
                data.attrValue = data.attrValue.replace(/background:\s*[^;]*url\([^)]*\)[^;]*;?/gi, '')
            }
            break
        }
        case 'class':{
            if(data.attrValue){
                data.attrValue = data.attrValue.split(' ').map((v) => {
                    if(v.startsWith('hljs')){
                        return v
                    }
                    if(v.startsWith('x-risu-')){
                        return v
                    }
                    return "x-risu-" + v
                }).join(' ')
            }
            break
        }
        case 'href':{
            if(data.attrValue.startsWith('http://') || data.attrValue.startsWith('https://')){
                node.setAttribute('target', '_blank')
                break
            }
            data.attrValue = ''
            break
        }
    }
})

DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
    if (['IMG', 'SOURCE', 'VIDEO', 'AUDIO', 'STYLE'].includes(node.nodeName) && data.attrName === 'src') {
        if (data.attrValue.startsWith('blob:')) {
            data.forceKeepAttr = true;
        }
    }
});


const replacements = [
    '{', //0xE9B8
    '}', //0xE9B9
    '(', //0xE9BA
    ')', //0xE9BB
    '&lt;', //0xE9BC
    '&gt;', //0xE9BD
    ':', //0xE9BE
    ';', //0xE9BF
]

export function risuUnescape(text:string){
    return text.replace(/[\uE9b8-\uE9bf]/g, (f) => {
        const index = f.charCodeAt(0) - 0xE9B8
        return replacements[index]
    })
}

export function risuEscape(text:string){
    return text.replace(/[{}()]/g, (f) => {
        switch(f){
            case '{': return '\uE9B8'
            case '}': return '\uE9B9'
            case '(': return '\uE9BA'
            case ')': return '\uE9BB'
            default: return f
        }
    })
}

function renderMarkdown(md:markdownit, data:string){
    let quotes = ['“', '”', '‘', '’']
    if(DBState.db?.customQuotes){
        quotes = DBState.db.customQuotesData ?? quotes
    }
    data = data.replace(/\$\$(.*?)\$\$/gs, (
        match:string,
        content:string,
    ) => {

        try {
            content = content
                .replace(/\uE9b8/gu, '{')
                .replace(/\uE9b9/gu, '}')
                .replace(/\uE9ba/gu, '(')
                .replace(/\uE9bb/gu, ')')
            const rendered = katex.renderToString(content, {
                displayMode: false,
                throwOnError: true,
                output: 'mathml'
            })
            return rendered
        } catch (error) {
            console.error('KaTeX render error:', error)
            return match
        }
    })
    let text = risuUnescape(md.render(data.replace(/“|”/g, '"').replace(/‘|’/g, "'")))

    if(DBState.db?.unformatQuotes){
        text = text.replace(/\uE9b0/gu, quotes[0]).replace(/\uE9b1/gu, quotes[1])
        text = text.replace(/\uE9b2/gu, quotes[2]).replace(/\uE9b3/gu, quotes[3])
    }
    else if(DBState.db?.blockquoteStyling){
        text = text.replace(/\uE9b0(.+?)\uE9b1/gum, (full, content) => {
            content = content.replace(/\uE9b2/gu, '<mark risu-mark="quote1">' + quotes[2]).replace(/\uE9b3/gu, quotes[3] + '</mark>')
            return `<br><br><mark risu-mark="blockquote2">${quotes[0]}${content}${quotes[1]}</mark><br><br>`
        }).replace(/\uE9b2(.+?)\uE9b3/gum, (full, content) => {
            return `<br><br><mark risu-mark="blockquote1">${quotes[2]}${content}${quotes[3]}</mark><br><br>`
        })

        //clean up any unmatched quote marks
        text = text.replace(/\uE9b0/gu,  quotes[0]).replace(/\uE9b1/gu, quotes[1])
        text = text.replace(/\uE9b2/gu, quotes[2]).replace(/\uE9b3/gu, quotes[3])
        
    }
    else{
        text = text.replace(/\uE9b0/gu, '<mark risu-mark="quote2">' + quotes[0]).replace(/\uE9b1/gu, quotes[1] + '</mark>')
        text = text.replace(/\uE9b2/gu, '<mark risu-mark="quote1">' + quotes[2]).replace(/\uE9b3/gu, quotes[3] + '</mark>')
    }

    return text
}

async function renderHighlightableMarkdown(data:string) {
    let rendered = renderMarkdown(mdHighlight, data)
    const highlightPlaceholders = rendered.match(/<pre-hljs-placeholder lang="(.+?)">(.+?)<\/pre-hljs-placeholder>/gms)
    if (!highlightPlaceholders){
        return rendered
    }

    for (const placeholder of highlightPlaceholders){
        try {
            let lang = placeholder.match(/lang="(.+?)"/)?.[1]
            const code = placeholder.match(/<pre-hljs-placeholder lang=".+?">(.+?)<\/pre-hljs-placeholder>/ms)?.[1]
            if (!lang || !code){
                continue
            }
            //import language if not already loaded
            //we do not refactor this to a function because we want to keep vite to only import the languages that are needed
            let languageModule: typeof import('highlight.js/lib/languages/*')|null = null
            let fileExt = ''

            switch(lang){
                case 'bash':{
                    fileExt = 'sh'
                    lang = 'bash'
                    if(!hljs.getLanguage('bash')){
                        languageModule = await import('highlight.js/lib/languages/bash')
                    }
                    break
                }
                case 'c':
                case 'cpp':{
                    fileExt = lang
                    lang = 'cpp'
                    if(!hljs.getLanguage('cpp')){
                        languageModule = await import('highlight.js/lib/languages/cpp')
                    }
                    break
                }
                case 'cs':
                case 'csharp':{
                    fileExt = 'cs'
                    lang = 'csharp'
                    if(!hljs.getLanguage('csharp')){
                        languageModule = await import('highlight.js/lib/languages/csharp')
                    }
                    break
                }
                case 'css':{
                    fileExt = 'css'
                    lang = 'css'
                    if(!hljs.getLanguage('css')){
                        languageModule = await import('highlight.js/lib/languages/css')
                    }
                    break
                }
                case 'dart':{
                    fileExt = 'dart'
                    lang = 'dart'
                    if(!hljs.getLanguage('dart')){
                        languageModule = await import('highlight.js/lib/languages/dart')
                    }
                    break
                }
                case 'html':
                case 'svg':
                case 'xml':{
                    fileExt = lang
                    lang = 'xml'
                    if(!hljs.getLanguage('xml')){
                        languageModule = await import('highlight.js/lib/languages/xml')
                    }
                    break
                }
                case 'java':{
                    fileExt = 'java'
                    lang = 'java'
                    if(!hljs.getLanguage('java')){
                        languageModule = await import('highlight.js/lib/languages/java')
                    }
                    break
                }
                case 'js':
                case 'jsx':
                case 'javascript':{
                    fileExt = 'js'
                    lang = 'javascript'
                    if(!hljs.getLanguage('javascript')){
                        languageModule = await import('highlight.js/lib/languages/javascript')
                    }
                    break
                }
                case 'json':{
                    fileExt = 'json'
                    lang = 'json'
                    if(!hljs.getLanguage('json')){
                        languageModule = await import('highlight.js/lib/languages/json')
                    }
                    break
                }
                case 'lua':{
                    fileExt = 'lua'
                    lang = 'lua'
                    if(!hljs.getLanguage('lua')){
                        languageModule = await import('highlight.js/lib/languages/lua')
                    }
                    break
                }
                case 'markdown':
                case 'md':{
                    fileExt = 'md'
                    lang = 'markdown'
                    if(!hljs.getLanguage('markdown')){
                        languageModule = await import('highlight.js/lib/languages/markdown')
                    }
                    break
                }
                case 'py':
                case 'python':{
                    fileExt = 'py'
                    lang = 'python'
                    if(!hljs.getLanguage('python')){
                        languageModule = await import('highlight.js/lib/languages/python')
                    }
                    break
                }
                case 'rust':{
                    fileExt = 'rs'
                    lang = 'rust'
                    if(!hljs.getLanguage('rust')){
                        languageModule = await import('highlight.js/lib/languages/rust')
                    }
                    break
                }
                case 'shell':{
                    fileExt = 'sh'
                    lang = 'shell'
                    if(!hljs.getLanguage('shell')){
                        languageModule = await import('highlight.js/lib/languages/shell')
                    }
                    break
                }
                case 'ts':
                case 'tsx':
                case 'typescript':{
                    fileExt = 'ts'
                    lang = 'typescript'
                    if(!hljs.getLanguage('typescript')){
                        languageModule = await import('highlight.js/lib/languages/typescript')
                    }
                    break
                }
                case 'txt':
                case 'vtt':{
                    fileExt = lang
                    lang = 'plaintext'
                    if(!hljs.getLanguage('plaintext')){
                        languageModule = await import('highlight.js/lib/languages/plaintext')
                    }
                    break
                }
                case 'yaml':{
                    fileExt = 'yml'
                    lang = 'yaml'
                    if(!hljs.getLanguage('yaml')){
                        languageModule = await import('highlight.js/lib/languages/yaml')
                    }
                    break
                }
                case 'risuerror':{
                    lang = 'error'
                    fileExt = 'error'
                    break
                }
                default:{
                    lang = 'none'
                    fileExt = 'none'
                }
            }
            if(languageModule){
                hljs.registerLanguage(lang, languageModule.default)
            }
            if(lang === 'none'){
                rendered = rendered.replace(placeholder, `<pre><code>${md.utils.escapeHtml(code)}</code></pre>`)
            }
            else if(lang === 'error'){
                rendered = rendered.replace(placeholder, `<div class="risu-error"><h1>${language.error}</h1>${md.utils.escapeHtml(code)}</div>`)
            }
            else{
                const highlighted = hljs.highlight(code, {
                    language: lang,
                    ignoreIllegals: true
                }).value
                rendered = rendered.replace(placeholder, `<pre class="hljs" x-hl-lang="${fileExt}"><code>${highlighted}</code></pre>`)   
            }
        } catch (error) {
            
        }
    }

    return rendered

}

export const assetRegex = /{{(raw|path|img|image|video|audio|bgm|bg|emotion|asset|video-img|source)::(.+?)}}/gms

function getAssetSrc(assetArr: string[][], assetPaths: AssetPaths) {
    for (const asset of assetArr) {
        const key = asset[0].toLocaleLowerCase()
        assetPaths[key] ??= {
            srcPaths: [],
            ext: asset[2]
        }
        if(assetPaths[key].ext === asset[2]){
            assetPaths[key].srcPaths.push(asset[1])
        }
    }
}

function getEmoSrc(emoArr: string[][], emoPaths: AssetPaths) {
    for (const emo of emoArr) {
        emoPaths[emo[0].toLocaleLowerCase()] = {
            srcPaths: [emo[1]]
        }
    }
}

const fileSrcCache = new Map<string, string>()

async function getFileSrcCached(path:string){
    let cached = fileSrcCache.get(path)
    if(cached){
        return cached
    }
    const src = await getFileSrc(path)
    fileSrcCache.set(path, src)
    return src
}

type AssetPaths = {[key:string]:{
    srcPaths:string[]
    ext?:string
}}

let assetsCache: AssetPaths | null = null
let emoAssetsCache: AssetPaths | null = null

export function resetAssetsCache(charAssets: string[][], emoAssets: string[][], moduleAssets: string[][]) {
    const assetPaths: AssetPaths = {}
    const charEmoPaths: AssetPaths = {}

    getAssetSrc(charAssets, assetPaths)
    getAssetSrc(moduleAssets, assetPaths)
    getEmoSrc(emoAssets, charEmoPaths)

    assetsCache = assetPaths
    emoAssetsCache = charEmoPaths
}

$effect.root(() => {
    $effect(() => {
        const charId = selIdState.selId
        const char = DBState.db.characters?.[charId]
        if (!char || char.type !== 'character') {
            return
        }

        const charAssets = char.additionalAssets ?? []
        const emoAssets = char.emotionImages ?? []
        const moduleAssets = getModuleAssets()

        resetAssetsCache(charAssets, emoAssets, moduleAssets)
    })
})

const imageCBS = ['img', 'image', 'emotion', 'asset', 'bg', 'raw', 'path']
const videoExtensions = ['mp4', 'webm', 'avi', 'm4p', 'm4v']

async function parseAdditionalAssets(data:string, char:simpleCharacterArgument|character, mode:'normal'|'back', arg:{ch:number}){
    const assetWidthString = (DBState.db.assetWidth && DBState.db.assetWidth !== -1 || DBState.db.assetWidth === 0) ? `max-width:${DBState.db.assetWidth}rem;` : ''

    if (char.type === 'character' && (!assetsCache || !emoAssetsCache)) {
        resetAssetsCache(char.additionalAssets ?? [], char.emotionImages, getModuleAssets())
    }

    const assetPaths = assetsCache ?? {}
    const emoPaths = emoAssetsCache ?? {}

    let needsSourceAccess = false
    let cx: number|null = null

    data = await replaceAsync(data, assetRegex, async (full:string, type:string, name:string) => {
        name = name.toLocaleLowerCase()

        // Skip image-related assets when hideAllImages is enabled
        // raw and path are also included as they're used in CSS background-image
        if(DBState.db.hideAllImages && imageCBS.includes(type)){
            return ''  // Hide the image asset
        }

        if(type === 'emotion'){
            const srcPath = emoPaths?.[name]?.srcPaths?.[0]
            const path = srcPath ? await getFileSrcCached(srcPath) : null
            if(!path){
                return ''
            }
            return `<img src="${path}" alt="${path}" style="${assetWidthString} "/>`
        }

        if(type === 'source'){
            needsSourceAccess = true
            switch(name){
                case 'char':{
                    return '\uE9b4CHAR\uE9b4'
                }
                case 'user': {
                    return '\uE9b4USER\uE9b4'
                }
            }
        }

        let match = assetPaths?.[name]

        if(!match){
            if(DBState.db.legacyMediaFindings){
                return ''
            }

            if(assetPaths){
                match = getClosestMatch(char, name, assetPaths)
            }

            if(!match){
                return ''
            }
        }

        let pSrc = match.srcPaths[0]

        if(match.srcPaths.length > 1){
            if(cx === null){
                const chatID = arg.ch
                cx = pickHashRand(chatID, (char.chaId || 'global') + chatID)
            }
            const selIndex = Math.floor(cx * match.srcPaths.length)
            pSrc = match.srcPaths[selIndex]
        }

        const p = await getFileSrcCached(pSrc)
        switch(type){
            case 'raw':
            case 'path':
                return p
            case 'img':
                return `<img src="${p}" alt="${p}" style="${assetWidthString} "/>`
            case 'image':
                return `<div class="risu-inlay-image"><img src="${p}" alt="${p}" style="${assetWidthString}"/></div>\n`
            case 'video':
                return `<video controls autoplay loop><source src="${p}" type="video/mp4"></video>\n`
            case 'video-img':
                return `<video autoplay muted loop><source src="${p}" type="video/mp4"></video>\n`
            case 'audio':
                return `<audio controls autoplay loop><source src="${p}" type="audio/mpeg"></audio>\n`
            case 'bg':
                if(mode === 'back'){
                    return `<div style="width:100%;height:100%;background: linear-gradient(rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.8)),url(${p}); background-size: cover;"></div>`
                }
                break
            case 'asset':{
                if(match.ext && videoExtensions.includes(match.ext)){
                    return `<video autoplay muted loop><source src="${p}" type="video/mp4"></video>\n`
                }
                return `<img src="${p}" alt="${p}" style="${assetWidthString} "/>\n`
            }
            case 'bgm':
                return `<div risu-ctrl="bgm___auto___${p}" style="display:none;"></div>\n`
        }
        return ''
    })

    if(needsSourceAccess){
        const chara = getCurrentCharacter()
        if(chara.image){}
        data = data.replace(/\uE9b4CHAR\uE9b4/g,
            chara.image ? (await getFileSrc(chara.image)) : ''
        )

        data = data.replace(/\uE9b4USER\uE9b4/g,
            getUserIcon() ? (await getFileSrc(getUserIcon())) : ''
        )
    }
    
    return data
}

function getClosestMatch(char: simpleCharacterArgument|character, name:string, assetPaths:AssetPaths){   
    if(!char.additionalAssets) return null

    let closest = ''
    let closestDist = 999999
    let targetPath = ''
    let targetExt = ''

    const trimmedName = trimmer(name)
    for(const asset of char.additionalAssets) {
        const key = asset[0].toLocaleLowerCase()
        const dist = getDistance(trimmedName, trimmer(key))
        if(dist < closestDist){
            closest = key
            closestDist = dist
            targetPath = asset[1]
            targetExt = asset[2]
        }
    }
    
    if(closestDist > DBState.db.assetMaxDifference){
        return null
    }

    assetPaths[closest] = {
        srcPaths: [targetPath],
        ext: targetExt
    }

    return assetPaths[closest]
}

//Levenshtein distance, new with 1d array
export function getDistance(a:string, b:string) {
    const h = a.length + 1
    const w = b.length + 1
    let d = new Int16Array(h * w)
    for(let i=0;i<h;i++){
        d[i * w] = i
    }
    for(let i=0;i<w;i++){
        d[i] = i
    }
    for(let i=1; i<h; i++){
        for(let j=1;j<w;j++){
            d[i * w + j] = Math.min(
                d[(i-1) * w + j-1] + (a.charAt(i-1)===b.charAt(j-1) ? 0 : 1),
                d[(i-1) * w + j]+1, d[i * w + j-1]+1
            )
        }
    }
    return d[h * w - 1]
}

function trimmer(str:string){
    const ext = ['webp', 'png', 'jpg', 'jpeg', 'gif', 'mp4', 'webm', 'avi', 'm4p', 'm4v', 'mp3', 'wav', 'ogg']
    for(const e of ext){
        if(str.endsWith('.' + e)){
            str = str.substring(0, str.length - e.length - 1)
        }
    }

    return str.trim().replace(/[_ -.]/g, '')
}

const blobUrlCache = new Map<string, string>()

async function parseInlayAssets(data:string){
    const inlayMatch = data.match(/{{(inlay|inlayed|inlayeddata)::(.+?)}}/g)
    if(inlayMatch){
        for(const inlay of inlayMatch){
            const inlayType = inlay.startsWith('{{inlayed') ? 'inlayed' : 'inlay'
            const id = inlay.substring(inlay.indexOf('::') + 2, inlay.length - 2)
            let prefix = inlayType !== 'inlay' ? `<div class="risu-inlay-image">` : ''
            let postfix = inlayType !== 'inlay' ? `</div>\n\n` : ''

            const asset = await getInlayAssetBlob(id)
            let url = blobUrlCache.get(id)
            if(!url && asset?.data){
                url = URL.createObjectURL(asset.data)
                blobUrlCache.set(id, url)
            } 
            switch(asset?.type){
                case 'image':
                    // Hide inlay images when hideAllImages is enabled
                    if(DBState.db.hideAllImages){
                        data = data.replace(inlay, '')
                        break
                    }
                    data = data.replace(inlay, `${prefix}<img src="${url}"/>${postfix}`)
                    break
                case 'video':
                    data = data.replace(inlay, `${prefix}<video controls><source src="${url}" type="video/mp4"></video>${postfix}`)
                    break
                case 'audio':
                    data = data.replace(inlay, `${prefix}<audio controls><source src="${url}" type="audio/mpeg"></audio>${postfix}`)
                    break
            }
            
        }
    }
    return data
}

export interface simpleCharacterArgument{
    type: 'simple'
    additionalAssets?: [string, string, string][]
    customscript: customscript[]
    chaId: string,
    virtualscript?: string
    emotionImages?: [string, string][]
    triggerscript?: triggerscript[]
}

function parseThoughtsAndTools(data:string){
    let result = '', i = 0
    while (i < data.length) {
        if (data.slice(i, i + 10) === '<Thoughts>') {
            let j = i + 10, depth = 1
            while (j < data.length && depth > 0) {
                if (data.slice(j, j + 10) === '<Thoughts>') depth++
                if (data.slice(j, j + 11) === '</Thoughts>') depth--
                j++
            }
            if (depth === 0) {
                result += `<details><summary>${language.cot}</summary>${data.substring(i + 10, j - 1)}</details>`
                i = j + 10
                continue
            }
        }
        result += data[i++]
    }
    return result.replace(/<tool_call>(.+?)<\/tool_call>/gms, (full, txt:string) => {
        return `<div class="x-risu-tool-call">🛠️ ${language.toolCalled.replace('{{tool}}',txt.split('\uf100')?.[1] ?? 'unknown')}</div>\n\n`
    })
}

export async function ParseMarkdown(
    data:string,
    charArg:(character|simpleCharacterArgument | groupChat | string) = null,
    mode:'normal'|'back'|'pretranslate'|'notrim' = 'normal',
    chatID=-1,
    cbsConditions:CbsConditions = {}
) {
    let firstParsed = ''
    const additionalAssetMode = (mode === 'back') ? 'back' : 'normal'
    let char = (typeof(charArg) === 'string') ? (findCharacterbyId(charArg)) : (charArg)

    if(char && char.type !== 'group'){
        data = await parseAdditionalAssets(data, char, additionalAssetMode, {
            ch: chatID
        })
        firstParsed = data
    }

    if(char){
        data = (await processScriptFull(char, data, 'editdisplay', chatID, cbsConditions)).data
    }

    if(firstParsed !== data && char && char.type !== 'group'){
        data = await parseAdditionalAssets(data, char, additionalAssetMode, {
            ch: chatID
        })
    }

    data = await parseInlayAssets(data ?? '')

    data = parseThoughtsAndTools(data)

    data = encodeStyle(data)
    if(mode === 'normal' || mode === 'notrim'){
        data = await renderHighlightableMarkdown(data)

        if(mode === 'notrim'){
            return data
        }
    }
    return trimMarkdown(data)
}

const trimPurifyConfig = {
    ADD_TAGS: ["iframe", "style", "risu-style", "x-em", 'annotation', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'mfrac', 'msqrt'],
    ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "scrolling", "risu-btn", "risu-ctrl", 'risu-form', 'risu-trigger', 'risu-mark', 'risu-id', 'x-hl-lang', 'x-hl-text'],
}

export function trimMarkdown(data:string){

    if(!data){
        return ''
    }
    
    // Without a <risu-style> there is nothing to decode, so the plain string
    // result is already final. Note the tag itself is not trusted input:
    // risu-style is in ADD_TAGS, so cards, model output and user scripts can
    // author one directly. Only its position in the parsed tree is relied on.
    if(!data.includes('<risu-style')){
        return DOMPurify.sanitize(data, trimPurifyConfig)
    }

    // Decoded CSS must never be handed back to the HTML sanitizer as <style>
    // text: DOMPurify drops style nodes whose CSS contains '<' (SAFE_FOR_XML),
    // which silently deletes svg data-uris and markup-like content strings.
    // Take the DOM out of the sanitize we already run and swap the elements in
    // place instead, so the CSS never re-enters the HTML parser at all.
    // RETURN_DOM hands back the sanitized <body>, typed as Node. It is null only
    // for empty input, which the guard above already excludes.
    const root = DOMPurify.sanitize(data, {
        ...trimPurifyConfig,
        RETURN_DOM: true,
    }) as HTMLElement | null
    if(!root){
        return ''
    }

    // Only real <risu-style> elements are decoded. A <risu-style> that survived
    // inside an attribute value is not an element, so it is left as inert text
    // and a <style> tag can never be restored into an attribute context.
    for(const el of Array.from(root.querySelectorAll('risu-style'))){
        const decoded = decodeStyleContent(el.textContent ?? '')
        if(decoded.css === undefined){
            el.replaceWith(root.ownerDocument.createTextNode(decoded.fallback ?? ''))
            continue
        }
        const style = root.ownerDocument.createElement('style')
        // <style> is RAWTEXT, so '</style' is the only sequence that can end the
        // block early and leak the rest of the CSS as markup once this string is
        // parsed again ('\/' is still '/' inside CSS).
        style.textContent = decoded.css.replaceAll(/<\/(?=style)/gi, '<\\/')
        el.replaceWith(style)
    }

    return root.innerHTML
}

const metaCodes = [
    '\u200B', //zero width space
    '\u200C', //zero width non-joiner
    '\u200D', //zero width joiner
    '\uFEFF', //zero width no-break space
    '\u2060', //word joiner
    '\u180E', //mongolian vowel separator
]

const encodedMetadataCache = new Map<string, string>()

function encodeMetadata(modelShortName:string){
    const metadata = '{' + [
        'risuai',
        modelShortName.toLocaleLowerCase().replace(/[^a-z]/g, ''),
    ].join('|') + '}'

    const cached = encodedMetadataCache.get(metadata)
    if(cached !== undefined){
        return cached
    }

    let encodedMetaCode = ''
    for(let i=0;i<metadata.length;i++){
        let byte = (metadata.charCodeAt(i) - 97).toString(6).padStart(2,'0')
        for(let j=0;j<byte.length;j++){
            switch(byte.charAt(j)){
                case '0':{
                    encodedMetaCode += metaCodes[0]
                    break
                }
                case '1':{
                    encodedMetaCode += metaCodes[1]
                    break
                }
                case '2':{
                    encodedMetaCode += metaCodes[2]
                    break
                }
                case '3':{
                    encodedMetaCode += metaCodes[3]
                    break
                }
                case '4':{
                    encodedMetaCode += metaCodes[4]
                    break
                }
                case '5':{
                    encodedMetaCode += metaCodes[5]
                    break
                }
            }
        }
    }

    encodedMetadataCache.set(metadata, encodedMetaCode)
    return encodedMetaCode
}

export function addMetadataToElement(data:string, modelShortName:string){
    if(!aiWatermarkingLawApplies()){
        return data
    }

    const encodedMetaCode = encodeMetadata(modelShortName)
    console.log('Encoded metadata:', encodedMetaCode.length, 'characters')
    console.log('This requires at least', Math.ceil(encodedMetaCode.length / 32), '<p> tags to store')

    let d =  data.replace(/\<p\>/g, (v) => {
        return '<p>' + encodedMetaCode
    })

    return d + encodedMetaCode
}

export async function postTranslationParse(data:string){
    let lines = data.split('\n')

    for(let i=0;i<lines.length;i++){
        const trimed = lines[i].trim()
        if(trimed.startsWith('<')){
            lines[i] = trimed
        }
    }

    data = await renderHighlightableMarkdown(lines.join('\n'))
    return data
}

export function parseMarkdownSafe(data:string, arg:{
    forbidTags?: string[],
} = {}) {
    return DOMPurify.sanitize(renderMarkdown(md, data), {
        FORBID_TAGS: ["a", "style", ...(arg.forbidTags || [])],
        FORBID_ATTR: ["style", "href", "class"]
    })
}


const styleRegex = /\<style\>(.+?)\<\/style\>/gms
function encodeStyle(txt:string){
    return txt.replaceAll(styleRegex, (f, c1) => {
        return "<risu-style>" + Buffer.from(c1).toString('hex') + "</risu-style>"
    })
}

function decodeStyleRule(rule:CssAtRuleAST){
    if(rule.type === 'rule'){
        if(rule.selectors){
            for(let i=0;i<rule.selectors.length;i++){
                let slt:string = rule.selectors[i]
                if(slt){

                    const parser = cssSelectorParser((root) => {
                        root.walkClasses((classes) => {
                            if(classes.type === 'class' && !classes.value.startsWith('x-risu-')){
                                classes.value = 'x-risu-' + classes.value
                            }
                        })
                    })

                    slt = parser.processSync(slt)

                    rule.selectors[i] = ".chattext " + slt
                }
            }
        }
    }
    if(rule.type === 'media' || rule.type === 'supports' || rule.type === 'document' || rule.type === 'host' || rule.type === 'container' ){
        for(let i=0;i<rule.rules.length;i++){
            rule.rules[i] = decodeStyleRule(rule.rules[i])
        }
    }
    if(rule.type === 'import'){
       if(rule.import.startsWith('data:')){
            rule.import = 'data:,'
       }
    }
    return rule
}

/**
 * Decodes one <risu-style> body into scoped CSS. Returns the CSS on its own so
 * the caller can put it into a real <style> element instead of a markup string.
 * On a CSS parse error the style is dropped and `fallback` holds the text that
 * takes its place.
 */
function decodeStyleContent(hexText:string):{css?:string, fallback?:string}{
    try {
        let text = Buffer.from(hexText, 'hex').toString('utf-8')
        text = risuChatParser(text)
        const ast = css.parse(text)
        const rules = ast?.stylesheet?.rules
        if(rules){
            for(let i=0;i<rules.length;i++){
                rules[i] = decodeStyleRule(rules[i])
            }
            ast.stylesheet.rules = rules
        }
        return {
            css: css.stringify(ast, {
                indent: '',
                compress: true,
            })
        }
    } catch (error) {
        if(DBState.db.returnCSSError){
            return { fallback: `CSS ERROR: ${error}` }
        }
        return { fallback: "" }
    }
}

export async function hasher(data:Uint8Array){
    return Buffer.from(await crypto.subtle.digest("SHA-256", data as any)).toString('hex');
}

export type CbsConditions = {
    firstmsg?:boolean
    chatRole?:string
}

let matcherInitialized = false


const matcherMap = new Map<string, RegisterCallback>()

function initMatcher(){
    if(matcherInitialized) return
    registerCBS({
        registerFunction: function (arg: {
            name: string;
            callback: RegisterCallback | 'doc_only';
            alias: string[];
            description: string;
            deprecated?: { message: string; since?: string; replacement?: string; };
            internalOnly?: boolean;
        }): void | Promise<void> {
            const callback = arg.callback
            if(callback === 'doc_only') {
                return
            }
            const names = [arg.name, ...arg.alias]
            for (const name of names) {
                matcherMap.set(name, callback)
            }
        },
        getDatabase: getDatabase,
        getUserName: getUserName,
        getPersonaPrompt: getPersonaPrompt,
        risuChatParser: risuChatParser,
        makeArray: makeArray,
        safeStructuredClone: safeStructuredClone,
        parseArray: parseArray,
        parseDict: parseDict,
        getChatVar: getChatVar,
        setChatVar: setChatVar,
        getGlobalChatVar: getGlobalChatVar,
        calcString: calcString,
        dateTimeFormat: dateTimeFormat,
        getModules: getModules,
        getModuleLorebooks: getModuleLorebooks,
        pickHashRand: pickHashRand,
        getSelectedCharID: () => {
            return get(selectedCharID)
        },
        getModelInfo: getModelInfo,
        callInternalFunction: function (args: string[]): string {
            return ''
        },
        isTauri: isTauri,
        isNodeServer: isNodeServer,
        isMobile: false,
        appVer: appVer,
    })
    matcherInitialized = true
}

function matcher (p1:string,matcherArg:matcherArg,vars:{[key:string]:string}|null = null ):{
    text:string,
    var:{[key:string]:string}
}|string|null {

    initMatcher()

    try {
        if(p1.startsWith('? ')){
            const substring = p1.substring(2)
            return calcString(substring).toString()
        }
        const colonIndex = p1.indexOf(':')
        let splited: string[]
        if(colonIndex !== -1 && p1[colonIndex + 1] === ':'){
            splited = p1.split('::')
        }
        else{
            splited = p1.split(':')
        }
        const name = splited[0].toLocaleLowerCase().replace(/[\s_-]/g, '')
        const args = splited.slice(1)
        const callback = matcherMap.get(name)
        if(callback){
            return callback(p1, matcherArg, args,vars)
        }
    } catch (error) {}

    return null
}

const dateTimeFormat = (main:string, time = 0) => {
    const date = time === 0 ? (new Date()) : (new Date(time))
    if(!main){
        return ''
    }
    if(main.startsWith(':')){
        main = main.substring(1)
    }
    if(main.length > 300){
        return ''
    }
    return main
        .replace(/YYYY/g, date.getFullYear().toString())
        .replace(/YY/g, date.getFullYear().toString().substring(2))
        .replace(/MMMM/g, Intl.DateTimeFormat('en', { month: 'long' }).format(date))
        .replace(/MMM/g, Intl.DateTimeFormat('en', { month: 'short' }).format(date))
        .replace(/MM/g, (date.getMonth() + 1).toString().padStart(2, '0'))
        .replace(/DDDD/g, Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)).toString())
        .replace(/DD/g, date.getDate().toString().padStart(2, '0'))
        .replace(/dddd/g, Intl.DateTimeFormat('en', { weekday: 'long' }).format(date))
        .replace(/ddd/g, Intl.DateTimeFormat('en', { weekday: 'short' }).format(date))
        .replace(/HH/g, date.getHours().toString().padStart(2, '0'))
        .replace(/hh/g, (date.getHours() % 12 || 12).toString().padStart(2, '0'))
        .replace(/mm/g, date.getMinutes().toString().padStart(2, '0'))
        .replace(/ss/g, date.getSeconds().toString().padStart(2, '0'))
        .replace(/X/g, Math.floor(date.getTime() / 1000).toString())
        .replace(/x/g, date.getTime().toString())
        .replace(/A/g, date.getHours() >= 12 ? 'PM' : 'AM')

}

const legacyBlockMatcher = (p1:string,matcherArg:matcherArg) => {
    const bn = p1.indexOf('\n')

    if(bn === -1){
        return null
    }

    const logic = p1.substring(0, bn)
    const content = p1.substring(bn + 1)
    const statement = logic.split(" ", 2)

    switch(statement[0]){
        case 'if':{
            if(["","0","-1"].includes(statement[1])){
                return ''
            }
        
            return content.trim()
        }
    }

    return null
}

type blockMatch = 'ignore'|'parse'|'nothing'|'ifpure'|'pure'|'each'|'function'|'pure-display'|'normalize'|'escape'|'newif'|'newif-falsy'

function parseArray(p1:string): unknown[]{
    try {
        const arr = JSON.parse(p1)
        if(Array.isArray(arr)){
            return arr
        }
        return p1.split('§')
    } catch (error) {
        return p1.split('§')
    }
}

function parseDict(p1 :string): {[key:string]: unknown}{
    try {
        return JSON.parse(p1)
    } catch (error) {
        return {}
    }
}

function makeArray(p1: unknown[]): string{
    return JSON.stringify(p1.map((f) => {
        if(typeof(f) === 'string'){
            return f.replace(/::/g, '\\u003A\\u003A')
        }
        return f
    }))
}

function blockStartMatcher(p1:string,matcherArg:matcherArg):{type:blockMatch,type2?:string,funcArg?:string[],mode?:string}{
    if(p1.startsWith('#if') || p1.startsWith('#if_pure ')){
        const statement = p1.split(' ', 2)
        const state = statement[1]
        if(state === 'true' || state === '1'){
            return {
                type:   p1.startsWith('#if_pure') ? 'ifpure' :
                        'parse'
            }
        }
        return {type:'ignore'}
    }

    if(p1.startsWith('#when')){
        if(p1.startsWith('#when ')){
            const statement = p1.split(' ', 2)
            const state = statement[1]
            return {type: (state === 'true' || state === '1') ? 'newif' : 'newif-falsy'}
        }
        else if(p1.startsWith('#when::')){
            const statement = p1.split('::').slice(1)
            if(statement.length === 1){
                const state = statement[0]
                return {type: (state === 'true' || state === '1') ? 'newif' : 'newif-falsy'}
            }
            let mode: 'normal' | 'keep' | 'legacy' = 'normal'

            const isTruthy = (s:string) => {
                return s === 'true' || s === '1'
            }
            while(statement.length > 1){
                const condition = statement.pop()
                const operator = statement.pop()
                switch(operator){
                    case 'not':{
                        if(isTruthy(condition)){
                            statement.push('0')
                        }
                        else{
                            statement.push('1')
                        }
                        break
                    }
                    case 'keep':{
                        mode = 'keep'
                        statement.push(condition)
                        break
                    }
                    case 'legacy':{
                        mode = 'legacy'
                        statement.push(condition)
                        break
                    }
                    case 'and':{
                        const condition2 = statement.pop()
                        if(isTruthy(condition) && isTruthy(condition2)){
                            statement.push('1')
                        }
                        else{
                            statement.push('0')
                        }
                        break
                    }
                    case 'or':{
                        const condition2 = statement.pop()
                        if(isTruthy(condition) || isTruthy(condition2)){
                            statement.push('1')
                        }
                        else{
                            statement.push('0')
                        }
                        break
                    }
                    case 'is':{
                        const condition2 = statement.pop()
                        if(condition === condition2){
                            statement.push('1')
                        }
                        else{
                            statement.push('0')
                        }
                        break
                    }
                    case 'isnot':{
                        const condition2 = statement.pop()
                        if(condition !== condition2){
                            statement.push('1')
                        }
                        else{
                            statement.push('0')
                        }
                        break
                    }
                    case 'var':{
                        const variable = getChatVar(condition)
                        if(isTruthy(variable)){
                            statement.push('1')
                        }
                        else{
                            statement.push('0')
                        }
                        break
                    }
                    case 'toggle':{
                        const variable = getGlobalChatVar('toggle_' + condition)
                        if(isTruthy(variable)){
                            statement.push('1')
                        }
                        else{
                            statement.push('0')
                        }
                        break
                    }
                    case 'vis':{ //vis = variable is
                        const variable = getChatVar(statement.pop())
                        if(variable === condition){
                            statement.push('1')
                        }
                        else{
                            statement.push('0')
                        }
                        break
                    }
                    case 'visnot':{ //visnot = variable is not
                        const variable = getChatVar(statement.pop())
                        if(variable !== condition){
                            statement.push('1')
                        }
                        else{
                            statement.push('0')
                        }
                        break
                    }
                    case 'tis':{ //tis = toggle is
                        const variable = getGlobalChatVar('toggle_' + statement.pop())
                        if(variable === condition){
                            statement.push('1')
                        }
                        else{
                            statement.push('0')
                        }
                        break
                    }
                    case 'tisnot':{ //tisnot = toggle is not
                        const variable = getGlobalChatVar('toggle_' + statement.pop())
                        if(variable !== condition){
                            statement.push('1')
                        }
                        else{
                            statement.push('0')
                        }
                        break
                    }
                    case '>':{
                        const condition2 = statement.pop()
                        if(parseFloat(condition2) > parseFloat(condition)){
                            statement.push('1')
                        }
                        else{
                            statement.push('0')
                        }
                        break
                    }
                    case '<':{
                        const condition2 = statement.pop()
                        if(parseFloat(condition2) < parseFloat(condition)){
                            statement.push('1')
                        }
                        else{
                            statement.push('0')
                        }
                        break
                    }
                    case '>=':{
                        const condition2 = statement.pop()
                        if(parseFloat(condition2) >= parseFloat(condition)){
                            statement.push('1')
                        }
                        else{
                            statement.push('0')
                        }
                        break
                    }
                    case '<=':{
                        const condition2 = statement.pop()
                        if(parseFloat(condition2) <= parseFloat(condition)){
                            statement.push('1')
                        }
                        else{
                            statement.push('0')
                        }
                        break
                    }
                    default:{
                        if(isTruthy(condition)){
                            statement.push('1')
                        }
                        else{
                            statement.push('0')
                        }
                        break
                    }
                }
            }

            const finalCondition = statement[0]
            if(isTruthy(finalCondition)){
                switch(mode){
                    case 'keep':{
                        return {type: 'newif', type2: 'keep'}
                    }
                    case 'legacy':{
                        return {type: 'parse'}
                    }
                    default:{
                        return {type: 'newif'}
                    }
                }
            }
            else{
                switch(mode){
                    case 'keep':{
                        return {type: 'newif-falsy', type2: 'keep'}
                    }
                    case 'legacy':{
                        return {type: 'ignore'}
                    }
                    default:{
                        return {type: 'newif-falsy'}
                    }
                }
            }
        }
        else{
            return {type: 'newif-falsy'}
        }
    }
    if(p1 === '#pure'){
        return {type:'pure'}
    }
    if(p1 === '#pure_display' || p1 === '#puredisplay'){
        return {type:'pure-display'}
    }
    if(p1 === '#code'){
        return {type:'normalize'}
    }
    if(p1.startsWith('#escape')){
        const t2 = p1.substring(7).trim()
        const mode = t2 === '::keep' ? 'keep' : undefined
        return {type:'escape', mode}
    }
    if(p1.startsWith('#each')){
        let t2 = p1.substring(5).trim()
        let mode: string | undefined
        if(t2.startsWith('::keep ')){
            mode = 'keep'
            t2 = t2.substring(7).trim()
        }
        if(t2.startsWith('as ')){
            t2 = t2.substring(3).trim()
        }
        return {type:'each', type2:t2, mode}
    }
    if(p1.startsWith('#func')){
        const statement = p1.split(' ')
        if(statement.length > 1){
            return {type:'function',funcArg:statement.slice(1)}
        }

    }

    return {type:'nothing'}
}

function trimLines(p1:string){
    return p1.split('\n').map((v) => {
        return v.trimStart()
    }).join('\n').trim()
}

function blockEndMatcher(p1:string,type:{type:blockMatch,type2?:string,mode?:string},matcherArg:matcherArg):string{
    const p1Trimmed = p1.trim() 
    switch(type.type){
        case 'pure':
        case 'pure-display':
        case 'function':{
            return p1Trimmed
        }
        case 'parse':{
            return trimLines(p1Trimmed)
        }
        case 'each':{
            if(type.mode === 'keep'){
                return p1
            }
            return trimLines(p1Trimmed)
        }
        case 'ifpure':{
            return p1
        }
        case 'newif':
        case 'newif-falsy':{
            const lines =  p1.split("\n")

            if(lines.length === 1){
                const elseIndex = p1.indexOf('{{:else}}')
                if(elseIndex !== -1){
                    if(type.type === 'newif'){
                        return p1.substring(0, elseIndex)
                    }
                    if(type.type === 'newif-falsy'){
                        return p1.substring(elseIndex + 9)
                    }
                }
                else{
                    if(type.type === 'newif'){
                        return p1
                    }
                    if(type.type === 'newif-falsy'){
                        return ''
                    }
                }
            }
            
            const elseLine = lines.findIndex((v) => {
                return v.trim() === '{{:else}}'
            })

            if(elseLine !== -1 && type.type === 'newif'){
                lines.splice(elseLine) //else line and everything after it is removed
            }
            if(elseLine !== -1 && type.type === 'newif-falsy'){
                lines.splice(0, elseLine + 1) //everything before else line is removed
            }
            if(elseLine === -1 && type.type === 'newif-falsy'){
                return ''
            }

            if(type.type2 !== 'keep'){
                while(lines.length > 0 && lines[0].trim() === ''){
                    lines.shift()
                }
                while(lines.length > 0 && lines[lines.length - 1].trim() === ''){
                    lines.pop()
                }
            }
            return lines.join('\n')
        }

        case 'normalize':{
            return p1Trimmed.trim().replaceAll('\n','').replaceAll('\t','')
            .replaceAll(/\\u([0-9A-Fa-f]{4})/g, (match, p1) => {
                return String.fromCharCode(parseInt(p1, 16))
            })
            .replaceAll(/\\(.)/g, (match, p1) => {
                switch(p1){
                    case 'n':
                        return '\n'
                    case 'r':
                        return '\r'
                    case 't':
                        return '\t'
                    case 'b':
                        return '\b'
                    case 'f':
                        return '\f'
                    case 'v':
                        return '\v'
                    case 'a':
                        return '\a'
                    case 'x':
                        return '\x00'
                    default:
                        return p1
                }
            })
        }
        case 'escape':{
            return risuEscape(type.mode === 'keep' ? p1 : p1Trimmed)
        }
        default:{
            return ''
        }
    }
}

export function risuChatParser(da:string, arg:{
    chatID?:number
    db?:Database
    chara?:string|character|groupChat
    rmVar?:boolean,
    var?:{[key:string]:string}
    tokenizeAccurate?:boolean
    consistantChar?:boolean
    visualize?:boolean,
    role?:string
    runVar?:boolean
    functions?:Map<string,{data:string,arg:string[]}>
    callStack?:number
    cbsConditions?:CbsConditions
} = {}):string{
    const chatID = arg.chatID ?? -1
    const db = arg.db ?? DBState.db
    const aChara = arg.chara
    let chara:character|string = null

    if(aChara){
        if(typeof(aChara) !== 'string' && aChara.type === 'group'){
            if(aChara.chats[aChara.chatPage].message.length > 0){
                const gc = findCharacterbyId(aChara.chats[aChara.chatPage].message.at(-1).saying ?? '')
                if(gc.name !== 'Unknown Character'){
                    chara = gc
                }
            }
            else{
                chara = 'bot'
            }
        }
        else{
            chara = aChara
        }
    }
    if(arg.tokenizeAccurate){
        const db = arg.db ?? DBState.db
        const selchar = chara ?? db.characters[get(selectedCharID)]
        if(!selchar){
            chara = 'bot'
        }
    }

    let pointer = 0;
    let nested:string[] = [""]
    let stackType = new Uint8Array(512)
    let pureModeNest:Map<number,boolean> = new Map()
    let pureModeNestType:Map<number,string> = new Map()
    let blockNestType:Map<number,{
        type:blockMatch,
        type2?:string
        funcArg?:string[]
        mode?:string
    }> = new Map()
    let commentMode = false
    let commentLatest:string[] = [""]
    let commentV = new Uint8Array(512)
    let thinkingMode = false
    let tempVar:{[key:string]:string} = {}
    let functions:Map<string,{
        data:string,
        arg:string[]
    }> = arg.functions ?? (new Map())

    arg.callStack = (arg.callStack ?? 0) + 1

    if(arg.callStack > 20){
        return 'ERROR: Call stack limit reached'
    }

    const matcherObj = {
        chatID: chatID,
        chara: chara,
        rmVar: arg.rmVar ?? false,
        db: db,
        var: arg.var ?? null,
        tokenizeAccurate: arg.tokenizeAccurate ?? false,
        displaying: arg.visualize ?? false,
        role: arg.role,
        runVar: arg.runVar ?? false,
        consistantChar: arg.consistantChar ?? false,
        cbsConditions: arg.cbsConditions ?? {},
        callStack: arg.callStack,
        getNested: () => {
            return nested
        },
        setNestedRoot: (val:string) => {
            nested[0] = val
        }
    }

    da = da.replace(/\<(user|char|bot)\>/gi, '{{$1}}')

    const isPureMode = () => {
        return pureModeNest.size > 0
    }

    while(pointer < da.length){
        switch(da[pointer]){
            case '{':{
                if(da[pointer + 1] !== '{' && da[pointer + 1] !== '#'){
                    nested[0] += da[pointer]
                    break
                }
                pointer++
                nested.unshift('')
                stackType[nested.length] = 1
                break
            }
            case '#':{
                //legacy if statement, deprecated
                if(da[pointer + 1] !== '}' || nested.length === 1 || stackType[nested.length] !== 1){
                    nested[0] += da[pointer]
                    break
                }
                pointer++
                const dat = nested.shift()
                const mc = legacyBlockMatcher(dat, matcherObj)
                nested[0] += mc ?? `{#${dat}#}`
                break
            }
            case '}':{
                if(da[pointer + 1] !== '}' || nested.length === 1 || stackType[nested.length] !== 1){
                    nested[0] += da[pointer]
                    break
                }
                pointer++
                const dat = nested.shift()
                if(dat.startsWith('#') || dat.startsWith(':')){
                    if(isPureMode()){
                        nested[0] += `{{${dat}}}`
                        if (dat !== ':else') {
                            nested.unshift('')
                            stackType[nested.length] = 6
                        }
                        break
                    }
                    const matchResult = blockStartMatcher(dat, matcherObj)
                    if(matchResult.type === 'nothing'){
                        nested[0] += `{{${dat}}}`
                        break
                    }
                    else{
                        nested.unshift('')
                        stackType[nested.length] = 5
                        blockNestType.set(nested.length, matchResult)
                        if( matchResult.type === 'ignore' || matchResult.type === 'pure' ||
                            matchResult.type === 'each' || matchResult.type === 'function' ||
                            matchResult.type === 'pure-display' || matchResult.type === 'escape'
                        ){
                            pureModeNest.set(nested.length, true)
                            pureModeNestType.set(nested.length, "block")
                        }
                        break
                    }
                }
                if(dat.startsWith('/') && !dat.startsWith('//')){
                    if(stackType[nested.length] === 5){
                        const blockType = blockNestType.get(nested.length)
                        if( blockType.type === 'ignore' || blockType.type === 'pure' ||
                            blockType.type === 'each' || blockType.type === 'function' ||
                            blockType.type === 'pure-display' || blockType.type === 'escape'
                        ){
                            pureModeNest.delete(nested.length)
                            pureModeNestType.delete(nested.length)
                        }
                        blockNestType.delete(nested.length)
                        const dat2 = nested.shift()
                        const matchResult = blockEndMatcher(dat2, blockType, matcherObj)
                        if(blockType.type === 'each'){
                            const asIndex = blockType.type2.lastIndexOf(' as ')
                            let sub = blockType.type2.substring(asIndex + 4).trim()
                            let array = parseArray(blockType.type2.substring(0, asIndex))
                            if(asIndex === -1){
                                //compability mode
                                const subind = blockType.type2.lastIndexOf(' ')
                                if(subind === -1){
                                    break
                                }
                                sub = blockType.type2.substring(subind + 1)
                                array = parseArray(blockType.type2.substring(0, subind))
                            }
                            let added = ''
                            for(let i = 0; i < array.length; i++) {
                                added += matchResult.replaceAll(`{{slot::${sub}}}`, typeof(array[i]) === 'string' ? array[i] as string : JSON.stringify(array[i]))
                            }
                            da = da.substring(0, pointer + 1) + (blockType.mode === 'keep' ? added : added.trim()) + da.substring(pointer + 1)
                            break
                        }
                        if(blockType.type === 'function'){
                            console.log(matchResult)
                            functions.set(blockType.funcArg[0], {
                                data: matchResult,
                                arg: blockType.funcArg.slice(1)
                            })
                            break
                        }
                        if(blockType.type === 'pure-display'){
                            nested[0] += matchResult.replaceAll('{{', '\\{\\{').replaceAll('}}', '\\}\\}')
                            break
                        }
                        if(matchResult === ''){
                            break
                        }
                        nested[0] += matchResult
                        break
                    }
                    if(stackType[nested.length] === 6){
                        const sft = nested.shift()
                        nested[0] += sft + `{{${dat}}}`
                        break
                    }
                }
                if(dat.startsWith('call::')){
                    if(arg.callStack && arg.callStack > 20){
                        nested[0] += `ERROR: Call stack limit reached`
                        break
                    }
                    const argData = dat.split('::').slice(1)
                    const funcName = argData[0]
                    const func = functions.get(funcName)
                    console.log(func)
                    if(func){
                        let data = func.data
                        for(let i = 0;i < argData.length;i++){
                            data = data.replaceAll(`{{arg::${i}}}`, argData[i])
                        }
                        arg.functions = functions
                        nested[0] += risuChatParser(data, arg)
                        break
                    }
                }
                const mc = isPureMode() ? null :matcher(dat, matcherObj, tempVar)
                if(!mc && mc !== ''){
                    nested[0] += `{{${dat}}}`
                }
                else if(typeof(mc) === 'string'){
                    nested[0] += mc
                }
                else{
                    nested[0] += mc.text
                    tempVar = mc.var
                    if(tempVar['__force_return__']){
                        return tempVar['__return__'] ?? 'null'
                    }
                }
                break
            }
            default:{
                nested[0] += da[pointer]
                break
            }
        }
        pointer++
    }
    if(commentMode){
        nested = commentLatest
        stackType = commentV
        if(thinkingMode){
            nested[0] += `<div>Thinking...</div>`
        }
        commentMode = false
    }
    if(nested.length === 1){
        return nested[0]
    }
    let result = ''
    while(nested.length > 1){
        let dat = (stackType[nested.length] === 1) ? '{{' : "<"
        dat += nested.shift()
        result = dat + result
    }
    return nested[0] + result
}

export function applyMarkdownToNode(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        if (text) {
            let markdown = renderMarkdown(md, text);
            if (markdown !== text) {
                const span = document.createElement('span');
                span.innerHTML = markdown;
                
                // inherit inline style from the parent node
                const parentStyle = (node.parentNode as HTMLElement)?.style;
                if(parentStyle){
                    for(let i=0;i<parentStyle.length;i++){
                        span.style.setProperty(parentStyle[i], parentStyle.getPropertyValue(parentStyle[i]))
                    }   
                }
                (node as Element)?.replaceWith(span);
                return
            }
        }
    } else {
        for (const child of node.childNodes) {
            applyMarkdownToNode(child);
        }
    }
}
