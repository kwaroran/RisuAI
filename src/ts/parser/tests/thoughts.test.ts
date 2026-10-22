import { expect, test } from 'vitest'
import { replaceThoughtBlocks } from '../thoughts'

const wrap = (c: string) => `<details>${c}</details>`

test('replaces a single block', () => {
  expect(replaceThoughtBlocks('<Thoughts>a</Thoughts>', wrap)).toBe('<details>a</details>')
})

test('keeps surrounding text', () => {
  expect(replaceThoughtBlocks('pre <Thoughts>a</Thoughts> post', wrap)).toBe('pre <details>a</details> post')
})

test('handles multiple sequential blocks', () => {
  expect(replaceThoughtBlocks('<Thoughts>a</Thoughts><Thoughts>b</Thoughts>', wrap)).toBe(
    '<details>a</details><details>b</details>'
  )
})

test('treats nested identical tag as one balanced block', () => {
  expect(replaceThoughtBlocks('<Thoughts>outer<Thoughts>inner</Thoughts>tail</Thoughts>', wrap)).toBe(
    '<details>outer<Thoughts>inner</Thoughts>tail</details>'
  )
})

test('falls back to first close for a mention-style nested open tag', () => {
  // <Thoughts> mentions the tag name inside; depth never reaches 0, so it falls
  // back to the first closing tag (matches the old greedy behavior).
  expect(replaceThoughtBlocks('<Thoughts>use <Thoughts> tag as told</Thoughts>', wrap)).toBe(
    '<details>use <Thoughts> tag as told</details>'
  )
})

test('leaves unclosed blocks untouched', () => {
  expect(replaceThoughtBlocks('a <Thoughts>no close', wrap)).toBe('a <Thoughts>no close')
  expect(replaceThoughtBlocks('<Thoughts></Thoughts>', wrap)).toBe('<details></details>')
})

test('does not run the replacer for unclosed blocks', () => {
  let calls = 0
  const out = replaceThoughtBlocks('a <Thoughts>no close', () => {
    calls++
    return ''
  })
  expect(out).toBe('a <Thoughts>no close')
  expect(calls).toBe(0)
})

test('handles a thought block containing a tool call', () => {
  expect(replaceThoughtBlocks('<Thoughts>use <tool_call>x</tool_call></Thoughts>', wrap)).toBe(
    '<details>use <tool_call>x</tool_call></details>'
  )
})

test('empty content is still passed to the replacer', () => {
  const out = replaceThoughtBlocks('a <Thoughts></Thoughts> b', wrap)
  expect(out).toBe('a <details></details> b')
})

test('stripTrailingNewlines consumes newlines after the closing tag', () => {
  expect(replaceThoughtBlocks('<Thoughts>a</Thoughts>\n\nB', wrap, { stripTrailingNewlines: true })).toBe(
    '<details>a</details>B'
  )
})

test('stripTrailingNewlines applies per block', () => {
  expect(
    replaceThoughtBlocks('A <Thoughts>a</Thoughts>\n<Thoughts>b</Thoughts>\n\nC', wrap, { stripTrailingNewlines: true })
  ).toBe('A <details>a</details><details>b</details>C')
})

test('default keeps trailing newlines after the closing tag', () => {
  expect(replaceThoughtBlocks('<Thoughts>a</Thoughts>\n\nB', wrap)).toBe('<details>a</details>\n\nB')
})

test('stripTrailingNewlines only strips newlines, not other whitespace', () => {
  expect(replaceThoughtBlocks('<Thoughts>a</Thoughts>  \n\nB', wrap, { stripTrailingNewlines: true })).toBe(
    '<details>a</details>  \n\nB'
  )
})
