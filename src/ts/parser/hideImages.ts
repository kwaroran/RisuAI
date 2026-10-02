import css, { type CssAtRuleAST } from '@adobe/css-tools'

/** Shown in place of chat images while hideAllImages is on. */
export const hiddenImageSrc = '/hidden-image.svg'
const hiddenImageCssUrl = `url("${hiddenImageSrc}")`

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
