import fc from 'fast-check'
import { writable } from 'svelte/store'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { risuChatParser } from '../../parser.svelte'
import { trimVarPrefix, validCBSArgProp } from './lib'

//#region module mocks

vi.mock(
  import('../../../storage/database.svelte'),
  () =>
    ({
      appVer: '1234.5.67',
      getCurrentCharacter: () => ({}),
      getCurrentChat: () => ({}),
      getDatabase: () => ({}),
    }) as typeof import('../../../storage/database.svelte'),
)

vi.mock(import('../../../globalApi.svelte'), () => ({
  aiWatermarkingLawApplies: () => false,
  getFileSrc: () => Promise.resolve(''),
}))

/** Returns accessed key as the value. */
const varStorage = vi.hoisted(
  () =>
    new Proxy(
      {},
      {
        get(_, prop) {
          return trimVarPrefix(prop)
        },
      },
    ),
)

vi.mock(import('../../../stores.svelte'), () => {
  return {
    DBState: {
      db: {
        characters: [
          {
            chatPage: 0,
            chats: [
              {
                scriptstate: varStorage,
              },
            ],
            defaultVariables: '',
          },
        ],
        globalChatVariables: varStorage,
        templateDefaultVariables: '',
      },
    },
    selIdState: {
      selId: 0,
    },
    selectedCharID: writable(0),
  } as typeof import('../../../stores.svelte')
})

//#endregion

const template = (op: string, body: string) => `0 {{${op}}}${body}{{/}} 9`
const quickParse = (...args: Parameters<typeof template>) => risuChatParser(template(...args))

const indentedBody = `

  C  
  B  
  S  

`

afterEach(() => {
  vi.resetAllMocks()
})

