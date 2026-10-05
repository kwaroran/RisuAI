// @vitest-environment node

import { expect, test, vi } from 'vitest'

vi.mock('../parser/parser.svelte', () => ({ risuChatParser: vi.fn((v: string) => v) }))
vi.mock('../parser/chatML', () => ({ parseChatML: vi.fn() }))
vi.mock('../alert', () => ({
  alertError: vi.fn(),
  alertInput: vi.fn(),
  alertNormal: vi.fn(),
  alertSelect: vi.fn(),
}))
vi.mock('../tokenizer', () => ({ tokenize: vi.fn(async () => 0) }))
vi.mock('../util', () => ({ parseKeyValue: vi.fn(() => []), sleep: vi.fn() }))

vi.mock('../storage/database.svelte', () => ({
  getCurrentCharacter: vi.fn(() => ({})),
  getCurrentChat: vi.fn(() => ({ message: [] })),
  getDatabase: vi.fn(() => ({ characters: [] })),
  setCurrentCharacter: vi.fn(),
  setDatabase: vi.fn(),
}))

vi.mock('../stores.svelte', () => {
  const store = <T>(value: T) => ({ subscribe: (run: (value: T) => void) => (run(value), () => undefined), set: vi.fn(), update: vi.fn() })
  return {
    CurrentTriggerIdStore: store(null),
    DBState: { db: {} },
    ReloadChatPointer: store(0),
    ReloadGUIPointer: store(0),
    selectedCharID: store(0),
  }
})

vi.mock('./modules', () => ({ getModuleTriggers: vi.fn(() => []) }))
vi.mock('./command', () => ({ processMultiCommand: vi.fn() }))
vi.mock('./infunctions', () => ({ calcString: vi.fn() }))
vi.mock('./files/inlays', () => ({ writeInlayImage: vi.fn() }))
vi.mock('./memory/hypamemory', () => ({ HypaProcesser: vi.fn() }))
vi.mock('./request/request', () => ({ requestChatData: vi.fn() }))
vi.mock('./stableDiff', () => ({ generateAIImage: vi.fn() }))
vi.mock('./scriptings', () => ({
  runScripted: vi.fn(async (_code: string, arg: { chat: unknown }) => ({ stopSending: false, chat: arg.chat })),
}))

import { runTrigger } from './triggers'
import { runScripted } from './scriptings'

const character = (triggerscript: unknown[]) => ({
  type: 'character',
  chaId: 'c',
  lowLevelAccess: true,
  defaultVariables: '',
  triggerscript,
  chats: [{ message: [], scriptstate: {} }],
  chatPage: 0,
})

// display triggers run on the character from the save itself: writing into its triggers on every render marks the
// save changed
test('runTrigger in display mode leaves the character trigger objects untouched', async () => {
  const trigger = { comment: '', type: 'display', conditions: [], effect: [] }
  const char = character([trigger])

  const result = await runTrigger(char as never, 'display', { chat: char.chats[0] as never, displayMode: true, displayData: 'hello' })

  expect(result?.displayData).toBe('hello')
  expect(trigger).toEqual({ comment: '', type: 'display', conditions: [], effect: [] })
})

test("runTrigger gives Lua triggers the character's low level access", async () => {
  const char = character([{ comment: '', type: 'start', conditions: [], effect: [{ type: 'triggerlua', code: '' }] }])

  await runTrigger(char as never, 'start', { chat: char.chats[0] as never })

  expect(vi.mocked(runScripted)).toHaveBeenCalledWith('', expect.objectContaining({ lowLevelAccess: true }))
})
