import { describe, it, expect, vi } from 'vitest'
import { writable } from 'svelte/store'
import { ParseMarkdown } from '../parser.svelte'

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

/**
 * Every rendered style rule must stay scoped to the chat text container.
 * `count` is required so a run that drops the styles entirely — the regression
 * this file exists to catch — cannot satisfy the scoping check vacuously.
 */
const expectScopedStyles = (body: HTMLElement, count: number) => {
    expect(body.querySelectorAll('style').length).toBe(count)
    for(const style of body.querySelectorAll('style')){
        for(const rule of style.textContent.split('}')){
            const selector = rule.includes('{') ? rule.slice(0, rule.indexOf('{')).trim() : ''
            if(selector && !selector.startsWith('@')){
                expect(selector).toContain('.chattext')
            }
        }
    }
}

describe('trimMarkdown style handling', () => {
    it('decodes <style> into a scoped style tag', async () => {
        const out = await ParseMarkdown('<style>.mybox { color: red; }</style><div class="mybox">hello</div>', null, 'back')
        expect(out).toContain('<style>.chattext .x-risu-mybox{color:red;}</style>')
        expect(out).toContain('<div class="x-risu-mybox">hello</div>')
    })

    it('keeps styles whose CSS contains an svg data uri', async () => {
        const input = `<style>.bg { background-image: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'><circle r='4'/></svg>"); }</style><div class="bg">x</div>`
        const out = await ParseMarkdown(input, null, 'back')
        expect(out).toContain('<style>')
        expect(out).toContain('data:image/svg+xml')
    })

    it('keeps styles whose CSS contains markup-like text', async () => {
        const input = `<style>p::after { content: "<hi>"; }</style><p>x</p>
<style>@media (max-width: 600px){ .box { display:none; } }</style>`
        const out = await ParseMarkdown(input, null, 'back')
        expect(out.match(/<style>/g)?.length).toBe(2)
        expect(out).toContain('content:"<hi>"')
        expect(out).toContain('@media (max-width: 600px)')
    })

    it('does not rewrite closing tags other than style', async () => {
        const input = `<style>p::after { content: "</div>"; }</style>`
        const out = await ParseMarkdown(input, null, 'back')
        expect(out).toContain('content:"</div>"')
    })

    // a literal </style> ends the style element, so the trailing markup is
    // authored content and only has to come out sanitized and unstyled
    it('sanitizes markup after a literal closing style tag', async () => {
        const input = `<style>p::after { content: "</style><img src=x onerror=alert(1)>"; }</style>`
        const body = parse(await ParseMarkdown(input, null, 'back'))
        expect(body.querySelector('img')?.hasAttribute('onerror')).toBe(false)
        // encodeStyle stops at the literal </style>, so the remaining CSS no
        // longer parses and no style survives
        expectScopedStyles(body, 0)
    })

    it('sanitizes markup smuggled through risu-style hex', async () => {
        const hex = Buffer.from('.a{content:"</style><img src=x onerror=alert(1)>";}').toString('hex')
        const body = parse(await ParseMarkdown(`<risu-style>${hex}</risu-style>`, null, 'back'))
        expect(body.querySelector('img')).toBeNull()
        expectScopedStyles(body, 1)
    })

    it('sanitizes markup revealed by a CSS parse error', async () => {
        const hex = Buffer.from('<img src=x onerror=alert(1)>').toString('hex')
        const body = parse(await ParseMarkdown(`<risu-style>${hex}</risu-style>`, null, 'back'))
        expect(body.querySelector('img')).toBeNull()
    })

    it('does not restore styles nested in a risu-style tag inside CSS', async () => {
        const hex = (s: string) => Buffer.from(s).toString('hex')
        const inner = hex('body{display:none}')
        const outer = hex(`p::after{content:"</style><risu-style>${inner}</risu-style>";}`)
        for(const mode of ['normal', 'back'] as const){
            const body = parse(await ParseMarkdown(`<risu-style>${outer}</risu-style>`, null, mode))
            // the inner tag stays inert text inside the outer rule's content string
            expectScopedStyles(body, 1)
            expect(body.querySelector('risu-style')).toBeNull()
        }
    })

    it('decodes a lone risu-style element that carries attributes', async () => {
        const hex = Buffer.from('.mybox { color: red; }').toString('hex')
        const out = await ParseMarkdown(`<risu-style class="z">${hex}</risu-style>`, null, 'back')
        expect(out).toContain('<style>.chattext .x-risu-mybox{color:red;}</style>')
        expect(out).not.toContain('risu-style')
    })

    it('does not restore a style that only exists in an attribute value', async () => {
        const input = `<div title='<style>a::after{content:"><img src=x onerror=alert(1)>"}</style>'>x</div>`
        for(const mode of ['normal', 'back'] as const){
            const body = parse(await ParseMarkdown(input, null, mode))
            expect(body.querySelector('img')).toBeNull()
            expect(body.querySelector('style')).toBeNull()
        }
    })

    it('does not let attribute-context CSS attach an event handler', async () => {
        const input = `<div title='<style>a::after{content:"" onmouseover="alert(1)"}</style>'>x</div>`
        for(const mode of ['normal', 'back'] as const){
            const body = parse(await ParseMarkdown(input, null, mode))
            expect(body.querySelector('[onmouseover]')).toBeNull()
        }
    })
})