describe('#if', () => {
  test('renders when "1" or "true"', () => {
    expect(quickParse('#if 1', 'CBS')).toBe(`0 CBS 9`)
    expect(quickParse('#if true', 'CBS')).toBe(`0 CBS 9`)

    // Edge case: {{#if 1\s+.*}} also renders
    fc.assert(
      fc.property(fc.constantFrom('1', 'true'), fc.stringMatching(/^ +[^#:{}\r\n]*$/), (truthy, tail) => {
        expect(quickParse(`#if ${truthy}${tail}`, 'CBS')).toBe(`0 CBS 9`)
      }),
    )
  })

  test('does not render when anything else', async () => {
    expect(quickParse('#if 0', 'CBS')).toBe('0  9')
    expect(quickParse('#if false', 'CBS')).toBe('0  9')

    // Edge case: {{#if \s+1}} does not render
    expect(quickParse('#if  1', 'CBS')).toBe(`0  9`)
    expect(quickParse('#if   true', 'CBS')).toBe(`0  9`)

    fc.assert(
      fc.property(
        validCBSArgProp.filter((s) => !/^1|(?:true)\s*/.test(s)),
        (anythingElse) => {
          expect(quickParse(`#if ${anythingElse}`, 'CBS')).toBe(`0  9`)
        },
      ),
    )
  })

  test('trims start of the block, end of the block, and start of each line', () => {
    expect(quickParse('#if 1', indentedBody)).toBe('0 C  \nB  \nS 9')
  })

  test('can be nested', () => {
    expect(quickParse('#if 1', template('#if 1', 'CBS'))).toBe(`0 0 CBS 9 9`)
    expect(quickParse('#if 1', template('#if 0', 'CBS'))).toBe(`0 0  9 9`)
    expect(quickParse('#if 0', template('#if 1', 'CBS'))).toBe(`0  9`)
    expect(quickParse('#if 0', template('#if 0', 'CBS'))).toBe(`0  9`)
  })
})

describe('#if_pure', () => {
  test('renders when "1" or "true"', () => {
    expect(quickParse('#if_pure 1', 'CBS')).toBe(`0 CBS 9`)
    expect(quickParse('#if_pure true', 'CBS')).toBe(`0 CBS 9`)

    // Edge case: {{#if_pure 1\s+.*}} also renders
    fc.assert(
      fc.property(fc.constantFrom('1', 'true'), fc.stringMatching(/^ +[^#:{}\r\n]*$/), (truthy, tail) => {
        expect(quickParse(`#if_pure ${truthy}${tail}`, 'CBS')).toBe(`0 CBS 9`)
      }),
    )
  })

  test('does not render when anything else', async () => {
    expect(quickParse('#if_pure 0', 'CBS')).toBe('0  9')
    expect(quickParse('#if_pure false', 'CBS')).toBe('0  9')

    // Edge case: {{#if_pure \s+1}} does not render
    expect(quickParse('#if_pure  1', 'CBS')).toBe(`0  9`)
    expect(quickParse('#if_pure   true', 'CBS')).toBe(`0  9`)

    fc.assert(
      fc.property(
        validCBSArgProp.filter((s) => !/^1|(?:true)\s*/.test(s)),
        (anythingElse) => {
          expect(quickParse(`#if_pure ${anythingElse}`, 'CBS')).toBe(`0  9`)
        },
      ),
    )
  })

  test('preserves all whitespaces', () => {
    expect(quickParse('#if_pure 1', indentedBody)).toBe(`0 ${indentedBody} 9`)
  })

  test('can be nested', () => {
    expect(quickParse('#if_pure 1', template('#if_pure 1', indentedBody))).toBe(`0 0 ${indentedBody} 9 9`)
    expect(quickParse('#if_pure 1', template('#if_pure 0', indentedBody))).toBe(`0 0  9 9`)
    expect(quickParse('#if_pure 0', template('#if_pure 1', indentedBody))).toBe(`0  9`)
    expect(quickParse('#if_pure 0', template('#if_pure 0', indentedBody))).toBe(`0  9`)
  })
})

describe('#when', () => {
  test('renders when "1" or "true"', () => {
    expect(quickParse('#when::1', 'CBS')).toBe(`0 CBS 9`)
    expect(quickParse('#when::true', 'CBS')).toBe(`0 CBS 9`)
  })

  test('does not render when anything else', async () => {
    expect(quickParse('#when::0', 'CBS')).toBe('0  9')
    expect(quickParse('#when::false', 'CBS')).toBe('0  9')

    fc.assert(
      fc.property(
        validCBSArgProp.filter((s) => s !== '1' && s !== 'true'),
        (anythingElse) => {
          expect(quickParse(`#when::${anythingElse}`, 'CBS')).toBe(`0  9`)
        },
      ),
    )
  })

  test('removes line breaks at block start/end, preserves all other whitespaces', () => {
    expect(quickParse('#when::1', indentedBody)).toBe(`0 ${indentedBody.replaceAll(/(^\n+|\n+$)/g, '')} 9`)
  })

  test('can be nested', () => {
    expect(quickParse('#when 1', template('#when 1', 'CBS'))).toBe(`0 0 CBS 9 9`)
    expect(quickParse('#when 1', template('#when 0', 'CBS'))).toBe(`0 0  9 9`)
    expect(quickParse('#when 0', template('#when 1', 'CBS'))).toBe(`0  9`)
    expect(quickParse('#when 0', template('#when 0', 'CBS'))).toBe(`0  9`)
  })

  test('can omit :: without operators', () => {
    expect(quickParse('#when 1', 'CBS')).toBe(`0 CBS 9`)
    expect(quickParse('#when 0', 'CBS')).toBe('0  9')
  })

  describe('Operators: equality/inequality', () => {
    test('::is, isnot', () => {
      fc.assert(
        fc.property(validCBSArgProp, validCBSArgProp, (a, b) => {
          fc.pre(a !== b)

          expect(quickParse(`#when::${a}::is::${a}`, 'CBS')).toBe('0 CBS 9')
          expect(quickParse(`#when::${a}::is::${b}`, 'CBS')).toBe('0  9')

          expect(quickParse(`#when::${a}::isnot::${a}`, 'CBS')).toBe('0  9')
          expect(quickParse(`#when::${a}::isnot::${b}`, 'CBS')).toBe('0 CBS 9')
        }),
      )
    })

    test('::>, >=, <=, <', () => {
      fc.assert(
        fc.property(fc.integer(), fc.integer(), (a, b) => {
          fc.pre(a > b)

          expect(quickParse(`#when::${a}::>::${a}`, 'CBS')).toBe('0  9')
          expect(quickParse(`#when::${a}::>::${b}`, 'CBS')).toBe('0 CBS 9')
          expect(quickParse(`#when::${b}::>::${a}`, 'CBS')).toBe('0  9')

          expect(quickParse(`#when::${a}::>=::${a}`, 'CBS')).toBe('0 CBS 9')
          expect(quickParse(`#when::${a}::>=::${b}`, 'CBS')).toBe('0 CBS 9')
          expect(quickParse(`#when::${b}::>=::${a}`, 'CBS')).toBe('0  9')

          expect(quickParse(`#when::${a}::<=::${a}`, 'CBS')).toBe('0 CBS 9')
          expect(quickParse(`#when::${a}::<=::${b}`, 'CBS')).toBe('0  9')
          expect(quickParse(`#when::${b}::<=::${a}`, 'CBS')).toBe('0 CBS 9')

          expect(quickParse(`#when::${a}::<::${a}`, 'CBS')).toBe('0  9')
          expect(quickParse(`#when::${a}::<::${b}`, 'CBS')).toBe('0  9')
          expect(quickParse(`#when::${b}::<::${a}`, 'CBS')).toBe('0 CBS 9')
        }),
      )
    })
  })

  describe('Operators: logical', () => {
    test('::and', () => {
      expect(quickParse('#when::1::and::1', 'CBS')).toBe(`0 CBS 9`)
      expect(quickParse('#when::1::and::not::true', 'CBS')).toBe(`0  9`)

      expect(quickParse('#when::1::and::0', 'CBS')).toBe(`0  9`)
      expect(quickParse('#when::1::and::not::false', 'CBS')).toBe(`0 CBS 9`)
    })

    test('::or', () => {
      expect(quickParse('#when::0::or::1', 'CBS')).toBe(`0 CBS 9`)
      expect(quickParse('#when::0::or::not::true', 'CBS')).toBe(`0  9`)

      expect(quickParse('#when::0::or::0', 'CBS')).toBe(`0  9`)
      expect(quickParse('#when::0::or::not::false', 'CBS')).toBe(`0 CBS 9`)
    })

    test('right-to-left evaluation', () => {
      expect(quickParse('#when::1::or::0::and::0', 'CBS')).toBe(`0 CBS 9`)
      expect(quickParse('#when::0::or::1::and::0', 'CBS')).toBe(`0  9`)
      expect(quickParse('#when::0::or::0::and::1', 'CBS')).toBe(`0  9`)

      expect(quickParse('#when::1::and::1::or::0', 'CBS')).toBe(`0 CBS 9`)
      expect(quickParse('#when::1::and::0::or::1', 'CBS')).toBe(`0 CBS 9`)
      expect(quickParse('#when::0::and::1::or::1', 'CBS')).toBe(`0  9`)
    })

    test.skip('Lower precedence than other operators', () => {
      // FIXME: left-hand/right-hand must be evaluated first, then or
      // Given #when::a::tis::3::or::b::tis::7
      //   AS-IS: a::tis::3 -> 1, 1::or::7 -> 1, 1::tis::7 -> 0
      //   TO-BE: a::tis::3 -> 1, b::tis::7 -> 1, 1::or::1 -> 1
      expect(quickParse('#when::3::tis::3::or::7::tis::7', 'CBS')).toBe(`0 CBS 9`)
    })
  })

  describe('Operators: whitespaces', () => {
    test('::keep preserves all whitespaces', () => {
      expect(quickParse('#when::keep::1', indentedBody)).toBe(`0 ${indentedBody} 9`)
    })

    test('::legacy trims start of the block, end of the block, and start of each line', () => {
      expect(quickParse('#when::legacy::1', indentedBody)).toBe(`0 C  \nB  \nS 9`)
    })
  })

  describe('Operators: variables', () => {
    test('::var, toggle', () => {
      expect(quickParse('#when::var::true', 'CBS')).toBe(`0 CBS 9`)
      expect(quickParse('#when::toggle::true', 'CBS')).toBe(`0 CBS 9`)

      fc.assert(
        fc.property(
          validCBSArgProp.filter((s) => s !== '1' && s !== 'true'),
          (anythingElse) => {
            expect(quickParse(`#when::var::${anythingElse}`, 'CBS')).toBe(`0  9`)
            expect(quickParse(`#when::toggle::${anythingElse}`, 'CBS')).toBe(`0  9`)
          },
        ),
      )
    })

    test('::vis, visnot, tis, tisnot', () => {
      fc.assert(
        fc.property(validCBSArgProp, validCBSArgProp, (a, b) => {
          fc.pre(a !== b)

          expect(quickParse(`#when::${a}::vis::${a}`, 'CBS')).toBe(`0 CBS 9`)
          expect(quickParse(`#when::${a}::vis::${b}`, 'CBS')).toBe(`0  9`)
          expect(quickParse(`#when::${a}::tis::${a}`, 'CBS')).toBe(`0 CBS 9`)
          expect(quickParse(`#when::${a}::tis::${b}`, 'CBS')).toBe(`0  9`)

          expect(quickParse(`#when::${a}::visnot::${a}`, 'CBS')).toBe(`0  9`)
          expect(quickParse(`#when::${a}::visnot::${b}`, 'CBS')).toBe(`0 CBS 9`)
          expect(quickParse(`#when::${a}::tisnot::${a}`, 'CBS')).toBe(`0  9`)
          expect(quickParse(`#when::${a}::tisnot::${b}`, 'CBS')).toBe(`0 CBS 9`)
        }),
      )
    })
  })

  describe('else', () => {
    test('single line else', () => {
      expect(quickParse('#when::1', 'CBS{{:else}}SBC')).toBe(`0 CBS 9`)
      expect(quickParse('#when::0', 'CBS{{:else}}SBC')).toBe(`0 SBC 9`)
    })

    test('multiline else', () => {
      expect(quickParse('#when::1', 'CBS\n{{:else}}\nSBC')).toBe(`0 CBS 9`)
      expect(quickParse('#when::0', 'CBS\n{{:else}}\nSBC')).toBe(`0 SBC 9`)
    })

    test('with ::keep', () => {
      const revBody = [...indentedBody].reverse().join('')

      // FIXME: Unexpected line break removal before the {{:else}}
      expect(quickParse('#when::keep::1', `${indentedBody}{{:else}}${revBody}`)).toBe(
        `0 ${indentedBody.replace(/\n$/, '')} 9`,
      )
      // FIXME: Unexpected line break removal after the {{:else}}
      expect(quickParse('#when::keep::0', `${indentedBody}{{:else}}${revBody}`)).toBe(
        `0 ${revBody.replace(/^\n/, '')} 9`,
      )
    })

    test('works in and out of a nested #when', () => {
      const nestedTemplate = (a: string, b: string) => `{{#when ${a}}}
{{#when ${b}}}CBS{{:else}}SBC{{/}}
{{:else}}
ABC
{{/}}`

      expect(risuChatParser(nestedTemplate('1', '1'))).toBe(`CBS`)
      expect(risuChatParser(nestedTemplate('1', '0'))).toBe(`SBC`)
      expect(risuChatParser(nestedTemplate('0', '1'))).toBe(`ABC`)
      expect(risuChatParser(nestedTemplate('0', '0'))).toBe(`ABC`)
    })

    test('works in an #each', () => {
      const template = `{{#each [1, 2, 3] as n}}
{{#when::n::is::2}}
CBS{{slot::n}}
{{:else}}
SBC{{slot::n}}
{{/}}
{{/}}`
      expect(risuChatParser(template)).toBe(`SBC1SBC2SBC3`)
    })
  })
})
