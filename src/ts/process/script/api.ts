import { getChatVar, hasher, setChatVar, getGlobalChatVar, type simpleCharacterArgument, risuChatParser } from "src/ts/parser.svelte";
import { getCurrentCharacter, getCurrentChat, getDatabase, setDatabase, type Chat, type character, type groupChat, type triggerscript } from "src/ts/storage/database.svelte";
import { get } from "svelte/store";
import { ReloadChatPointer, ReloadGUIPointer, selectedCharID } from "src/ts/stores.svelte";
import { alertSelect, alertError, alertInput, alertNormal } from "src/ts/alert";
import { HypaProcesser } from "src/ts/process/memory/hypamemory";
import { generateAIImage } from "src/ts/process/stableDiff";
import { writeInlayImage } from "src/ts/process/files/inlays";
import type { OpenAIChat } from "src/ts/process/index.svelte";
import { requestChatData } from "src/ts/process/request/request";
import { getModuleLorebooks } from "src/ts/process/modules";
import { tokenize } from "src/ts/tokenizer";
import { fetchNative } from "src/ts/globalApi.svelte";
import { loadLoreBookV3Prompt } from 'src/ts/process/lorebook.svelte';
import { getPersonaPrompt, getUserName } from 'src/ts/util';
import type { ScriptingEngineState } from "./engine";

let lastRequestResetTime = 0
let lastRequestsCount = 0

let ScriptingSafeIds = new Set<string>()
let ScriptingEditDisplayIds = new Set<string>()
let ScriptingLowLevelIds = new Set<string>()

export function getAccessKeys() {
    return { ScriptingSafeIds, ScriptingEditDisplayIds, ScriptingLowLevelIds }
}

