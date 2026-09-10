// @vitest-environment node

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { beforeAll, expect, test, vi } from 'vitest'

vi.mock('../parser/parser.svelte', () => ({
  hasher: vi.fn(),
  risuChatParser: vi.fn(),
}))

vi.mock('../alert', () => ({
  alertConfirm: vi.fn(),
  alertError: vi.fn(),
  alertInput: vi.fn(),
  alertNormal: vi.fn(),
  alertSelect: vi.fn(),
}))

vi.mock('../globalApi.svelte', () => ({ fetchNative: vi.fn(), readImage: vi.fn() }))
vi.mock('../tokenizer', () => ({ tokenize: vi.fn() }))
vi.mock('../util', () => ({
  asBuffer: vi.fn(),
  getPersonaPrompt: vi.fn(),
  getUserIcon: vi.fn(),
  getUserName: vi.fn(),
}))

vi.mock('../storage/database.svelte', () => ({
  getCurrentCharacter: vi.fn(() => ({})),
  getCurrentChat: vi.fn(() => ({ message: [] })),
  getDatabase: vi.fn(() => ({ characters: [] })),
  setDatabase: vi.fn(),
}))

vi.mock('../stores.svelte', () => ({
  DBState: { db: {} },
  ReloadChatPointer: { update: vi.fn() },
  ReloadGUIPointer: { update: vi.fn() },
  selectedCharID: { subscribe: (run: (value: number) => void) => (run(0), () => undefined) },
}))

vi.mock('./modules', () => ({
  getModuleLorebooks: vi.fn(() => []),
  getModuleTriggers: vi.fn(() => []),
}))

vi.mock('./files/inlays', () => ({ getInlayAsset: vi.fn(), writeInlayImage: vi.fn() }))
vi.mock('./lorebook.svelte', () => ({ loadLoreBookV3Prompt: vi.fn() }))
vi.mock('./memory/hypamemory', () => ({ HypaProcesser: vi.fn() }))
vi.mock('./request/request', () => ({ requestChatData: vi.fn() }))
vi.mock('./stableDiff', () => ({ generateAIImage: vi.fn() }))

let runScripted: typeof import('./scriptings').runScripted

beforeAll(async () => {
  const jsonLua = await readFile(resolve(process.cwd(), 'public/lua/json.lua'), 'utf8')
  vi.stubGlobal('fetch', vi.fn(async () => new Response(jsonLua, { status: 200 })))
  const scriptings = await import('./scriptings')
  runScripted = scriptings.runScripted
})

test('does not stop generation when setStateChanged is a no-op', async () => {
  const result = await runScripted(
    `
      function onStart(id)
        return setStateChanged(id, "unchanged", "value")
      end
    `,
    {
      char: {} as never,
      chat: { message: [] } as never,
      setVar: () => false,
      getVar: () => 'null',
      mode: 'start',
    }
  )

  expect(result.stopSending).toBe(false)
  expect(result.res).toBeNull()
})

test('keeps explicit false as the generation stop signal', async () => {
  const result = await runScripted('function onStart() return false end', {
    char: {} as never,
    chat: { message: [] } as never,
    mode: 'start',
  })

  expect(result.res).toBe(false)
  expect(result.stopSending).toBe(true)
})

test('setFullChat preserves message metadata on an identity round-trip', async () => {
  const message = [
    {
      role: 'user',
      data: 'hello',
      chatId: 'id-user',
      time: 100,
      name: 'alice',
      otherUser: true,
    },
    {
      role: 'char',
      data: 'hi',
      chatId: 'id-char',
      time: 200,
      saying: 'char-a',
      generationInfo: { generationId: 'gen-1', model: 'model-x' },
      promptInfo: { promptText: [] },
    },
  ]

  const result = await runScripted(
    `
      function onStart(id)
        setFullChat(id, getFullChat(id))
      end
    `,
    {
      char: {} as never,
      chat: { message: structuredClone(message) } as never,
      mode: 'start',
    }
  )

  expect(result.chat.message).toEqual(message)
})

test('setFullChat matches messages by chatId and only overwrites role and data', async () => {
  const result = await runScripted(
    `
      function onStart(id)
        local chat = getFullChat(id)
        chat[1].data = "edited"
        chat[2].role = "user"
        chat[2].time = 999
        table.insert(chat, 1, { role = "char", data = "prepended" })
        setFullChat(id, chat)
      end
    `,
    {
      char: {} as never,
      chat: {
        message: [
          { role: 'user', data: 'first', chatId: 'id-1', time: 1 },
          { role: 'char', data: 'second', chatId: 'id-2', time: 2, generationInfo: { generationId: 'gen-2' } },
        ],
      } as never,
      mode: 'start',
    }
  )

  expect(result.chat.message).toEqual([
    { role: 'char', data: 'prepended' },
    { role: 'user', data: 'edited', chatId: 'id-1', time: 1 },
    { role: 'user', data: 'second', chatId: 'id-2', time: 2, generationInfo: { generationId: 'gen-2' } },
  ])
})

test('setFullChat drops messages that are no longer present and does not alias duplicated chatIds', async () => {
  const result = await runScripted(
    `
      function onStart(id)
        local chat = getFullChat(id)
        table.remove(chat, 1)
        table.insert(chat, { role = chat[1].role, data = "copy", chatId = chat[1].chatId })
        setFullChat(id, chat)
      end
    `,
    {
      char: {} as never,
      chat: {
        message: [
          { role: 'user', data: 'first', chatId: 'id-1', time: 1 },
          { role: 'char', data: 'second', chatId: 'id-2', time: 2 },
        ],
      } as never,
      mode: 'start',
    }
  )

  expect(result.chat.message).toEqual([
    { role: 'char', data: 'second', chatId: 'id-2', time: 2 },
    { role: 'char', data: 'copy' },
  ])
  expect(result.chat.message[0]).not.toBe(result.chat.message[1])
})
