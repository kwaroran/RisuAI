import css, { type CssAtRuleAST } from '@adobe/css-tools'

/**
 * Shown in place of chat images while hideAllImages is on. Parsing emits this
 * path, and applyHiddenImageTheme swaps it for a copy drawn in the current
 * color scheme at render time. The file itself is a neutral fallback.
 */
export const hiddenImageSrc = '/hidden-image.svg'
const hiddenImageCssUrl = `url("${hiddenImageSrc}")`

export type HiddenImageColors = {
    darkbg?: string
    darkBorderc?: string
    textcolor2?: string
}

// default color scheme, used when the database has none yet
const fallbackColors: Required<HiddenImageColors> = {
    darkbg: '#21222c',
    darkBorderc: '#4b5563',
    textcolor2: '#64748b',
}

// Custom schemes are free text, so only plain color values reach the SVG
const safeColorRegex = /^(#[0-9a-f]{3,8}|[a-z]+|(rgb|hsl)a?\([\d\s.,%/]+\))$/i

function pickColor(value:unknown, fallback:string){
    return typeof value === 'string' && safeColorRegex.test(value.trim()) ? value.trim() : fallback
}

// lucide image-off
const hiddenImageIcon = '<line x1="2" y1="2" x2="22" y2="22"/>'
    + '<path d="M10.41 10.41a2 2 0 1 1-2.83-2.83"/>'
    + '<line x1="13.5" y1="13.5" x2="6" y2="21"/>'
    + '<line x1="18" y1="12" x2="21" y2="15"/>'
    + '<path d="M3.59 3.59A1.99 1.99 0 0 0 3 5v14a2 2 0 0 0 2 2h14c.55 0 1.052-.22 1.41-.59"/>'
    + '<path d="M21 15V5a2 2 0 0 0-2-2H9"/>'

export function renderHiddenImageSvg(colors?:HiddenImageColors){
    const bg = pickColor(colors?.darkbg, fallbackColors.darkbg)
    const border = pickColor(colors?.darkBorderc, fallbackColors.darkBorderc)
    const icon = pickColor(colors?.textcolor2, fallbackColors.textcolor2)
    // No size and no viewBox: the browser lays the SVG out at whatever box it is
    // drawn into instead of scaling it, so the frame fills portrait and landscape
    // boxes alike while the icon keeps its size at the center. Media queries
    // inside an SVG image match that box, which shrinks the icon in small ones.
    return '<svg xmlns="http://www.w3.org/2000/svg">'
        + '<style>'
        + 'rect{x:1px;y:1px;width:calc(100% - 2px);height:calc(100% - 2px)}'
        + '.i{transform:translate(-20px,-20px) scale(1.6667)}'
        + '@media (max-width:120px),(max-height:90px){.i{transform:translate(-10px,-10px) scale(.8333)}}'
        + '@media (max-width:36px),(max-height:28px){.i{display:none}}'
        + '</style>'
        + `<rect width="100%" height="100%" rx="10" fill="${bg}" fill-opacity="0.7" stroke="${border}" stroke-width="2" stroke-dasharray="8 6"/>`
        + '<svg x="50%" y="50%" overflow="visible">'
        + `<g class="i" fill="none" stroke="${icon}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${hiddenImageIcon}</g>`
        + '</svg>'
        + '</svg>'
}

let cachedSvg = ''
let cachedDataUri = ''

export function hiddenImageDataUri(colors?:HiddenImageColors){
    const svg = renderHiddenImageSvg(colors)
    if(svg !== cachedSvg){
        cachedSvg = svg
        // encodeURIComponent leaves no quotes, '<' or '&', so the result is
        // safe to drop into attributes and <style> text of serialized HTML
        cachedDataUri = 'data:image/svg+xml,' + encodeURIComponent(svg)
    }
    return cachedDataUri
}

/** Swaps the placeholder path in rendered HTML for one drawn in `colors`. */
export function applyHiddenImageTheme(html:string, colors?:HiddenImageColors){
    if(!html.includes(hiddenImageSrc)){
        return html
    }
    return html.replaceAll(hiddenImageSrc, hiddenImageDataUri(colors))
}

// 1x1 transparent gif used as a spacer, not real content
const transparentGifPrefix = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP'

const imageFunctionRegex = /(?<![\w-])(?:url|(?:-webkit-)?image-set)\(/gi

/** Index of the ')' closing a function whose arguments start at `start`, or -1. */
function findClosingParen(text:string, start:number){
    let depth = 1
    let quote = ''
    for(let i = start; i < text.length; i++){
        const c = text[i]
        if(c === '\\'){
            i++
            continue
        }
        if(quote){
            if(c === quote){
                quote = ''
            }
            continue
        }
        if(c === '"' || c === "'"){
            quote = c
        }
        else if(c === '('){
            depth++
        }
        else if(c === ')' && --depth === 0){
            return i
        }
    }
    return -1
}

/** Transparent spacer gifs are layout helpers, not content worth hiding. */
export function isSpacerImage(src:string){
    return src.trim().startsWith(transparentGifPrefix)
}

function isHiddenImageExempt(src:string){
    src = src.trim()
    return src === ''
        || src.startsWith('#')
        || src === hiddenImageSrc
        || isSpacerImage(src)
}

/**
 * Replaces every image reference in a CSS value with the hidden image
 * placeholder. Fragment references (url(#id)) point at in-document SVG
 * gradients, masks and filters rather than images, so they are kept.
 */
export function hideCssImageUrls(value:string){
    if(!value || !/url\(|image-set\(/i.test(value)){
        return value
    }
    const regex = new RegExp(imageFunctionRegex)
    let out = ''
    let last = 0
    let match:RegExpExecArray | null
    while((match = regex.exec(value))){
        const open = match.index + match[0].length
        let close = findClosingParen(value, open)
        if(close === -1){
            // CSS closes an unterminated function at the end of input
            close = value.length
        }
        regex.lastIndex = close + 1
        if(match[0].toLowerCase() === 'url('){
            const arg = value.slice(open, close).trim().replace(/^(['"])(.*)\1$/s, '$2')
            if(isHiddenImageExempt(arg)){
                continue
            }
        }
        out += value.slice(last, match.index) + hiddenImageCssUrl
        last = close + 1
    }
    return out + value.slice(last)
}

type CssWalkNode = {
    type: string
    property?: string
    value?: string
    declarations?: CssWalkNode[]
    rules?: CssWalkNode[]
    keyframes?: CssWalkNode[]
}

/** Hides image urls in a parsed rule and everything nested under it. */
export function hideStyleRuleImages(rule:CssAtRuleAST){
    walkRule(rule as CssWalkNode)
}

function walkRule(rule:CssWalkNode){
    // fonts and imported sheets are not images
    if(rule.type === 'font-face' || rule.type === 'import'){
        return
    }
    for(const decl of rule.declarations ?? []){
        if(decl.type === 'declaration' && decl.value && decl.property?.toLowerCase() !== 'cursor'){
            decl.value = hideCssImageUrls(decl.value)
        }
    }
    for(const child of rule.rules ?? []){
        walkRule(child)
    }
    for(const child of rule.keyframes ?? []){
        walkRule(child)
    }
}

/** Hides image urls in a whole stylesheet text, e.g. a raw <style> body. */
export function hideStyleSheetImages(text:string){
    if(!text || !/url\(|image-set\(/i.test(text)){
        return text
    }
    try {
        const ast = css.parse(text)
        for(const rule of ast.stylesheet.rules){
            hideStyleRuleImages(rule)
        }
        return css.stringify(ast, { indent: '', compress: true })
    } catch {
        // Unparsable CSS is still applied by the browser as far as it can be,
        // so fall back to replacing every url outright.
        return hideCssImageUrls(text)
    }
}