export function declareAPI(
    declare: (name: string, func: Function) => void,
    ScriptingEngineState: ScriptingEngineState,
    stopSending: () => void,
    char: character | groupChat | simpleCharacterArgument
) {
    declare('getChatVar', (id: string, key: string) => {
        return ScriptingEngineState.getVar(key)
    })
    declare('setChatVar', (id: string, key: string, value: string) => {
        if (!ScriptingSafeIds.has(id) && !ScriptingEditDisplayIds.has(id)) {
            return
        }
        ScriptingEngineState.setVar(key, value)
    })
    declare('getGlobalVar', (id: string, key: string) => {
        return getGlobalChatVar(key)
    })
    declare('stopChat', (id: string) => {
        if (!ScriptingSafeIds.has(id)) {
            return
        }
        stopSending()
    })
    declare('alertError', (id: string, value: string) => {
        if (!ScriptingSafeIds.has(id)) {
            return
        }
        alertError(value)
    })
    declare('alertNormal', (id: string, value: string) => {
        if (!ScriptingSafeIds.has(id)) {
            return
        }
        alertNormal(value)
    })
    declare('alertInput', (id: string, value: string) => {
        if (!ScriptingSafeIds.has(id)) {
            return
        }
        return alertInput(value)
    })
    declare('alertSelect', (id: string, value: string[]) => {
        if (!ScriptingSafeIds.has(id)) {
            return
        }
        return alertSelect(value)
    })

    declare('getChatMain', (id: string, index: number) => {
        const chat = ScriptingEngineState.chat.message.at(index)
        if (!chat) {
            return JSON.stringify(null)
        }
        const data = {
            role: chat.role,
            data: chat.data,
            time: chat.time ?? 0
        }
        return JSON.stringify(data)
    })

    declare('setChat', (id: string, index: number, value: string) => {
        if (!ScriptingSafeIds.has(id)) {
            return
        }
        const message = ScriptingEngineState.chat.message?.at(index)
        if (message) {
            message.data = value ?? ''
        }
    })
    declare('setChatRole', (id: string, index: number, value: string) => {
        if (!ScriptingSafeIds.has(id)) {
            return
        }
        const message = ScriptingEngineState.chat.message?.at(index)
        if (message) {
            message.role = value === 'user' ? 'user' : 'char'
        }
    })
    declare('cutChat', (id: string, start: number, end: number) => {
        if (!ScriptingSafeIds.has(id)) {
            return
        }
        ScriptingEngineState.chat.message = ScriptingEngineState.chat.message.slice(start, end)
    })
    declare('removeChat', (id: string, index: number) => {
        if (!ScriptingSafeIds.has(id)) {
            return
        }
        ScriptingEngineState.chat.message.splice(index, 1)
    })
    declare('addChat', (id: string, role: string, value: string) => {
        if (!ScriptingSafeIds.has(id)) {
            return
        }
        let roleData: 'user' | 'char' = role === 'user' ? 'user' : 'char'
        ScriptingEngineState.chat.message.push({ role: roleData, data: value ?? '' })
    })
    declare('insertChat', (id: string, index: number, role: string, value: string) => {
        if (!ScriptingSafeIds.has(id)) {
            return
        }
        let roleData: 'user' | 'char' = role === 'user' ? 'user' : 'char'
        ScriptingEngineState.chat.message.splice(index, 0, { role: roleData, data: value ?? '' })
    })

    declare('getTokens', async (id: string, value: string) => {
        if (!ScriptingSafeIds.has(id)) {
            return
        }
        return await tokenize(value)
    })

    declare('getChatLength', (id: string) => {
        return ScriptingEngineState.chat.message.length
    })

    declare('getFullChatMain', (id: string) => {
        const data = JSON.stringify(ScriptingEngineState.chat.message.map((v) => {
            return {
                role: v.role,
                data: v.data,
                time: v.time ?? 0
            }
        }))
        return data
    })

    declare('cbs', (value) => {
        return risuChatParser(value, { chara: getCurrentCharacter() })
    })

    declare('setFullChatMain', (id: string, value: string) => {
        if (!ScriptingSafeIds.has(id)) {
            return
        }
        const realValue = JSON.parse(value)

        ScriptingEngineState.chat.message = realValue.map((v) => {
            return {
                role: v.role,
                data: v.data
            }
        })
    })

    declare('logMain', (value: string) => {
        console.log(JSON.parse(value))
    })

    declare('reloadDisplay', (id: string) => {
        if (!ScriptingSafeIds.has(id)) {
            return
        }
        ReloadGUIPointer.set(get(ReloadGUIPointer) + 1)
    })

    declare('reloadChat', (id: string, index: number) => {
        if (!ScriptingSafeIds.has(id)) {
            return
        }
        ReloadChatPointer.update((v) => {
            v[index] = (v[index] ?? 0) + 1
            return v
        })
    })

    //Low Level Access
    declare('similarity', async (id: string, source: string, value: string[]) => {
        if (!ScriptingLowLevelIds.has(id)) {
            return
        }
        const processer = new HypaProcesser()
        await processer.addText(value)
        return await processer.similaritySearch(source)
    })

    declare('request', async (id: string, url: string) => {
        if (!ScriptingLowLevelIds.has(id)) {
            return
        }

        if (lastRequestResetTime + 60000 < Date.now()) {
            lastRequestsCount = 0
            lastRequestResetTime = Date.now()
        }

        if (lastRequestsCount > 5) {
            return JSON.stringify({
                status: 429,
                data: 'Too many requests. you can request 5 times per minute'
            })
        }

        lastRequestsCount++

        try {
            //for security and other reasons, only get request in 120 char is allowed
            if (url.length > 120) {
                return JSON.stringify({
                    status: 413,
                    data: 'URL to large. max is 120 characters'
                })
            }

            if (!url.startsWith('https://')) {
                return JSON.stringify({
                    status: 400,
                    data: "Only https requests are allowed"
                })
            }

            const bannedURL = [
                "https://realm.risuai.net",
                "https://risuai.net",
                "https://risuai.xyz"
            ]

            for (const burl of bannedURL) {

                if (url.startsWith(burl)) {
                    return JSON.stringify({
                        status: 400,
                        data: "request to " + url + ' is not allowed'
                    })
                }
            }

            //browser fetch
            const d = await fetchNative(url, {
                method: "GET"
            })
            const text = await d.text()
            return JSON.stringify({
                status: d.status,
                data: text
            })

        } catch (error) {
            return JSON.stringify({
                status: 400,
                data: 'internal error'
            })
        }
    })

    declare('generateImage', async (id: string, value: string, negValue: string = '') => {
        if (!ScriptingLowLevelIds.has(id)) {
            return
        }
        const gen = await generateAIImage(value, char as character, negValue, 'inlay')
        if (!gen) {
            return 'Error: Image generation failed'
        }
        const imgHTML = new Image()
        imgHTML.src = gen
        const inlay = await writeInlayImage(imgHTML)
        return `{{inlay::${inlay}}}`
    })

    declare('hash', async (id: string, value: string) => {
        return await hasher(new TextEncoder().encode(value))
    })

    declare('LLMMain', async (id: string, promptStr: string) => {
        let prompt: {
            role: string,
            content: string
        }[] = JSON.parse(promptStr)
        if (!ScriptingLowLevelIds.has(id)) {
            return
        }
        let promptbody: OpenAIChat[] = prompt.map((dict) => {
            let role: 'system' | 'user' | 'assistant' = 'assistant'
            switch (dict['role']) {
                case 'system':
                case 'sys':
                    role = 'system'
                    break
                case 'user':
                    role = 'user'
                    break
                case 'assistant':
                case 'bot':
                case 'char': {
                    role = 'assistant'
                    break
                }
            }

            return {
                content: dict['content'] ?? '',
                role: role,
            }
        })
        const result = await requestChatData({
            formated: promptbody,
            bias: {},
            useStreaming: false,
            noMultiGen: true,
        }, 'model')

        if (result.type === 'fail') {
            return JSON.stringify({
                success: false,
                result: 'Error: ' + result.result
            })
        }

        if (result.type === 'streaming' || result.type === 'multiline') {
            return JSON.stringify({
                success: false,
                result: result.result
            })
        }

        return JSON.stringify({
            success: true,
            result: result.result
        })
    })

    declare('simpleLLM', async (id: string, prompt: string) => {
        if (!ScriptingLowLevelIds.has(id)) {
            return
        }
        const result = await requestChatData({
            formated: [{
                role: 'user',
                content: prompt
            }],
            bias: {},
            useStreaming: false,
            noMultiGen: true,
        }, 'model')

        if (result.type === 'fail') {
            return {
                success: false,
                result: 'Error: ' + result.result
            }
        }

        if (result.type === 'streaming' || result.type === 'multiline') {
            return {
                success: false,
                result: result.result
            }
        }

        return {
            success: true,
            result: result.result
        }
    })

    declare('getName', async (id: string) => {
        const db = getDatabase()
        const selectedChar = get(selectedCharID)
        const char = db.characters[selectedChar]
        return char.name
    })

    declare('setName', async (id: string, name: string) => {
        if (!ScriptingSafeIds.has(id)) {
            return
        }
        const db = getDatabase()
        const selectedChar = get(selectedCharID)
        if (typeof name !== 'string') {
            throw ('Invalid data type')
        }
        db.characters[selectedChar].name = name
        setDatabase(db)
    })

    declare('getDescription', async (id: string) => {
        if (!ScriptingSafeIds.has(id)) {
            return
        }
        const db = getDatabase()
        const selectedChar = get(selectedCharID)
        const char = db.characters[selectedChar]
        if (char.type === 'group') {
            throw ('Character is a group')
        }
        return char.desc
    })

    declare('setDescription', async (id: string, desc: string) => {
        if (!ScriptingSafeIds.has(id)) {
            return
        }
        const db = getDatabase()
        const selectedChar = get(selectedCharID)
        const char = db.characters[selectedChar]
        if (typeof desc !== 'string') {
            throw ('Invalid data type')
        }
        if (char.type === 'group') {
            throw ('Character is a group')
        }
        char.desc = desc
        db.characters[selectedChar] = char
        setDatabase(db)
    })

    declare('getCharacterFirstMessage', async (id: string) => {
        const db = getDatabase()
        const selectedChar = get(selectedCharID)
        const char = db.characters[selectedChar]
        return char.firstMessage
    })

    declare('setCharacterFirstMessage', async (id: string, data: string) => {
        if (!ScriptingSafeIds.has(id)) {
            return
        }
        const db = getDatabase()
        const selectedChar = get(selectedCharID)
        const char = db.characters[selectedChar]
        if (typeof data !== 'string') {
            return false
        }
        char.firstMessage = data
        db.characters[selectedChar] = char
        setDatabase(db)
        return true
    })

    declare('getPersonaName', (id: string) => {
        return getUserName()
    })

    declare('getPersonaDescription', (id: string) => {
        const db = getDatabase()
        const selectedChar = get(selectedCharID)
        const char = db.characters[selectedChar]

        return risuChatParser(getPersonaPrompt(), { chara: char })
    })

    declare('getAuthorsNote', (id: string) => {
        return ScriptingEngineState.chat?.note ?? ''
    })

    declare('getBackgroundEmbedding', async (id: string) => {
        if (!ScriptingSafeIds.has(id)) {
            return
        }
        const db = getDatabase()
        const selectedChar = get(selectedCharID)
        const char = db.characters[selectedChar]
        return char.backgroundHTML
    })

    declare('setBackgroundEmbedding', async (id: string, data: string) => {
        if (!ScriptingSafeIds.has(id)) {
            return
        }
        const db = getDatabase()
        const selectedChar = get(selectedCharID)
        if (typeof data !== 'string') {
            return false
        }
        db.characters[selectedChar].backgroundHTML = data
        setDatabase(db)
        return true
    })

    // Lore books
    declare('getLoreBooksMain', (id: string, search: string) => {
        const db = getDatabase()
        const selectedChar = db.characters[get(selectedCharID)]
        if (selectedChar.type !== 'character') {
            return
        }

        const loreBooks = [...selectedChar.chats[selectedChar.chatPage]?.localLore ?? [], ...selectedChar.globalLore, ...getModuleLorebooks()]
        const found = loreBooks.filter((b) => b.comment === search)

        return JSON.stringify(found.map((b) => ({ ...b, content: risuChatParser(b.content, { chara: selectedChar }) })))
    })

    type upsertLoreBookOptions = {
        alwaysActive?: boolean
        insertOrder?: number
        key?: string
        secondKey?: string
        regex?: boolean
    }

    declare('upsertLocalLoreBook', (id: string, name: string, content: string, options: upsertLoreBookOptions) => {
        if (!ScriptingSafeIds.has(id)) {
            return
        }

        if (char.type !== 'character') {
            return
        }

        const {
            alwaysActive = false,
            insertOrder = 100,
            key = '',
            regex = false,
            secondKey = '',
        } = options

        const currentChat = char.chats[char.chatPage]

        const newLocalLoreBooks = currentChat.localLore.filter((book) => book.comment !== name)
        newLocalLoreBooks.push({
            alwaysActive,
            comment: name,
            content: content,
            insertorder: insertOrder,
            mode: 'normal',
            key,
            secondkey: secondKey,
            selective: !!secondKey,
            useRegex: regex,
        })
        currentChat.localLore = newLocalLoreBooks
    })

    declare('loadLoreBooksMain', async (id: string, reserve: number) => {
        if (!ScriptingLowLevelIds.has(id)) {
            return
        }

        const db = getDatabase()

        const selectedChar = db.characters[get(selectedCharID)]

        if (selectedChar.type !== 'character') {
            return
        }

        const fullLoreBooks = (await loadLoreBookV3Prompt()).actives
        const maxContext = db.maxContext - reserve
        if (maxContext < 0) {
            return JSON.stringify([])
        }

        let totalTokens = 0
        const loreBooks = []

        for (const book of fullLoreBooks) {
            const parsed = risuChatParser(book.prompt, { chara: selectedChar }).trim()
            if (parsed.length === 0) {
                continue
            }

            const tokens = await tokenize(parsed)

            if (totalTokens + tokens > maxContext) {
                break
            }
            totalTokens += tokens
            loreBooks.push({
                data: parsed,
                role: book.role === 'assistant' ? 'char' : book.role,
            })
        }

        return JSON.stringify(loreBooks)
    })

    declare('axLLMMain', async (id: string, promptStr: string) => {
        let prompt: {
            role: string,
            content: string
        }[] = JSON.parse(promptStr)
        if (!ScriptingLowLevelIds.has(id)) {
            return
        }
        let promptbody: OpenAIChat[] = prompt.map((dict) => {
            let role: 'system' | 'user' | 'assistant' = 'assistant'
            switch (dict['role']) {
                case 'system':
                case 'sys':
                    role = 'system'
                    break
                case 'user':
                    role = 'user'
                    break
                case 'assistant':
                case 'bot':
                case 'char': {
                    role = 'assistant'
                    break
                }
            }

            return {
                content: dict['content'] ?? '',
                role: role,
            }
        })
        const result = await requestChatData({
            formated: promptbody,
            bias: {},
            useStreaming: false,
            noMultiGen: true,
        }, 'otherAx')

        if (result.type === 'fail') {
            return JSON.stringify({
                success: false,
                result: 'Error: ' + result.result
            })
        }

        if (result.type === 'streaming' || result.type === 'multiline') {
            return JSON.stringify({
                success: false,
                result: result.result
            })
        }

        return JSON.stringify({
            success: true,
            result: result.result
        })
    })

    declare('getCharacterLastMessage', (id: string) => {
        const chat = ScriptingEngineState.chat
        if (!chat) {
            return ''
        }

        const db = getDatabase()
        const selchar = db.characters[get(selectedCharID)]

        let pointer = chat.message.length - 1
        while (pointer >= 0) {
            if (chat.message[pointer].role === 'char') {
                const messageData = chat.message[pointer].data
                return messageData
            }
            pointer--
        }

        return selchar.firstMessage
    })

    declare('getUserLastMessage', (id: string) => {
        const chat = ScriptingEngineState.chat
        if (!chat) {
            return null
        }

        let pointer = chat.message.length - 1
        while (pointer >= 0) {
            if (chat.message[pointer].role === 'user') {
                const messageData = chat.message[pointer].data
                return messageData
            }
            pointer--
        }

        return null
    })
}
