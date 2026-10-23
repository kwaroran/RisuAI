import { describe, it, expect, vi } from 'vitest'
import { writable } from 'svelte/store'
import { ParseMarkdown, trimMarkdown } from '../parser.svelte'
import { applyHiddenImageTheme, hiddenImageDataUri, hiddenImageSrc, hideCssImageUrls, hideStyleSheetImages, renderHiddenImageSvg } from '../hideImages'

//#region module mocks

vi.mock(
  import('../../storage/database.svelte'),
  () =>
    ({
      appVer: '1234.5.67',
      getCurrentCharacter: () => ({}),
      getDatabase: () => ({}),
    } as typeof import('../../storage/database.svelte'))
)

vi.mock(import('../../globalApi.svelte'), () => ({
  aiWatermarkingLawApplies: () => false,
  getFileSrc: () => Promise.resolve(''),
}))

vi.mock(import('../../stores.svelte'), () => {
  return {
    DBState: {
      db: {
        hideAllImages: true,
        characters: [
          {
            chatPage: 0,
            chats: [{}],
            defaultVariables: '',
          },
        ],
        globalChatVariables: {},
        templateDefaultVariables: '',
      },
    },
    selIdState: {
      selId: 0,
    },
    selectedCharID: writable(0),
  } as typeof import('../../stores.svelte')
})

//#endregion

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html').body
const placeholderUrl = `url("${hiddenImageSrc}")`
const leaked = 'https://example.com/leak.png'

describe('hideCssImageUrls', () => {
    it('replaces quoted, unquoted and nested urls', () => {
        expect(hideCssImageUrls(`background:url(${leaked}) center/cover`)).toBe(`background:${placeholderUrl} center/cover`)
        expect(hideCssImageUrls(`background-image:linear-gradient(red, blue), url('a(1).png')`)).toBe(`background-image:linear-gradient(red, blue), ${placeholderUrl}`)
        expect(hideCssImageUrls(`content:URL("data:image/png;base64,AAAA")`)).toBe(`content:${placeholderUrl}`)
    })

    it('replaces image-set as a whole', () => {
        expect(hideCssImageUrls(`background-image:-webkit-image-set("a.png" 1x, url(b.png) 2x)`)).toBe(`background-image:${placeholderUrl}`)
    })

    it('keeps fragment references', () => {
        expect(hideCssImageUrls('fill:url(#grad)')).toBe('fill:url(#grad)')
    })
})

describe('hideStyleSheetImages', () => {
    it('leaves fonts and cursors alone', () => {
        const out = hideStyleSheetImages(`@font-face{font-family:x;src:url(x.woff2)}.a{cursor:url(c.png),auto;background:url(${leaked})}`)
        expect(out).toContain('url(x.woff2)')
        expect(out).toContain('url(c.png)')
        expect(out).not.toContain(leaked)
    })

    it('reaches into nested at-rules and keyframes', () => {
        const out = hideStyleSheetImages(`@media (min-width:1px){.a{background:url(${leaked})}}@keyframes k{from{background:url(${leaked})}}`)
        expect(out).not.toContain(leaked)
    })
})

describe('ParseMarkdown with hideAllImages', () => {
    const render = async (input: string) => parse(await ParseMarkdown(input, null, 'back'))

    it('replaces img sources and drops srcset', async () => {
        const body = await render(`<img src="${leaked}" srcset="${leaked} 2x">`)
        const img = body.querySelector('img')
        expect(img.getAttribute('src')).toBe(hiddenImageDataUri())
        expect(img.hasAttribute('srcset')).toBe(false)
        expect(img.hasAttribute('data-risu-hidden-image')).toBe(true)
    })

    it('drops picture sources that would override the img', async () => {
        const body = await render(`<picture><source srcset="${leaked}"><img src="${leaked}"></picture>`)
        expect(body.innerHTML).not.toContain(leaked)
    })

    it('replaces inline style urls', async () => {
        const body = await render(`<div style="background: #000 url('${leaked}') no-repeat;"></div>`)
        expect(body.innerHTML).not.toContain(leaked)
        expect(body.querySelector('div').getAttribute('style')).toContain(hiddenImageDataUri())
    })

    it('replaces urls in <style> blocks', async () => {
        const body = await render(`<style>.card { background-image: url("${leaked}"); }</style><div class="card"></div>`)
        expect(body.querySelector('style').textContent).toContain(hiddenImageDataUri())
        expect(body.innerHTML).not.toContain(leaked)
    })

    it('replaces urls in <style> blocks with attributes', async () => {
        const body = await render(`<style type="text/css">.card { background: url(${leaked}); }</style>`)
        expect(body.innerHTML).not.toContain(leaked)
    })

    it('replaces svg images and video posters', async () => {
        const body = await render(`<svg><image href="${leaked}" width="10" height="10"></image></svg><video poster="${leaked}"></video>`)
        expect(body.innerHTML).not.toContain(leaked)
    })
})

describe('hidden image theming', () => {
    it('preserves caller-specific sanitizer attributes while applying the theme', () => {
        const out = trimMarkdown(
            `<button risu-change-var-name="route" risu-change-var-value="a">A</button><img src="${leaked}">`,
            {
                ADD_TAGS: [],
                ADD_ATTR: ['risu-change-var-name', 'risu-change-var-value'],
            },
        )
        const body = parse(out)
        const button = body.querySelector('button')
        expect(button.getAttribute('risu-change-var-name')).toBe('route')
        expect(button.getAttribute('risu-change-var-value')).toBe('a')
        expect(body.querySelector('img').getAttribute('src')).toBe(hiddenImageDataUri())
    })

    it('draws the placeholder in the given scheme colors', () => {
        const svg = renderHiddenImageSvg({ darkbg: '#123456', darkBorderc: 'rgb(1, 2, 3)', textcolor2: 'red' })
        expect(svg).toContain('fill="#123456"')
        expect(svg).toContain('stroke="rgb(1, 2, 3)"')
        expect(svg).toContain('stroke="red"')
    })

    it('falls back on values that are not plain colors', () => {
        const svg = renderHiddenImageSvg({ darkbg: '"/><script>alert(1)</script>' })
        expect(svg).not.toContain('script')
        expect(svg).toContain('fill="#21222c"')
    })

    it('swaps every placeholder path in attributes and style text', () => {
        const html = `<img src="${hiddenImageSrc}"><div style="background:url(&quot;${hiddenImageSrc}&quot;)"></div><style>.a{background:url("${hiddenImageSrc}")}</style>`
        const out = applyHiddenImageTheme(html, { darkbg: '#abcdef' })
        expect(out).not.toContain(hiddenImageSrc)
        const body = parse(out)
        const src = body.querySelector('img').getAttribute('src')
        expect(src.startsWith('data:image/svg+xml,')).toBe(true)
        expect(decodeURIComponent(src)).toContain('#abcdef')
        expect(body.querySelector('div').getAttribute('style')).toContain(src)
        expect(body.querySelector('style').textContent).toContain(src)
    })
})
