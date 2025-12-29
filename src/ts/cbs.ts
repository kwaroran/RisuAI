import type { Database, character, loreBook } from './storage/database.svelte';
import type { CbsConditions } from './parser.svelte';
import type { RisuModule } from './process/modules';
import type { LLMModel } from './model/modellist';
import { get } from 'svelte/store';
import { CurrentTriggerIdStore } from './stores.svelte';

export const defaultCBSRegisterArg: CBSRegisterArg = {
    registerFunction: () => { throw new Error('registerFunction not implemented') },
    getDatabase: () => { throw new Error('getDatabase not implemented') },
    getUserName: () => 'placeholder_user',
    getPersonaPrompt: () => 'placeholder_persona',
    risuChatParser: (text: string) => text,
    makeArray: (arr: string[]) => JSON.stringify(arr),
    safeStructuredClone: <T>(obj: T) => JSON.parse(JSON.stringify(obj)),
    parseArray: (str: string) => {
        try { return JSON.parse(str) } 
        catch { return [] }
    },
    parseDict: (str: string) => {
        try { return JSON.parse(str) } 
        catch { return {} }
    },
    getChatVar: () => '',
    setChatVar: () => {},
    getGlobalChatVar: () => '',
    calcString: () => 0,
    dateTimeFormat: (format: string, timestamp?: number) => {
        const date = timestamp ? new Date(timestamp * 1000) : new Date();
        return date.toISOString();
    },
    getModules: () => [],
    getModuleLorebooks: () => [],
    pickHashRand: () => Math.random(),
    getSelectedCharID: () => 0,
    callInternalFunction: (args: string[]) => {return ''},
    isTauri: false,
    isNodeServer: false,
    isMobile: false,
    appVer: '0.0.0',
    getModelInfo: () => ({
        id: 'placeholder',
        name: 'Placeholder Model',
        shortName: 'Placeholder',
        internalID: 'placeholder',
        format: 0,
        provider: 0,
        tokenizer: 0
    } as LLMModel)
};

export type matcherArg = {
    chatID: number,
    db: Database,
    chara: character | string,
    rmVar: boolean,
    var?: { [key: string]: string }
    tokenizeAccurate?: boolean
    consistantChar?: boolean
    displaying?: boolean
    role?: string
    runVar?: boolean
    funcName?: string
    text?: string,
    recursiveCount?: number
    lowLevelAccess?: boolean
    cbsConditions: CbsConditions
    triggerId?: string
}
"a".toLowerCase().split('::')

export type RegisterCallback = (str: string, matcherArg: matcherArg, args:string[], vars: { [key: string]: string } | null) => {
    text: string,
    var: { [key: string]: string }
} | string | null

export type CBSRegisterArg = {
    registerFunction: (arg:{
        name: string,
        callback: RegisterCallback|'doc_only',
        alias: string[]
        description: string
        deprecated?: {
            message: string,
            since?: string,
            replacement?: string
        }
        internalOnly?: boolean
    }) => void | Promise<void>,
    getDatabase: () => Database,
    getUserName: () => string,
    getPersonaPrompt: () => string,
    risuChatParser: (text: string, arg: matcherArg) => string,
    makeArray: (arr: string[]) => string,
    safeStructuredClone: <T>(obj: T) => T,
    parseArray: (str: string) => string[],
    parseDict: (str: string) => {[key: string]: string},
    getChatVar: (key: string) => string,
    setChatVar: (key: string, value: string) => void,
    getGlobalChatVar: (key: string) => string,
    calcString: (str: string) => number,
    dateTimeFormat: (format: string, timestamp?: number) => string,
    getModules: () => RisuModule[],
    getModuleLorebooks: () => loreBook[],
    pickHashRand: (seed: number, hash: string) => number,
    getSelectedCharID: () => number,
    getModelInfo: (model: string) => LLMModel
    callInternalFunction: (args: string[]) => string,
    isTauri: boolean,
    isNodeServer: boolean,
    isMobile: boolean,
    appVer: string,
}

export function registerCBS(arg:CBSRegisterArg) {
    const { 
        registerFunction, 
        getDatabase, 
        getUserName, 
        getPersonaPrompt, 
        risuChatParser, 
        makeArray, 
        safeStructuredClone, 
        parseArray, 
        parseDict, 
        getChatVar, 
        setChatVar, 
        getGlobalChatVar, 
        calcString, 
        dateTimeFormat, 
        getModules, 
        getModuleLorebooks, 
        pickHashRand, 
        getSelectedCharID, 
        isTauri, 
        isNodeServer, 
        isMobile, 
        appVer, 
        getModelInfo,
        callInternalFunction
    } = arg;

    // Basic character/user variables
    registerFunction({
        name: 'char',
        callback: (str, matcherArg, args, vars) => {
            if(matcherArg.consistantChar){
                return 'botname'
            }
            const db = getDatabase()
            let selectedChar = getSelectedCharID()
            let currentChar = db.characters[selectedChar]
            if(currentChar && currentChar.type !== 'group'){
                return currentChar.nickname || currentChar.name
            }
            if(matcherArg.chara){
                if(typeof(matcherArg.chara) === 'string'){
                    return matcherArg.chara
                }
                else{
                    return matcherArg.chara.name
                }
            }
            return currentChar.nickname || currentChar.name
        },
        alias: ['bot'],
        description: 'Returns the name or nickname of the current character/bot. In consistent character mode, returns "botname". For group chats, returns the group name.\n\nUsage:: {{char}}',
    });

    registerFunction({
        name: 'user',
        callback: (str, matcherArg, args, vars) => {
            if(matcherArg.consistantChar){
                return 'username'
            }
            return getUserName()
        },
        alias: [],
        description: 'Returns the current user\'s name as set in user settings. In consistent character mode, returns "username".\n\nUsage:: {{user}}',
    });

    registerFunction({
        name: 'trigger_id',
        callback: (str, matcherArg, args, vars) => {
            const currentTriggerId = get(CurrentTriggerIdStore)
            return currentTriggerId ?? 'null'
        },
        alias: ['triggerid'],
        description: 'Returns the ID value from the risu-id attribute of the clicked element that triggered the manual trigger. Returns "null" if no ID was provided.\n\nUsage:: {{trigger_id}}',
    });

    registerFunction({
        name: 'previouscharchat',
        callback: (str, matcherArg, args, vars) => {
            const db = getDatabase()
            const selchar = db.characters[getSelectedCharID()]
            const chat = selchar.chats[selchar.chatPage]
            let pointer = matcherArg.chatID !== -1 ? matcherArg.chatID - 1 : chat.message.length - 1
            while(pointer >= 0){
                if(chat.message[pointer].role === 'char'){
                    return chat.message[pointer].data
                }
                pointer--
            }
            return chat.fmIndex === -1 ? selchar.firstMessage : selchar.alternateGreetings[chat.fmIndex]
        },
        alias: ['previouscharchat', 'lastcharmessage'],
        description: 'Returns the last message sent by the character in the current chat. Searches backwards from the current message position to find the most recent character message. If no character messages exist, returns the first message or selected alternate greeting.\n\nUsage:: {{previouscharchat}}',
    });
    
    registerFunction({
        name: 'previoususerchat',
        callback: (str, matcherArg, args, vars) => {
            const chatID = matcherArg.chatID
            if(chatID !== -1){
                const db = getDatabase()
                const selchar = db.characters[getSelectedCharID()]
                const chat = selchar.chats[selchar.chatPage]
                let pointer = chatID - 1
                while(pointer >= 0){
                    if(chat.message[pointer].role === 'user'){
                        return chat.message[pointer].data
                    }
                    pointer--
                }
                return chat.fmIndex === -1 ? selchar.firstMessage : selchar.alternateGreetings[chat.fmIndex]
            }
            return ''
        },
        alias: ['previoususerchat', 'lastusermessage'],
        description: 'Returns the last message sent by the user in the current chat. Searches backwards from the current message position to find the most recent user message. Only works when chatID is available (not -1). Returns empty string if no user messages found.\n\nUsage:: {{previoususerchat}}',
    });

    // Character data functions
    registerFunction({
        name: 'personality',
        callback: (str, matcherArg, args, vars) => {
            const db = getDatabase()
            const argChara = matcherArg.chara
            const achara = (argChara && typeof(argChara) !== 'string') ? argChara : (db.characters[getSelectedCharID()])
            if(achara.type === 'group'){
                return ""
            }
            return risuChatParser(achara.personality, matcherArg)
        },
        alias: ['charpersona'],
        description: 'Returns the personality field of the current character. The text is processed through the chat parser for variable substitution. Returns empty string for group chats.\n\nUsage:: {{personality}}',
    });

    registerFunction({
        name: 'description',
        callback: (str, matcherArg, args, vars) => {
            const db = getDatabase()
            const argChara = matcherArg.chara
            const achara = (argChara && typeof(argChara) !== 'string') ? argChara : (db.characters[getSelectedCharID()])
            if(achara.type === 'group'){
                return ""
            }
            return risuChatParser(achara.desc, matcherArg)
        },
        alias: ['chardesc'],
        description: 'Returns the description field of the current character. The text is processed through the chat parser for variable substitution. Returns empty string for group chats.\n\nUsage:: {{description}}',
    });

    registerFunction({
        name: 'scenario',
        callback: (str, matcherArg, args, vars) => {
            const db = getDatabase()
            const argChara = matcherArg.chara
            const achara = (argChara && typeof(argChara) !== 'string') ? argChara : (db.characters[getSelectedCharID()])
            if(achara.type === 'group'){
                return ""
            }
            return risuChatParser(achara.scenario, matcherArg)
        },
        alias: [],
        description: 'Returns the scenario field of the current character. The text is processed through the chat parser for variable substitution. Returns empty string for group chats.\n\nUsage:: {{scenario}}',
    });

    registerFunction({
        name: 'exampledialogue',
        callback: (str, matcherArg, args, vars) => {
            const db = getDatabase()
            const argChara = matcherArg.chara
            const achara = (argChara && typeof(argChara) !== 'string') ? argChara : (db.characters[getSelectedCharID()])
            if(achara.type === 'group'){
                return ""
            }
            return risuChatParser(achara.exampleMessage, matcherArg)
        },
        alias: ['examplemessage', 'example_dialogue'],
        description: 'Returns the example dialogue/message field of the current character. The text is processed through the chat parser for variable substitution. Returns empty string for group chats.\n\nUsage:: {{exampledialogue}}',
    });

    // Prompt and system functions
    registerFunction({
        name: 'persona',
        callback: (str, matcherArg, args, vars) => {
            return risuChatParser(getPersonaPrompt(), matcherArg)
        },
        alias: ['userpersona'],
        description: 'Returns the user persona prompt text. The text is processed through the chat parser for variable substitution. This contains the user\'s character description/personality.\n\nUsage:: {{persona}}',
    });

    registerFunction({
        name: 'mainprompt',
        callback: (str, matcherArg, args, vars) => {
            const db = getDatabase()
            return risuChatParser(db.mainPrompt, matcherArg)
        },
        alias: ['systemprompt', 'main_prompt'],
        description: 'Returns the main system prompt that provides instructions to the AI model. The text is processed through the chat parser for variable substitution.\n\nUsage:: {{mainprompt}}',
    });

    registerFunction({
        name: 'lorebook',
        callback: (str, matcherArg, args, vars) => {
            const db = getDatabase()
            const argChara = matcherArg.chara
            const achara = (argChara && typeof(argChara) !== 'string') ? argChara : (db.characters[getSelectedCharID()])
            const selchar = db.characters[getSelectedCharID()]
            const chat = selchar.chats[selchar.chatPage]
            const characterLore = (achara.type === 'group') ? [] : (achara.globalLore ?? [])
            const chatLore = chat.localLore ?? []
            const fullLore = characterLore.concat(chatLore.concat(getModuleLorebooks()))
            return makeArray(fullLore.map((v) => {
                return JSON.stringify(v)
            }))
        },
        alias: ['worldinfo'],
        description: 'Returns all active lorebook entries as a JSON array. Combines character lorebook, chat-specific lorebook, and module lorebooks. Each entry is JSON.stringify\'d.\n\nUsage:: {{lorebook}}',
    });

    registerFunction({
        name: 'userhistory',
        callback: (str, matcherArg, args, vars) => {
            const db = getDatabase()
            const selchar = db.characters[getSelectedCharID()]
            const chat = selchar.chats[selchar.chatPage]
            return makeArray(chat.message.filter((v) => {
                return v.role === 'user'
            }).map((v) => {
                v = safeStructuredClone(v)
                v.data = risuChatParser(v.data, matcherArg)
                return JSON.stringify(v)
            }))
        },
        alias: ['usermessages', 'user_history'],
        description: 'Returns all user messages in the current chat as a JSON array. Each message object contains role, data, and other metadata. Data is processed through chat parser.\n\nUsage:: {{userhistory}}',
    });

    registerFunction({
        name: 'charhistory',
        callback: (str, matcherArg, args, vars) => {
            const db = getDatabase()
            const selchar = db.characters[getSelectedCharID()]
            const chat = selchar.chats[selchar.chatPage]
            return makeArray(chat.message.filter((v) => {
                return v.role === 'char'
            }).map((v) => {
                v = safeStructuredClone(v)
                v.data = risuChatParser(v.data, matcherArg)
                return JSON.stringify(v)
            }))
        },
        alias: ['charmessages', 'char_history'],
        description: 'Returns all character messages in the current chat as a JSON array. Each message object contains role, data, and other metadata. Data is processed through chat parser.\n\nUsage:: {{charhistory}}',
    });

    registerFunction({
        name: 'jb',
        callback: (str, matcherArg, args, vars) => {
            const db = getDatabase()
            return risuChatParser(db.jailbreak, matcherArg)
        },
        alias: ['jailbreak'],
        description: 'Returns the jailbreak prompt text used to modify AI behavior. The text is processed through the chat parser for variable substitution.\n\nUsage:: {{jb}}',
    });

    registerFunction({
        name: 'globalnote',
        callback: (str, matcherArg, args, vars) => {
            const db = getDatabase()
            return risuChatParser(db.globalNote, matcherArg)
        },
        alias: ['globalnote', 'systemnote', 'ujb'],
        description: 'Returns the global note (also called system note) that is appended to prompts. The text is processed through the chat parser for variable substitution.\n\nUsage:: {{globalnote}}',
    });

    registerFunction({
        name: 'chatindex',
        callback: (str, matcherArg, args, vars) => {
            return matcherArg.chatID.toString()
        },
        alias: ['chat_index'],
        description: 'Returns the current message index in the chat as a string. -1 indicates no specific message context.\n\nUsage:: {{chatindex}}',
    });

    registerFunction({
        name: 'firstmsgindex',
        callback: (str, matcherArg, args, vars) => {
            const db = getDatabase()
            const selchar = db.characters[getSelectedCharID()]
            const chat = selchar.chats[selchar.chatPage]
            return chat.fmIndex.toString()
        },
        alias: ['firstmessageindex', 'first_msg_index'],
        description: 'Returns the index of the selected first message/alternate greeting as a string. -1 indicates the default first message is used.\n\nUsage:: {{firstmsgindex}}',
    });

    registerFunction({
        name: 'blank',
        callback: (str, matcherArg, args, vars) => {
            return ''
        },
        alias: ['none'],
        description: 'Returns an empty string. Useful for clearing variables or creating conditional empty outputs.\n\nUsage:: {{blank}}',
    });

    registerFunction({
        name: 'messagetime',
        callback: (str, matcherArg, args, vars) => {
            if(matcherArg.tokenizeAccurate){
                return `00:00:00`
            }
            if(matcherArg.chatID === -1){
                return "[Cannot get time]"
            }

            const db = getDatabase()
            const selchar = db.characters[getSelectedCharID()]
            const chat = selchar.chats[selchar.chatPage]
            const message = chat.message[matcherArg.chatID]
            if(!message.time){
                return "[Cannot get time, message was sent in older version]"
            }
            const date = new Date(message.time)
            return date.toLocaleTimeString()
        },
        alias: ['message_time'],
        description: 'Returns the time when the current message was sent in local time format (HH:MM:SS). Returns "00:00:00" in tokenization mode or error messages for old/invalid messages.\n\nUsage:: {{messagetime}}',
    });

    registerFunction({
        name: 'messagedate',
        callback: (str, matcherArg, args, vars) => {
            if(matcherArg.tokenizeAccurate){
                return `00:00:00`
            }
            if(matcherArg.chatID === -1){
                return "[Cannot get time]"
            }
            const db = getDatabase()
            const selchar = db.characters[getSelectedCharID()]
            const chat = selchar.chats[selchar.chatPage]
            const message = chat.message[matcherArg.chatID]
            if(!message.time){
                return "[Cannot get time, message was sent in older version]"
            }
            const date = new Date(message.time)
            return date.toLocaleDateString()
        },
        alias: ['message_date'],
        description: 'Returns the date when the current message was sent in local date format. Returns "00:00:00" in tokenization mode or error messages for old/invalid messages.\n\nUsage:: {{messagedate}}',
    });

    registerFunction({
        name: 'messageunixtimearray',
        callback: (str, matcherArg, args, vars) => {
            const db = getDatabase()
            const selchar = db.characters[getSelectedCharID()]
            const chat = selchar.chats[selchar.chatPage]
            return makeArray(chat.message.map((f) => {
                return `${f.time ?? 0}`
            }))
        },
        alias: ['message_unixtime_array'],
        description: 'Returns all message timestamps as a JSON array of unix timestamps (in milliseconds). Messages without timestamps show as 0.\n\nUsage:: {{messageunixtimearray}}',
    });

    registerFunction({
        name: 'unixtime',
        callback: (str, matcherArg, args, vars) => {
            const now = new Date()
            return (now.getTime() / 1000).toFixed(0)
        },
        alias: [],
        description: 'Returns the current unix timestamp in seconds as a string. Useful for time-based calculations and logging.\n\nUsage:: {{unixtime}}',
    });

    registerFunction({
        name: 'time',
        callback: (str, matcherArg, args, vars) => {
            const now = new Date()
            return `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`
        },
        alias: [],
        description: 'Returns the current local time in HH:MM:SS format. Updates in real-time when the function is called.\n\nUsage:: {{time}}',
    });

    registerFunction({
        name: 'isotime',
        callback: (str, matcherArg, args, vars) => {
            const now = new Date()
            return `${now.getUTCHours()}:${now.getUTCMinutes()}:${now.getUTCSeconds()}`
        },
        alias: [],
        description: 'Returns the current UTC time in HH:MM:SS format. Useful for timezone-independent time references.\n\nUsage:: {{isotime}}',
    });

    registerFunction({
        name: 'isodate',
        callback: (str, matcherArg, args, vars) => {
            const now = new Date()
            return `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}`
        },
        alias: [],
        description: 'Returns the current UTC date in YYYY-MM-DD format (month not zero-padded). Useful for timezone-independent date references.\n\nUsage:: {{isodate}}',
    });

    // Continue with remaining utility functions
    registerFunction({
        name: 'messageidleduration',
        callback: (str, matcherArg, args, vars) => {
            if(matcherArg.tokenizeAccurate){
                return `00:00:00`
            }
            if(matcherArg.chatID === -1){
                return "[Cannot get time]"
            }
            const db = getDatabase()
            const selchar = db.characters[getSelectedCharID()]
            const chat = selchar.chats[selchar.chatPage]
            
            let pointer = matcherArg.chatID
            let pointerMode: 'findLast'|'findSecondLast' = 'findLast'
            let message:any
            let previous_message:any
            while(pointer >= 0){
                if(chat.message[pointer].role === 'user'){
                    if(pointerMode === 'findLast'){
                        message = chat.message[pointer]
                        pointerMode = 'findSecondLast'
                    }
                    else{
                        previous_message = chat.message[pointer]
                        break
                    }
                }
                pointer--
            }

            if(!message){
                return '[No user message found]'
            }

            if(!previous_message){
                return '[No previous user message found]'
            }
            if(!message.time){
                return "[Cannot get time, message was sent in older version]"
            }
            if(!previous_message.time){
                return "[Cannot get time, previous message was sent in older version]"
            }

            let duration = message.time - previous_message.time
            let seconds = Math.floor(duration / 1000)
            let minutes = Math.floor(seconds / 60)
            let hours = Math.floor(minutes / 60)
            seconds = seconds % 60
            minutes = minutes % 60
            return hours.toString() + ':' + minutes.toString().padStart(2,'0') + ':' + seconds.toString().padStart(2,'0')
        },
        alias: ['message_idle_duration'],
        description: 'Returns time duration between the current and previous user messages in HH:MM:SS format. Requires valid message times. Returns error messages if no messages found or timestamps missing.\n\nUsage:: {{messageidleduration}}',
    });

    registerFunction({
        name: 'idleduration',
        callback: (str, matcherArg, args, vars) => {
            if(matcherArg.tokenizeAccurate){
                return `00:00:00`
            }
            const db = getDatabase()
            const selchar = db.characters[getSelectedCharID()]
            const chat = selchar.chats[selchar.chatPage]
            const messages = chat.message
            if(messages.length === 0){
                return `00:00:00`
            }

            const lastMessage = messages[messages.length - 1]

            if(!lastMessage.time){
                return "[Cannot get time, message was sent in older version]"
            }

            const now = new Date()

            let duration = now.getTime() - lastMessage.time

            let seconds = Math.floor(duration / 1000)
            let minutes = Math.floor(seconds / 60)
            let hours = Math.floor(minutes / 60)

            seconds = seconds % 60
            minutes = minutes % 60
            
            return hours.toString() + ':' + minutes.toString().padStart(2,'0') + ':' + seconds.toString().padStart(2,'0')
        },
        alias: ['idle_duration'],
        description: 'Returns time duration since the last message in the chat in HH:MM:SS format. Calculates from current time to last message timestamp. Returns "00:00:00" in tokenization mode or error for missing timestamps.\n\nUsage:: {{idleduration}}',
    });

    registerFunction({
        name: 'br',
        callback: (str, matcherArg, args, vars) => {
            return '\n'
        },
        alias: ['newline'],
        description: 'Returns a literal newline character (\\n). Useful for formatting text with line breaks in templates.\n\nUsage:: {{br}}',
    });

    registerFunction({
        name: 'model',
        callback: (str, matcherArg, args, vars) => {
            const db = getDatabase()
            return db.aiModel
        },
        alias: [],
        description: 'Returns the ID/name of the currently selected AI model (e.g., "gpt-4", "claude-3-opus").\n\nUsage:: {{model}}',
    });

    registerFunction({
        name: 'axmodel',
        callback: (str, matcherArg, args, vars) => {
            const db = getDatabase()
            return db.subModel
        },
        alias: [],
        description: 'Returns the currently selected sub/auxiliary model ID. Used for specialized tasks like embedding or secondary processing.\n\nUsage:: {{axmodel}}',
    });

    registerFunction({
        name: 'role',
        callback: (str, matcherArg, args, vars) => {
            if(matcherArg.cbsConditions.chatRole){
                return matcherArg.cbsConditions.chatRole
            }
            if(matcherArg.cbsConditions.firstmsg){
                return 'char'
            }
            if (matcherArg.chatID !== -1) {
                const db = getDatabase()
                const selchar = db.characters[getSelectedCharID()]
                return selchar.chats[selchar.chatPage].message[matcherArg.chatID].role;
            }
            return matcherArg.role ?? 'null'
        },
        alias: [],
        description: 'Returns the role of the current message ("user", "char", "system"). Uses chatRole from conditions if available, "char" for first messages, or actual message role.\n\nUsage:: {{role}}',
    });

    registerFunction({
        name: 'isfirstmsg',
        callback: (str, matcherArg, args, vars) => {
            if(matcherArg.cbsConditions.firstmsg){
                return '1'
            }
            return '0'
        },
        alias: ['isfirstmsg', 'isfirstmessage'],
        description: 'Returns "1" if the current context is the first message/greeting, "0" otherwise. Checks the firstmsg condition flag.\n\nUsage:: {{isfirstmsg}}',
    });

    registerFunction({
        name: 'jbtoggled',
        callback: (str, matcherArg, args, vars) => {
            const db = getDatabase()
            return db.jailbreakToggle ? '1' : '0'
        },
        alias: [],
        description: 'Returns "1" if the jailbreak prompt is currently enabled/toggled on, "0" if disabled. Reflects the global jailbreak toggle state.\n\nUsage:: {{jbtoggled}}',
    });

    registerFunction({
        name: 'maxcontext',
        callback: (str, matcherArg, args, vars) => {
            const db = getDatabase()
            return db.maxContext.toString()
        },
        alias: [],
        description: 'Returns the maximum context length setting as a string (e.g., "4096", "8192"). This is the token limit for the current model configuration.\n\nUsage:: {{maxcontext}}',
    });

    registerFunction({
        name: 'lastmessage',
        callback: (str, matcherArg, args, vars) => {
            const db = getDatabase()
            const selchar = db.characters[getSelectedCharID()]
            if(!selchar){
                return ''
            }
            const chat = selchar.chats[selchar.chatPage]
            return chat.message[chat.message.length - 1].data
        },
        alias: [],
        description: 'Returns the content/data of the last message in the current chat, regardless of role (user/char). Returns empty string if no character selected.\n\nUsage:: {{lastmessage}}',
    });

    registerFunction({
        name: 'lastmessageid',
        callback: (str, matcherArg, args, vars) => {
            const db = getDatabase()
            const selchar = db.characters[getSelectedCharID()]
            if(!selchar){
                return ''
            }
            const chat = selchar.chats[selchar.chatPage]
            return (chat.message.length - 1).toString()
        },
        alias: ['lastmessageindex'],
        description: 'Returns the index of the last message in the chat as a string (0-based indexing). Returns empty string if no character selected.\n\nUsage:: {{lastmessageid}}',
    });

    // Variable handling functions
    registerFunction({
        name: 'tempvar',
        callback: (str, matcherArg, args, vars) => {
            return {
                text: vars[args[0]] ?? '',
                var: vars
            }
        },
        alias: ['gettempvar'],
        description: 'Gets the value of a temporary variable by name. Temporary variables only exist during the current script execution. Returns empty string if variable doesn\'t exist.\n\nUsage:: {{tempvar::variableName}}',
    });

    registerFunction({
        name: 'settempvar',
        callback: (str, matcherArg, args, vars) => {
            vars[args[0]] = args[1]
            return {
                text: '',
                var: vars
            }
        },
        alias: [],
        description: 'Sets a temporary variable to the specified value. Temporary variables only exist during current script execution. Always returns empty string.\n\nUsage:: {{settempvar::variableName::value}}',
    });

    registerFunction({
        name: 'return',
        callback: (str, matcherArg, args, vars) => {
            vars['__return__'] = args[0]
            vars['__force_return__'] = '1'
            return {
                text: '',
                var: vars
            }
        },
        alias: [],
        description: 'Sets the return value and immediately exits script execution. Used to return values from script functions. Sets internal __return__ and __force_return__ variables.\n\nUsage:: {{return::value}}',
    });

    registerFunction({
        name: 'getvar',
        callback: (str, matcherArg, args, vars) => {
            return getChatVar(args[0])
        },
        alias: [],
        description: 'Gets the value of a persistent chat variable by name. Chat variables are saved with the chat and persist between sessions. Returns empty string if variable doesn\'t exist.\n\nUsage:: {{getvar::variableName}}',
    });

    registerFunction({
        name: 'calc',
        callback: (str, matcherArg, args, vars) => {
            return calcString(args[0]).toString()
        },
        alias: [],
        description: 'Evaluates a mathematical expression and returns the result as a string. Supports basic arithmetic operations (+, -, *, /, parentheses).\n\nUsage:: {{calc::2+2*3}}',
    });

    registerFunction({
        name: 'addvar',
        callback: (str, matcherArg, args, vars) => {
            if(matcherArg.rmVar){
                return ''
            }
            if(matcherArg.runVar){
                setChatVar(args[0], (Number(getChatVar(args[0])) + Number(args[1])).toString())
                return ''
            }
            return null
        },
        alias: [],
        description: 'Adds a numeric value to an existing chat variable. Treats the variable as a number, adds the specified amount, and saves the result. Only executes when runVar is true.\n\nUsage:: {{addvar::counter::5}}',
    });

    registerFunction({
        name: 'setvar',
        callback: (str, matcherArg, args, vars) => {
            if(matcherArg.rmVar){
                return ''
            }
            if(matcherArg.runVar){
                setChatVar(args[0], args[1])
                return ''
            }
            return null
        },
        alias: [],
        description: 'Sets a persistent chat variable to the specified value. Chat variables are saved with the chat and persist between sessions. Only executes when runVar is true.\n\nUsage:: {{setvar::variableName::value}}',
    });

    registerFunction({
        name: 'setdefaultvar',
        callback: (str, matcherArg, args, vars) => {
            if(matcherArg.rmVar){
                return ''
            }
            if(matcherArg.runVar){
                if(!getChatVar(args[0])){
                    setChatVar(args[0], args[1])
                }
                return ''
            }
            return null
        },
        alias: [],
        description: 'Sets a chat variable to the specified value only if the variable doesn\'t already exist or is empty. Used for setting default values. Only executes when runVar is true.\n\nUsage:: {{setdefaultvar::variableName::defaultValue}}',
    });

    registerFunction({
        name: 'getglobalvar',
        callback: (str, matcherArg, args, vars) => {
            return getGlobalChatVar(args[0])
        },
        alias: [],
        description: 'Gets the value of a global chat variable by name. Global variables are shared across all chats and characters. Returns empty string if variable doesn\'t exist.\n\nUsage:: {{getglobalvar::variableName}}',
    });

    registerFunction({
        name: 'button',
        callback: (str, matcherArg, args, vars) => {
            return `<button class="button-default" risu-trigger="${args[1]}">${args[0]}</button>`
        },
        alias: [],
        description: 'Creates an HTML button element with specified text and trigger action. When clicked, executes the trigger command. Returns HTML button markup.\n\nUsage:: {{button::Click Me::trigger_command}}',
    });

    registerFunction({
        name: 'risu',
        callback: (str, matcherArg, args, vars) => {
            const size = args[0] || '45'
            return `<img src="/logo2.png" style="height:${size}px;width:${size}px" />`
        },
        alias: [],
        description: 'Displays the Risuai logo image with specified size in pixels. Default size is 45px if no argument provided. Returns HTML img element.\n\nUsage:: {{risu}} or {{risu::60}}',
    });

    // Comparison functions
    registerFunction({
        name: 'equal',
        callback: (str, matcherArg, args, vars) => {
            return (args[0] === args[1]) ? '1' : '0'
        },
        alias: [],
        description: 'Compares two values for exact equality. Returns "1" if values are identical (string comparison), "0" otherwise. Case-sensitive.\n\nUsage:: {{equal::value1::value2}}',
    });

    registerFunction({
        name: 'notequal',
        callback: (str, matcherArg, args, vars) => {
            return (args[0] !== args[1]) ? '1' : '0'
        },
        alias: ['not_equal'],
        description: 'Compares two values for inequality. Returns "1" if values are different (string comparison), "0" if identical. Case-sensitive.\n\nUsage:: {{notequal::value1::value2}}',
    });

    registerFunction({
        name: 'greater',
        callback: (str, matcherArg, args, vars) => {
            return (Number(args[0]) > Number(args[1])) ? '1' : '0'
        },
        alias: [],
        description: 'Compares two numeric values. Returns "1" if first number is greater than second, "0" otherwise. Converts arguments to numbers before comparison.\n\nUsage:: {{greater::10::5}}',
    });

    registerFunction({
        name: 'less',
        callback: (str, matcherArg, args, vars) => {
            return (Number(args[0]) < Number(args[1])) ? '1' : '0'
        },
        alias: [],
        description: 'Compares two numeric values. Returns "1" if first number is less than second, "0" otherwise. Converts arguments to numbers before comparison.\n\nUsage:: {{less::5::10}}',
    });

    registerFunction({
        name: 'greaterequal',
        callback: (str, matcherArg, args, vars) => {
            return (Number(args[0]) >= Number(args[1])) ? '1' : '0'
        },
        alias: ['greater_equal'],
        description: 'Compares two numeric values. Returns "1" if first number is greater than or equal to second, "0" otherwise. Converts arguments to numbers before comparison.\n\nUsage:: {{greaterequal::10::10}}',
    });

    registerFunction({
        name: 'lessequal',
        callback: (str, matcherArg, args, vars) => {
            return (Number(args[0]) <= Number(args[1])) ? '1' : '0'
        },
        alias: ['less_equal'],
        description: 'Compares two numeric values. Returns "1" if first number is less than or equal to second, "0" otherwise. Converts arguments to numbers before comparison.\n\nUsage:: {{lessequal::5::5}}',
    });

    registerFunction({
        name: 'and',
        callback: (str, matcherArg, args, vars) => {
            return args[0] === '1' && args[1] === '1' ? '1' : '0'
        },
        alias: [],
        description: 'Performs logical AND on two boolean values. Returns "1" only if both arguments are "1", otherwise returns "0". Treats any value other than "1" as false.\n\nUsage:: {{and::1::1}}',
    });

    registerFunction({
        name: 'or',
        callback: (str, matcherArg, args, vars) => {
            return args[0] === '1' || args[1] === '1' ? '1' : '0'
        },
        alias: [],
        description: 'Performs logical OR on two boolean values. Returns "1" if either argument is "1", otherwise returns "0". Treats any value other than "1" as false.\n\nUsage:: {{or::1::0}}',
    });

    registerFunction({
        name: 'not',
        callback: (str, matcherArg, args, vars) => {
            return args[0] === '1' ? '0' : '1'
        },
        alias: [],
        description: 'Performs logical NOT on a boolean value. Returns "0" if argument is "1", returns "1" for any other value. Inverts the boolean state.\n\nUsage:: {{not::1}}',
    });

    registerFunction({
        name: 'file',
        callback: (str, matcherArg, args, vars) => {
            if(matcherArg.displaying){
                return `<br><div class="risu-file">${args[0]}</div><br>`
            }
            return Buffer.from(args[1], 'base64').toString('utf-8')
        },
        alias: [],
        description: 'Handles file display or decoding. In display mode, shows filename in a formatted div. Otherwise, decodes base64 content to UTF-8 text.\n\nUsage:: {{file::filename::base64content}}',
    });

    // String manipulation functions
    registerFunction({
        name: 'startswith',
        callback: (str, matcherArg, args, vars) => {
            return args[0].startsWith(args[1]) ? '1' : '0'
        },
        alias: [],
        description: 'Checks if a string starts with a specific substring. Returns "1" if the string begins with the substring, "0" otherwise. Case-sensitive.\n\nUsage:: {{startswith::Hello World::Hello}}',
    });

    registerFunction({
        name: 'endswith',
        callback: (str, matcherArg, args, vars) => {
            return args[0].endsWith(args[1]) ? '1' : '0'
        },
        alias: [],
        description: 'Checks if a string ends with a specific substring. Returns "1" if the string ends with the substring, "0" otherwise. Case-sensitive.\n\nUsage:: {{endswith::Hello World::World}}',
    });

    registerFunction({
        name: 'contains',
        callback: (str, matcherArg, args, vars) => {
            return args[0].includes(args[1]) ? '1' : '0'
        },
        alias: [],
        description: 'Checks if a string contains a specific substring anywhere within it. Returns "1" if found, "0" otherwise. Case-sensitive.\n\nUsage:: {{contains::Hello World::lo Wo}}',
    });

    registerFunction({
        name: 'replace',
        callback: (str, matcherArg, args, vars) => {
            return args[0].replaceAll(args[1], args[2])
        },
        alias: [],
        description: 'Replaces all occurrences of a substring with a new string. Global replacement - changes every instance found. Case-sensitive.\n\nUsage:: {{replace::Hello World::o::0}} → Hell0 W0rld',
    });

    registerFunction({
        name: 'split',
        callback: (str, matcherArg, args, vars) => {
            return makeArray(args[0].split(args[1]))
        },
        alias: [],
        description: 'Splits a string into an array using the specified delimiter. Returns a JSON array of string parts.\n\nUsage:: {{split::apple,banana,cherry::,}} → ["apple","banana","cherry"]',
    });

    registerFunction({
        name: 'join',
        callback: (str, matcherArg, args, vars) => {
            return (parseArray(args[0])).join(args[1])
        },
        alias: [],
        description: 'Joins array elements into a single string using the specified separator. Takes a JSON array and delimiter.\n\nUsage:: {{join::["apple","banana"]::, }} → apple, banana',
    });

    registerFunction({
        name: 'spread',
        callback: (str, matcherArg, args, vars) => {
            return (parseArray(args[0])).join('::')
        },
        alias: [],
        description: 'Joins array elements into a single string using "::" as separator. Specialized version of join for CBS array spreading.\n\nUsage:: {{spread::["a","b","c"]}} → a::b::c',
    });

    registerFunction({
        name: 'trim',
        callback: (str, matcherArg, args, vars) => {
            return args[0].trim()
        },
        alias: [],
        description: 'Removes leading and trailing whitespace from a string. Does not affect whitespace in the middle of the string.\n\nUsage:: {{trim::  hello world  }} → hello world',
    });

    registerFunction({
        name: 'length',
        callback: (str, matcherArg, args, vars) => {
            return args[0].length.toString()
        },
        alias: [],
        description: 'Returns the character length of a string as a number. Counts all characters including spaces and special characters.\n\nUsage:: {{length::Hello}} → 5',
    });

    // Array/Object manipulation functions
    registerFunction({
        name: 'arraylength',
        callback: (str, matcherArg, args, vars) => {
            return parseArray(args[0]).length.toString()
        },
        alias: ['arraylength'],
        description: 'Returns the number of elements in a JSON array as a string. Parses the array and counts elements.\n\nUsage:: {{arraylength::["a","b","c"]}} → 3',
    });

    registerFunction({
        name: 'lower',
        callback: (str, matcherArg, args, vars) => {
            return args[0].toLocaleLowerCase()
        },
        alias: [],
        description: 'Converts all characters in a string to lowercase using locale-aware conversion. Handles international characters properly.\n\nUsage:: {{lower::Hello WORLD}} → hello world',
    });

    registerFunction({
        name: 'upper',
        callback: (str, matcherArg, args, vars) => {
            return args[0].toLocaleUpperCase()
        },
        alias: [],
        description: 'Converts all characters in a string to uppercase using locale-aware conversion. Handles international characters properly.\n\nUsage:: {{upper::Hello world}} → HELLO WORLD',
    });

    registerFunction({
        name: 'capitalize',
        callback: (str, matcherArg, args, vars) => {
            return args[0].charAt(0).toUpperCase() + args[0].slice(1)
        },
        alias: [],
        description: 'Capitalizes only the first character of a string, leaving the rest unchanged. Useful for sentence-case formatting.\n\nUsage:: {{capitalize::hello world}} → Hello world',
    });

    registerFunction({
        name: 'round',
        callback: (str, matcherArg, args, vars) => {
            return Math.round(Number(args[0])).toString()
        },
        alias: [],
        description: 'Rounds a decimal number to the nearest integer using standard rounding rules (0.5 rounds up). Returns result as string.\n\nUsage:: {{round::3.7}} → 4',
    });

    registerFunction({
        name: 'floor',
        callback: (str, matcherArg, args, vars) => {
            return Math.floor(Number(args[0])).toString()
        },
        alias: [],
        description: 'Rounds a decimal number down to the nearest integer (floor function). Always rounds towards negative infinity.\n\nUsage:: {{floor::3.9}} → 3',
    });

    registerFunction({
        name: 'ceil',
        callback: (str, matcherArg, args, vars) => {
            return Math.ceil(Number(args[0])).toString()
        },
        alias: [],
        description: 'Rounds a decimal number up to the nearest integer (ceiling function). Always rounds towards positive infinity.\n\nUsage:: {{ceil::3.1}} → 4',
    });

    registerFunction({
        name: 'abs',
        callback: (str, matcherArg, args, vars) => {
            return Math.abs(Number(args[0])).toString()
        },
        alias: [],
        description: 'Returns the absolute value of a number (removes negative sign). Converts to positive value regardless of input sign.\n\nUsage:: {{abs::-5}} → 5',
    });

    registerFunction({
        name: 'remaind',
        callback: (str, matcherArg, args, vars) => {
            return (Number(args[0]) % Number(args[1])).toString()
        },
        alias: [],
        description: 'Returns the remainder after dividing first number by second (modulo operation). Useful for cycles and ranges.\n\nUsage:: {{remaind::10::3}} → 1',
    });

    registerFunction({
        name: 'previouschatlog',
        callback: (str, matcherArg, args, vars) => {
            const db = getDatabase()
            const selchar = db.characters[getSelectedCharID()]
            const chat = selchar?.chats?.[selchar.chatPage]
            return chat?.message[Number(args[0])]?.data ?? 'Out of range'
        },
        alias: ['previous_chat_log'],
        description: 'Retrieves the message content at the specified index in the chat history. Returns "Out of range" if index is invalid.\n\nUsage:: {{previouschatlog::5}}',
    });

    registerFunction({
        name: 'tonumber',
        callback: (str, matcherArg, args, vars) => {
            return (args[0].split('').filter((v) => {
                return !isNaN(Number(v)) || v === '.'
            })).join('')
        },
        alias: [],
        description: 'Extracts only numeric characters (0-9) and decimal points from a string, removing all other characters.\n\nUsage:: {{tonumber::abc123.45def}} → 123.45',
    });

    registerFunction({
        name: 'pow',
        callback: (str, matcherArg, args, vars) => {
            return Math.pow(Number(args[0]), Number(args[1])).toString()
        },
        alias: [],
        description: 'Calculates the power of a number (base raised to exponent). Performs mathematical exponentiation.\n\nUsage:: {{pow::2::3}} → 8 (2³)',
    });

    registerFunction({
        name: 'arrayelement',
        callback: (str, matcherArg, args, vars) => {
            return parseArray(args[0]).at(Number(args[1])) ?? 'null'
        },
        alias: ['arrayelement'],
        description: 'Retrieves the element at the specified index from a JSON array. Uses 0-based indexing. Returns "null" if index is out of bounds.\n\nUsage:: {{arrayelement::["a","b","c"]::1}} → b',
    });

    registerFunction({
        name: 'dictelement',
        callback: (str, matcherArg, args, vars) => {
            return parseDict(args[0])[args[1]] ?? 'null'
        },
        alias: ['dictelement', 'objectelement'],
        description: 'Retrieves the value associated with a key from a JSON object/dictionary. Returns "null" if key doesn\'t exist.\n\nUsage:: {{dictelement::{"name":"John"}::name}} → John',
    });

    registerFunction({
        name: 'objectassert',
        callback: (str, matcherArg, args, vars) => {
            const dict = parseDict(args[0])
            if(!dict[args[1]]){
                dict[args[1]] = args[2]
            }
            return JSON.stringify(dict)
        },
        alias: ['dictassert', 'object_assert'],
        description: 'Sets a property in a JSON object only if the property doesn\'t already exist. Returns the modified object as JSON. Used for default values.\n\nUsage:: {{objectassert::{"a":1}::b::2}} → {"a":1,"b":2}',
    });

    registerFunction({
        name: 'element',
        callback: (str, matcherArg, args, vars) => {
            try {
                const agmts = args.slice(1)
                let current = args[0]
                for(const arg of agmts){
                    const parsed = JSON.parse(current)
                    if(parsed === null || (typeof(parsed) !== 'object' && !Array.isArray(parsed))){
                        return 'null'
                    }
                    current = parsed[arg]
                    if(!current){
                        return 'null'
                    }
                }
                return current
            } catch (error) {
                return 'null'
            }
        },
        alias: ['ele'],
        description: 'Retrieves a deeply nested element from a JSON structure using multiple keys/indices. Traverses the object path step by step. Returns "null" if any step fails.\n\nUsage:: {{element::{"user":{"name":"John"}}::user::name}} → John',
    });

    registerFunction({
        name: 'arrayshift',
        callback: (str, matcherArg, args, vars) => {
            const arr = parseArray(args[0])
            arr.shift()
            return makeArray(arr)
        },
        alias: ['arrayshift'],
        description: 'Removes and discards the first element from a JSON array. Returns the modified array without the first element.\n\nUsage:: {{arrayshift::["a","b","c"]}} → ["b","c"]',
    });

    registerFunction({
        name: 'arraypop',
        callback: (str, matcherArg, args, vars) => {
            const arr = parseArray(args[0])
            arr.pop()
            return makeArray(arr)
        },
        alias: ['arraypop'],
        description: 'Removes and discards the last element from a JSON array. Returns the modified array without the last element.\n\nUsage:: {{arraypop::["a","b","c"]}} → ["a","b"]',
    });

    registerFunction({
        name: 'arraypush',
        callback: (str, matcherArg, args, vars) => {
            const arr = parseArray(args[0])
            arr.push(args[1])
            return makeArray(arr)
        },
        alias: ['arraypush'],
        description: 'Adds a new element to the end of a JSON array. Returns the modified array with the new element appended.\n\nUsage:: {{arraypush::["a","b"]::c}} → ["a","b","c"]',
    });

    registerFunction({
        name: 'arraysplice',
        callback: (str, matcherArg, args, vars) => {
            const arr = parseArray(args[0])
            arr.splice(Number(args[1]), Number(args[2]), args[3])
            return makeArray(arr)
        },
        alias: ['arraysplice'],
        description: 'Modifies an array by removing elements and optionally inserting new ones at a specific index. Parameters: array, startIndex, deleteCount, newElement.\n\nUsage:: {{arraysplice::["a","b","c"]::1::1::x}} → ["a","x","c"]',
    });

    registerFunction({
        name: 'arrayassert',
        callback: (str, matcherArg, args, vars) => {
            const arr = parseArray(args[0])
            const index = Number(args[1])
            if(index >= arr.length){
                arr[index] = args[2]
            }
            return makeArray(arr)
        },
        alias: ['arrayassert'],
        description: 'Sets an array element at the specified index only if the index is currently out of bounds (extends array). Fills gaps with undefined.\n\nUsage:: {{arrayassert::["a"]::5::b}} → array with element "b" at index 5',
    });

    registerFunction({
        name: 'makearray',
        callback: (str, matcherArg, args, vars) => {
            return makeArray(args)
        },
        alias: ['array', 'a', 'makearray'],
        description: 'Creates a JSON array from the provided arguments. Each argument becomes an array element. Variable number of arguments supported.\n\nUsage:: {{makearray::a::b::c}} → ["a","b","c"]',
    });

    registerFunction({
        name: 'makedict',
        callback: (str, matcherArg, args, vars) => {
            let out = {}
            for(let i=0;i<args.length;i++){
                const current = args[i]
                const firstEqual = current.indexOf('=')
                if(firstEqual === -1){
                    continue
                }
                const key = current.substring(0, firstEqual)
                const value = current.substring(firstEqual + 1)
                out[key] = value ?? 'null'
            }
            return JSON.stringify(out)
        },
        alias: ['dict', 'd', 'makedict', 'makeobject', 'object', 'o'],
        description: 'Creates a JSON object from key=value pair arguments. Each argument should be in "key=value" format. Invalid pairs are ignored.\n\nUsage:: {{makedict::name=John::age=25}} → {"name":"John","age":"25"}',
    });

    // Missing basic functions (no arguments)
    registerFunction({
        name: 'emotionlist',
        callback: (str, matcherArg, args, vars) => {
            const db = getDatabase()
            const selchar = db.characters[getSelectedCharID()]
            if(!selchar){
                return ''
            }
            return makeArray(selchar.emotionImages?.map((f) => {
                return f[0]
            })) ?? ''
        },
        alias: [],
        description: 'Returns a JSON array of emotion image names available for the current character. Only includes the names, not the actual image data. Returns empty string if no character or no emotions.\n\nUsage:: {{emotionlist}}',
    });

    registerFunction({
        name: 'assetlist',
        callback: (str, matcherArg, args, vars) => {
            const db = getDatabase()
            const selchar = db.characters[getSelectedCharID()]
            if(!selchar || selchar.type === 'group'){
                return ''
            }
            return makeArray(selchar.additionalAssets?.map((f) => {
                return f[0]
            }))
        },
        alias: [],
        description: 'Returns a JSON array of additional asset names for the current character. These are extra images/files beyond the main avatar. Returns empty string for groups or characters without assets.\n\nUsage:: {{assetlist}}',
    });

    registerFunction({
        name: 'prefillsupported',
        callback: (str, matcherArg, args, vars) => {
            const db = getDatabase()
            return db.aiModel.startsWith('claude') ? '1' : '0'
        },
        alias: ['prefill_supported', 'prefill'],
        description: 'Returns "1" if the current AI model supports prefill functionality (like Claude models), "0" otherwise. Prefill allows pre-filling the assistant\'s response start.\n\nUsage:: {{prefillsupported}}',
    });

    registerFunction({
        name: 'screenwidth',
        callback: (str, matcherArg, args, vars) => {
            return window.innerWidth.toString()
        },
        alias: ['screen_width'],
        description: 'Returns the current screen/viewport width in pixels as a string. Updates dynamically with window resizing. Useful for responsive layouts.\n\nUsage:: {{screenwidth}}',
    });

    registerFunction({
        name: 'screenheight',
        callback: (str, matcherArg, args, vars) => {
            return window.innerHeight.toString()
        },
        alias: ['screen_height'],
        description: 'Returns the current screen/viewport height in pixels as a string. Updates dynamically with window resizing. Useful for responsive layouts.\n\nUsage:: {{screenheight}}',
    });

    registerFunction({
        name: 'cbr',
        callback: (str, matcherArg, args, vars) => {

            if(args.length > 0){
                return str.repeat(Number(args[0]) < 1 ? 1 : Number(args[0]))
            }
            return '\\n'
        },
        alias: ['cnl', 'cnewline'],
        description: 'Returns an escaped newline character (\\\\n). With optional numeric argument, repeats the character that many times (minimum 1).\n\nUsage:: {{cbr}} or {{cbr::3}}',
    });

    registerFunction({
        name: 'decbo',
        callback: (str, matcherArg, args, vars) => {
            return '\uE9b8'
        },
        alias: ['displayescapedcurlybracketopen'],
        description: 'Returns a special Unicode character that displays as an opening curly bracket { but won\'t be parsed as CBS syntax. Used to display literal braces in output.\n\nUsage:: {{decbo}}',
    });

    registerFunction({
        name: 'decbc',
        callback: (str, matcherArg, args, vars) => {
            return '\uE9b9'
        },
        alias: ['displayescapedcurlybracketclose'],
        description: 'Returns a special Unicode character that displays as a closing curly bracket } but won\'t be parsed as CBS syntax. Used to display literal braces in output.\n\nUsage:: {{decbc}}',
    });

    registerFunction({
        name: 'bo',
        callback: (str, matcherArg, args, vars) => {
            return '\uE9b8\uE9b8'
        },
        alias: ['ddecbo', 'doubledisplayescapedcurlybracketopen'],
        description: 'Returns two special Unicode characters that display as opening double curly brackets {{ but won\'t be parsed as CBS syntax. Used to display literal CBS syntax.\n\nUsage:: {{bo}}',
    });

    registerFunction({
        name: 'bc',
        callback: (str, matcherArg, args, vars) => {
            return '\uE9b9\uE9b9'
        },
        alias: ['ddecbc', 'doubledisplayescapedcurlybracketclose'],
        description: 'Returns two special Unicode characters that display as closing double curly brackets }} but won\'t be parsed as CBS syntax. Used to display literal CBS syntax.\n\nUsage:: {{bc}}',
    });

    registerFunction({
        name: 'displayescapedbracketopen',
        callback: (str, matcherArg, args, vars) => {
            return '\uE9BA'
        },
        alias: ['debo', '('],
        description: 'Returns a special Unicode character that displays as an opening parenthesis ( but won\'t interfere with parsing. Used for literal parentheses in output.\n\nUsage:: {{displayescapedbracketopen}}',
    });

    registerFunction({
        name: 'displayescapedbracketclose',
        callback: (str, matcherArg, args, vars) => {
            return '\uE9BB'
        },
        alias: ['debc', ')'],
        description: 'Returns a special Unicode character that displays as a closing parenthesis ) but won\'t interfere with parsing. Used for literal parentheses in output.\n\nUsage:: {{displayescapedbracketclose}}',
    });

    registerFunction({
        name: 'displayescapedanglebracketopen',
        callback: (str, matcherArg, args, vars) => {
            return '\uE9BC'
        },
        alias: ['deabo', '<'],
        description: 'Returns a special Unicode character that displays as an opening angle bracket < but won\'t interfere with HTML parsing. Used for literal angle brackets.\n\nUsage:: {{displayescapedanglebracketopen}}',
    });

    registerFunction({
        name: 'displayescapedanglebracketclose',
        callback: (str, matcherArg, args, vars) => {
            return '\uE9BD'
        },
        alias: ['deabc', '>'],
        description: 'Returns a special Unicode character that displays as a closing angle bracket > but won\'t interfere with HTML parsing. Used for literal angle brackets.\n\nUsage:: {{displayescapedanglebracketclose}}',
    });

    registerFunction({
        name: 'displayescapedcolon',
        callback: (str, matcherArg, args, vars) => {
            return '\uE9BE'
        },
        alias: ['dec', ':'],
        description: 'Returns a special Unicode character that displays as a colon : but won\'t be parsed as CBS argument separator. Used for literal colons in output.\n\nUsage:: {{displayescapedcolon}}',
    });

    registerFunction({
        name: 'displayescapedsemicolon',
        callback: (str, matcherArg, args, vars) => {
            return '\uE9BF'
        },
        alias: [';'],
        description: 'Returns a special Unicode character that displays as a semicolon ; but won\'t interfere with parsing. Used for literal semicolons in output.\n\nUsage:: {{displayescapedsemicolon}}',
    });

    registerFunction({
        name: 'chardisplayasset',
        callback: (str, matcherArg, args, vars) => {
            const db = getDatabase()
            const selchar = db.characters[getSelectedCharID()]

            if(!selchar.prebuiltAssetCommand){
                return makeArray([])
            }

            const excludes = selchar.prebuiltAssetExclude ?? []
            const arr = (selchar?.additionalAssets ?? []).filter((f) => {
                return !excludes.includes(f[1])
            })

            return makeArray(arr.map((f) => {
                return f[0]
            }))
        },
        alias: [],
        description: 'Returns a JSON array of character display asset names, filtered by prebuilt asset exclusion settings. Only includes assets not in the exclude list.\n\nUsage:: {{chardisplayasset}}',
    });

    // Missing functions with :: arguments
    registerFunction({
        name: 'history',
        callback: (str, matcherArg, args, vars) => {

            if(args.length === 0){
                const db = getDatabase()
                const selchar = db.characters[getSelectedCharID()]
                const chat = selchar.chats[selchar.chatPage]
                return makeArray([{
                    role: 'char',
                    data: chat.fmIndex === -1 ? selchar.firstMessage : selchar.alternateGreetings[chat.fmIndex]
                }].concat(chat.message).map((v) => {
                    v = safeStructuredClone(v)
                    v.data = risuChatParser(v.data, matcherArg)
                    return JSON.stringify(v)
                }))
            }
            const db = getDatabase()
            const selchar = db.characters[getSelectedCharID()]
            const chat = selchar.chats[selchar.chatPage]
            return makeArray(chat.message.map((f) => {
                let data = ''
                if(args.includes('role')){
                    data += f.role + ': '
                }
                data += f.data
                return data
            }))
        },
        alias: ['messages'],
        description: 'Returns chat history as a JSON array. With no arguments, returns full message objects. With "role" argument, prefixes each message with "role: ". Includes first message/greeting.\n\nUsage:: {{history}} or {{history::role}}',
    });

    registerFunction({
        name: 'range',
        callback: (str, matcherArg, args, vars) => {
            const arr = parseArray(args[0])
            const start = arr.length > 1 ? Number(arr[0]) : 0
            const end = arr.length > 1 ? Number(arr[1]) : Number(arr[0])
            const step = arr.length > 2 ? Number(arr[2]) : 1
            let out:string[] = []

            for(let i=start;i<end;i+=step){
                out.push(i.toString())
            }
            
            return makeArray(out)
        },
        alias: [],
        description: 'Creates a JSON array of sequential numbers. Single argument: 0 to N-1. Two arguments: start to end-1. Three arguments: start to end-1 with step.\n\nUsage:: {{range::[5]}} → [0,1,2,3,4] or {{range::[2,8,2]}} → [2,4,6]',
    });

    registerFunction({
        name: 'date',
        callback: (str, matcherArg, args, vars) => {

            if(args.length === 0){
                const now = new Date()
                return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`
            }
            const secondParam = args[1]
            let t = 0
            if(secondParam){
                t = (Number(secondParam) / 1000)
                if(isNaN(t)){
                    t = 0
                }
            }
            return dateTimeFormat(args[0], t)
        },
        alias: ['datetimeformat'],
        description: 'Formats date/time using custom format string. No arguments returns YYYY-M-D. First argument is format string, optional second argument is unix timestamp.\n\nUsage:: {{date::YYYY-MM-DD}} or {{date::HH:mm:ss::1640995200000}}',
    });

    registerFunction({
        name: 'time',
        callback: (str, matcherArg, args, vars) => {

            if(args.length === 0){
                const now = new Date()
                return `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`
            }
            const secondParam = args[1]
            let t = 0
            if(secondParam){
                t = (Number(secondParam) / 1000)
                if(isNaN(t)){
                    t = 0
                }
            }
            return dateTimeFormat(args[0], t)
        },
        alias: [],
        description: 'Formats date/time using custom format string. No arguments returns h:m:s. First argument is format string, optional second argument is unix timestamp.\n\nUsage:: {{date::YYYY-MM-DD}} or {{date::HH:mm:ss::1640995200000}}',
    });

    registerFunction({
        name: 'moduleenabled',
        callback: (str, matcherArg, args, vars) => {
            const modules = getModules()
            for(const module of modules){
                if(module.namespace === args[0]){
                    return '1'
                }
            }
            return '0'
        },
        alias: ['module_enabled'],
        description: 'Checks if a module with the specified namespace is currently enabled/loaded. Returns "1" if found, "0" otherwise.\n\nUsage:: {{moduleenabled::mymodule}}',
    });

    registerFunction({
        name: 'moduleassetlist',
        callback: (str, matcherArg, args, vars) => {
            const module = getModules()?.find((f) => {
                return f.namespace === args[0]
            })
            if(!module){
                return ''
            }
            return makeArray(module.assets?.map((f) => {
                return f[0]
            }))
        },
        alias: ['module_assetlist'],
        description: 'Returns a JSON array of asset names for the specified module namespace. Returns empty string if module not found.\n\nUsage:: {{moduleassetlist::mymodule}}',
    });

    registerFunction({
        name: 'filter',
        callback: (str, matcherArg, args, vars) => {
            const array = parseArray(args[0])
            const filterTypes = [
                'all',
                'nonempty', 
                'unique',
            ]
            let filterType = filterTypes.indexOf(args[1])
            if(filterType === -1){
                filterType = 0
            }
            return makeArray(array.filter((f, i) => {
                switch(filterType){
                    case 0:
                        return f !== '' && i === array.indexOf(f)
                    case 1:
                        return f !== ''
                    case 2:
                        return i === array.indexOf(f)               
                }
            }))
        },
        alias: [],
        description: 'Filters a JSON array based on the specified filter type. "all": removes empty and duplicates, "nonempty": removes empty only, "unique": removes duplicates only.\n\nUsage:: {{filter::["a","","a"]::unique}} → ["a",""]',
    });

    registerFunction({
        name: 'all',
        callback: (str, matcherArg, args, vars) => {
            const array = args.length > 1 ? args : parseArray(args[0])
            const all = array.every((f) => {
                return f === '1'
            })
            return all ? '1' : '0'
        },
        alias: [],
        description: 'Returns "1" only if all provided values are "1", otherwise returns "0". Can take array as first argument or multiple arguments. Logical AND of all values.\n\nUsage:: {{all::1::1::1}} → 1',
    });

    registerFunction({
        name: 'any',
        callback: (str, matcherArg, args, vars) => {
            const array = args.length > 1 ? args : parseArray(args[0])
            const any = array.some((f) => {
                return f === '1'
            })
            return any ? '1' : '0'
        },
        alias: [],
        description: 'Returns "1" if any provided value is "1", otherwise returns "0". Can take array as first argument or multiple arguments. Logical OR of all values.\n\nUsage:: {{any::0::1::0}} → 1',
    });

    registerFunction({
        name: 'min',
        callback: (str, matcherArg, args, vars) => {
            const val = args.length > 1 ? args : parseArray(args[0])
            return Math.min(...val.map((f) => {
                const num = Number(f)
                if(isNaN(num)){
                    return 0
                }
                return num
            })).toString()
        },
        alias: [],
        description: 'Returns the smallest numeric value from the provided values. Can take array as first argument or multiple arguments. Non-numeric values treated as 0.\n\nUsage:: {{min::5::2::8}} → 2',
    });

    registerFunction({
        name: 'max',
        callback: (str, matcherArg, args, vars) => {
            const val = args.length > 1 ? args : parseArray(args[0])
            return Math.max(...val.map((f) => {
                const num = Number(f)
                if(isNaN(num)){
                    return 0
                }
                return num
            })).toString()
        },
        alias: [],
        description: 'Returns the largest numeric value from the provided values. Can take array as first argument or multiple arguments. Non-numeric values treated as 0.\n\nUsage:: {{max::5::2::8}} → 8',
    });

    registerFunction({
        name: 'sum',
        callback: (str, matcherArg, args, vars) => {
            const val = args.length > 1 ? args : parseArray(args[0])
            return val.map((f) => {
                const num = Number(f)
                if(isNaN(num)){
                    return 0
                }
                return num
            }).reduce((a, b) => a + b, 0).toString()
        },
        alias: [],
        description: 'Returns the sum of all numeric values provided. Can take array as first argument or multiple arguments. Non-numeric values treated as 0.\n\nUsage:: {{sum::1::2::3}} → 6',
    });

    registerFunction({
        name: 'average',
        callback: (str, matcherArg, args, vars) => {
            const val = args.length > 1 ? args : parseArray(args[0])
            const sum = val.map((f) => {
                const num = Number(f)
                if(isNaN(num)){
                    return 0
                }
                return num
            }).reduce((a, b) => a + b, 0)
            return (sum / val.length).toString()
        },
        alias: [],
        description: 'Returns the arithmetic mean of all numeric values provided. Can take array as first argument or multiple arguments. Non-numeric values treated as 0.\n\nUsage:: {{average::2::4::6}} → 4',
    });

    registerFunction({
        name: 'fixnum',
        callback: (str, matcherArg, args, vars) => {
            return Number(args[0]).toFixed(Number(args[1]))
        },
        alias: ['fixnum', 'fixnumber'],
        description: 'Rounds a number to the specified number of decimal places. Uses toFixed() method for consistent formatting.\n\nUsage:: {{fixnum::3.14159::2}} → 3.14',
    });

    registerFunction({
        name: 'unicodeencode',
        callback: (str, matcherArg, args, vars) => {
            return args[0].charCodeAt(args[1] ? Number(args[1]) : 0).toString()
        },
        alias: ['unicode_encode'],
        description: 'Returns the Unicode code point of a character at the specified index (default 0) in the string. Returns numeric code as string.\n\nUsage:: {{unicodeencode::A}} → 65',
    });

    registerFunction({
        name: 'unicodedecode',
        callback: (str, matcherArg, args, vars) => {
            return String.fromCharCode(Number(args[0]))
        },
        alias: ['unicode_decode'],
        description: 'Converts a Unicode code point number back to its corresponding character. Inverse of unicodeencode.\n\nUsage:: {{unicodedecode::65}} → A',
    });

    registerFunction({
        name: 'u',
        callback: (str, matcherArg, args, vars) => {
            return String.fromCharCode(parseInt(args[0], 16))
        },
        alias: ['unicodedecodefromhex'],
        description: 'Converts a hexadecimal Unicode code to its corresponding character. Useful for special characters and symbols.\n\nUsage:: {{u::41}} → A',
    });

    registerFunction({
        name: 'ue',
        callback: (str, matcherArg, args, vars) => {
            return String.fromCharCode(parseInt(args[0], 16))
        },
        alias: ['unicodeencodefromhex'],
        description: 'Converts a hexadecimal Unicode code to its corresponding character. Alias for {{u}}.\n\nUsage:: {{ue::41}} → A',
    });

    registerFunction({
        name: 'hash',
        callback: (str, matcherArg, args, vars) => {
            return ((pickHashRand(0, args[0]) * 10000000) + 1).toFixed(0).padStart(7, '0')
        },
        alias: [],
        description: 'Generates a deterministic 7-digit number based on the input string hash. Same input always produces the same output. Useful for consistent randomization.\n\nUsage:: {{hash::hello}} → 1234567',
    });

    registerFunction({
        name: 'randint',
        callback: (str, matcherArg, args, vars) => {
            const min = Number(args[0])
            const max = Number(args[1])
            if(isNaN(min) || isNaN(max)){
                return 'NaN'
            }
            return (Math.floor(Math.random() * (max - min + 1)) + min).toString()
        },
        alias: [],
        description: 'Generates a random integer between min and max values (inclusive). Returns "NaN" if arguments are not valid numbers.\n\nUsage:: {{randint::1::10}} → random number 1-10',
    });

    registerFunction({
        name: 'dice',
        callback: (str, matcherArg, args, vars) => {
            const notation = args[0].split('d')
            const num = Number(notation[0])
            const sides = Number(notation[1])
            if(isNaN(num) || isNaN(sides)){
                return 'NaN'
            }
            let total = 0
            for(let i = 0; i < num; i++){
                total += Math.floor(Math.random() * sides) + 1
            }
            return total.toString()
        },
        alias: [],
        description: 'Simulates dice rolling using standard RPG notation (XdY = X dice with Y sides each). Returns sum of all dice rolls.\n\nUsage:: {{dice::2d6}} → random number 2-12',
    });

    registerFunction({
        name: 'fromhex',
        callback: (str, matcherArg, args, vars) => {
            return Number.parseInt(args[0], 16).toString()
        },
        alias: [],
        description: 'Converts a hexadecimal string to its decimal number equivalent. Parses base-16 input to base-10 output.\n\nUsage:: {{fromhex::FF}} → 255',
    });

    registerFunction({
        name: 'tohex',
        callback: (str, matcherArg, args, vars) => {
            return Number.parseInt(args[0]).toString(16)
        },
        alias: [],
        description: 'Converts a decimal number to its hexadecimal string representation. Parses base-10 input to base-16 output.\n\nUsage:: {{tohex::255}} → ff',
    });

    registerFunction({
        name: 'metadata',
        callback: (str, matcherArg, args, vars) => {
            const db = getDatabase()
            switch(args[0].toLocaleLowerCase()){
                case 'mobile':{
                    return isMobile ? '1' : '0'
                }
                case 'local':{
                    return isTauri ? '1' : '0'
                }
                case 'node':{
                    return isNodeServer ? '1' : '0'
                }
                case 'version':{
                    return appVer
                }
                case 'majorversion':
                case 'majorver':
                case 'major':{
                    return appVer.split('.')[0]
                }
                case 'language':
                case 'locale':
                case 'lang':{
                    return db.language
                }
                case 'browserlanguage':
                case 'browserlocale':
                case 'browserlang':{
                    return navigator.language
                }
                case 'modelshortname':{
                    const modelInfo = getModelInfo(db.aiModel)
                    return modelInfo.shortName ?? modelInfo.name ?? modelInfo.id
                }
                case 'modelname':{
                    const modelInfo = getModelInfo(db.aiModel)
                    return modelInfo.name ?? modelInfo.id
                }
                case 'modelinternalid':{
                    const modelInfo = getModelInfo(db.aiModel)
                    return modelInfo.internalID ?? modelInfo.id
                }
                case 'modelformat':{
                    const modelInfo = getModelInfo(db.aiModel)
                    return modelInfo.format.toString()
                }
                case 'modelprovider':{
                    const modelInfo = getModelInfo(db.aiModel)
                    return modelInfo.provider.toString()
                }
                case 'modeltokenizer':{
                    const modelInfo = getModelInfo(db.aiModel)
                    return modelInfo.tokenizer.toString()
                }
                case 'imateapot':{
                    return '🫖'
                }
                case 'risutype':{
                    return isTauri ? 'local' : isNodeServer ? 'node' : 'web'
                }
                case 'maxcontext':{
                    return db.maxContext.toString()
                }
                default:{
                    return `Error: ${args[0]} is not a valid metadata key.`
                }
            }
        },
        alias: [],
        description: 'Returns various system and application metadata. Supported keys: mobile, local, node, version, language, modelname, etc. Returns error message for invalid keys.\n\nUsage:: {{metadata::version}}',
    });

    registerFunction({
        name: 'iserror',
        callback: (str, matcherArg, args, vars) => {
            return args[0].toLocaleLowerCase().startsWith('error:') ? '1' : '0'
        },
        alias: [],
        description: 'Checks if a string starts with "error:" (case-insensitive). Returns "1" if it\'s an error message, "0" otherwise. Useful for error handling.\n\nUsage:: {{iserror::Error: failed}} → 1',
    });

    // Encryption/decryption functions
    registerFunction({
        name: 'xor',
        callback: (str, matcherArg, args, vars) => {
            const buf = new TextEncoder().encode(args[0])
            for(let i = 0; i < buf.length; i++){
                buf[i] ^= 0xFF
            }
            return Buffer.from(buf).toString('base64')
        },
        alias: ['xorencrypt', 'xorencode', 'xore'],
        description: 'Encrypts a string using XOR cipher with 0xFF key and encodes result as base64. Simple obfuscation method. Reversible with xordecrypt.\n\nUsage:: {{xor::hello}}',
    });

    registerFunction({
        name: 'xordecrypt',
        callback: (str, matcherArg, args, vars) => {
            const buf = Buffer.from(args[0], 'base64')
            for(let i = 0; i < buf.length; i++){
                buf[i] ^= 0xFF
            }
            return new TextDecoder().decode(buf)
        },
        alias: ['xordecode', 'xord'],
        description: 'Decrypts a base64-encoded XOR-encrypted string back to original text. Reverses the xor function using same 0xFF key.\n\nUsage:: {{xordecrypt::base64string}}',
    });

    registerFunction({
        name: 'crypt',
        callback: (str, matcherArg, args, vars) => {
            let shift = args[1] ? Number(args[1]) : 32768
            if(isNaN(shift)){
                shift = 32768
            }

            let result = ''
            for(let i = 0; i < args[0].length; i++){
                const charCode = args[0].charCodeAt(i)
                if(charCode > 65535){
                    result += args[0][i]
                    continue
                }
                let shiftedCode = charCode + shift
                if(shiftedCode > 65535){
                    shiftedCode -= 65536
                }
                result += String.fromCharCode(shiftedCode)
            }
            return result
        },
        alias: ['crypto', 'caesar', 'encrypt', 'decrypt'],
        description: 'Applies Caesar cipher encryption/decryption with custom shift value (default 32768). Shifts Unicode character codes within 16-bit range. By using default shift, it can be used for both encryption and decryption.\n\nUsage:: {{crypt::hello}} or {{crypt::hello::1000}}',
    });

    registerFunction({
        name: 'random',
        callback: (str, matcherArg, args, vars) => {

            if(args.length === 0){
                return Math.random().toString()
            }
            if(args.length === 1){
                let arr:string[]
                
                if(str.startsWith('[') && str.endsWith(']')){
                    arr = parseArray(str)
                }
                else{
                    arr = args[0].replace(/\\,/g, '§X').split(/\:|\,/g)
                }
                const randomIndex = Math.floor(Math.random() * arr.length)
                if(matcherArg.tokenizeAccurate){
                    return arr[0]
                }
                return arr[randomIndex]?.replace(/§X/g, ',') ?? ''
            }

            const randomIndex = Math.floor(Math.random() * args.length)
            if(matcherArg.tokenizeAccurate){
                return args[0]
            }
            return args[randomIndex]
        },
        alias: [],
        description: 'Returns a random number between 0 and 1 if no arguments. With one argument, returns a random element from the provided array or string split by commas/colons. With multiple arguments, returns a random argument.\n\nUsage:: {{random}} or {{random::a,b,c}} → "b"',
    })

    registerFunction({
        name: 'pick',
        callback: (str, matcherArg, args, vars) => {

            const db = getDatabase()
            const selchar = db.characters[getSelectedCharID()]
            const selChat = selchar.chats[selchar.chatPage]
            const cid = selChat.message.length
            const hashRand = pickHashRand(cid, selchar.chaId + (selChat.id ?? ''))
            
            if(args.length === 0){
                return hashRand.toString()
            }
            if(args.length === 1){
                let arr:string[]
                
                if(str.startsWith('[') && str.endsWith(']')){
                    arr = parseArray(str)
                }
                else{
                    arr = args[0].replace(/\\,/g, '§X').split(/\:|\,/g)
                }
                const randomIndex = Math.floor(hashRand * arr.length)
                if(matcherArg.tokenizeAccurate){
                    return arr[0]
                }
                return arr[randomIndex]?.replace(/§X/g, ',') ?? ''
            }

            const randomIndex = Math.floor(hashRand * args.length)
            if(matcherArg.tokenizeAccurate){
                return args[0]
            }
            return args[randomIndex]
        },
        alias: [],
        description: 'Returns a random number between 0 and 1 if no arguments. With one argument, returns a random element from the provided array or string split by commas/colons. With multiple arguments, returns a random argument. unlike {{random}}, uses a hash-based randomization based on chat ID and character ID for consistent results across messages.\n\nUsage:: {{pick}} or {{pick::a,b,c}} → "b"',
    })

    registerFunction({
        name: 'roll',
        callback: (str, matcherArg, args, vars) => {
            if(args.length === 0){
                return '1'
            }
            const notation = args[0].split('d')
            let num = 1
            let sides = 6
            if(notation.length === 2){
                num = Number(notation[0] || 1)
                sides = Number(notation[1] || 6)
            }
            else if(notation.length === 1){
                sides = Number(notation[0])
            }
            if(isNaN(num) || isNaN(sides) || num < 1 || sides < 1){
                return 'NaN'
            }
            let total = 0
            for(let i = 0; i < num; i++){
                total += Math.floor(Math.random() * sides) + 1
            }
            return total.toString()
        },
        alias: [],
        description: 'Simulates rolling dice using standard RPG notation (XdY = X dice with Y sides each). Returns sum of all dice rolls. If no arguments, defaults to 1d6.\n\nUsage:: {{roll::2d6}} → random number 2-12, {{roll::20}} → random number 1-20',
    })

    registerFunction({
        name: 'rollp',
        callback: (str, matcherArg, args, vars) => {
            if(args.length === 0){
                return '1'
            }
            const notation = args[0].split('d')
            let num = 1
            let sides = 6
            if(notation.length === 2){
                num = Number(notation[0] || 1)
                sides = Number(notation[1] || 6)
            }
            else if(notation.length === 1){
                sides = Number(notation[0])
            }
            if(isNaN(num) || isNaN(sides) || num < 1 || sides < 1){
                return 'NaN'
            }
            let total = 0
            for(let i = 0; i < num; i++){
                const db = getDatabase()
                const selchar = db.characters[getSelectedCharID()]
                const selChat = selchar.chats[selchar.chatPage]
                const cid = selChat.message.length + (i * 15)
                const hashRand = pickHashRand(cid, selchar.chaId + (selChat.id ?? ''))
                total += Math.floor(hashRand * sides) + 1
            }
            
            return total.toString()
        },
        alias: ['rollpick'],
        description: 'Simulates rolling dice using standard RPG notation (XdY = X dice with Y sides each). Returns sum of all dice rolls. If no arguments, defaults to 1d6. Unlike {{roll}}, uses a hash-based randomization based on chat ID and character ID for consistent results across messages.\n\nUsage:: {{rollp::2d6}} → random number 2-12, {{rollp::20}} → random number 1-20',
    })

    registerFunction({
        name: 'hiddenkey',
        callback: (str, matcherArg, args, vars) => {
            return ''
        },
        alias: [],
        description: 'Works as a key for activation of lores, while not being included in the model request.\n\nUsage:: {{hidden_key::some_value}}',
    })

    registerFunction({
        name: 'reverse',
        callback: (str, matcherArg, args, vars) => {
            return str.split('').reverse().join('')
        },
        alias: [],
        description: 'Reverses the input string.\n\nUsage:: {{reverse::some_value}}',
    })

    registerFunction({
        name: 'comment',
        callback: (str, matcherArg, args, vars) => {
            if(!matcherArg.displaying){
                return ''
            }
            return `<div class="risu-comment">${args[0]}</div>`
        },
        alias: [],
        description: 'A comment CBS for commenting out code. unlike {{//}}, this one is displayed in the chat.\n\nUsage:: {{comment::this is a comment}}',
    })

    registerFunction({
        name: 'tex',
        callback: (str, matcherArg, args, vars) => {
            return `$$${args[0]}$$`
        },
        alias: ['latex', 'katex'],
        description: 'Renders LaTeX math expressions. Wraps the input in double dollar signs for display.\n\nUsage:: {{tex::E=mc^2}}',
    })

    registerFunction({
        name: 'ruby',
        callback: (str, matcherArg, args, vars) => {
            return `<ruby>${args[0]}<rp> (</rp><rt>${args[1]}</rt><rp>) </rp></ruby>`
        },
        alias: ['furigana'],
        description: 'Renders ruby text (furigana) for East Asian typography. Wraps base text and ruby text in appropriate HTML tags.\n\nUsage:: {{ruby::漢字::かんじ}}',
    })

    registerFunction({
        name: 'codeblock',
        callback: (str, matcherArg, args, vars) => {
            let code = args[args.length - 1]
                .replace(/\"/g, '&quot;')
                .replace(/\'/g, '&#39;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')

            if(args.length > 1){
                return `<pre-hljs-placeholder lang="${args[0]}">`+ code +'</pre-hljs-placeholder>'
            }

            return `<pre><code>${code}</code></pre>`
        },
        alias: [],
        description: 'Formats text as a code block using HTML pre and code tags.\n\nUsage:: {{codeblock::some code here}}, or {{codeblock::language::some code here}} for syntax highlighting.',
    })

    registerFunction({
        name: '//',
        callback: 'doc_only',
        alias: [],
        description: 'A comment CBS for commenting out code.\n\nUsage:: {{// this is a comment}}',
    })

    registerFunction({
        name: '?',
        callback: 'doc_only',
        alias: [],
        description: 'Runs math operations on numbers. Supports +, -, *, /, %, ^ (exponentiation), % (modulo), < (less than), > (greater than), <= (less than or equal), >= (greater than or equal), == (equal), != (not equal), and brackets for grouping.\n\nUsage:: {{? 1+2}} → 3, {{? (2*3)+4}} → 10',
    })

    registerFunction({
        name: '__',
        callback: (str, matcherArg, args, vars) => {
            return callInternalFunction(args)
        },
        alias: [],
        description: '**INTERNAL FUNCTION - DO NOT USE**',
        internalOnly: true,
    });

    // Asset display functions (doc_only)
    registerFunction({
        name: 'asset',
        callback: 'doc_only',
        alias: [],
        description: 'Displays additional asset A as appropriate element type.\n\nUsage:: {{asset::assetName}}',
    });

    registerFunction({
        name: 'emotion',
        callback: 'doc_only',
        alias: [],
        description: 'Displays emotion image A as image element.\n\nUsage:: {{emotion::emotionName}}',
    });

    registerFunction({
        name: 'audio',
        callback: 'doc_only',
        alias: [],
        description: 'Displays audio asset A as audio element.\n\nUsage:: {{audio::audioName}}',
    });

    registerFunction({
        name: 'bg',
        callback: 'doc_only',
        alias: [],
        description: 'Displays background image A as background image element.\n\nUsage:: {{bg::backgroundName}}',
    });

    registerFunction({
        name: 'bgm',
        callback: 'doc_only',
        alias: [],
        description: 'Inserts background music control element.\n\nUsage:: {{bgm::musicName}}',
    });

    registerFunction({
        name: 'video',
        callback: 'doc_only',
        alias: [],
        description: 'Displays video asset A as video element.\n\nUsage:: {{video::videoName}}',
    });

    registerFunction({
        name: 'video-img',
        callback: 'doc_only',
        alias: [],
        description: 'Displays video asset A as image-like element.\n\nUsage:: {{video-img::videoName}}',
    });

    registerFunction({
        name: 'image',
        callback: 'doc_only',
        alias: [],
        description: 'Displays image asset A as image element.\n\nUsage:: {{image::imageName}}',
    });

    registerFunction({
        name: 'img',
        callback: 'doc_only',
        alias: [],
        description: 'Displays A as unstyled image element.\n\nUsage:: {{img::imageName}}',
    });

    registerFunction({
        name: 'path',
        callback: 'doc_only',
        alias: ['raw'],
        description: 'Returns additional asset A\'s path data.\n\nUsage:: {{path::assetName}}',
    });

    registerFunction({
        name: 'inlay',
        callback: 'doc_only',
        alias: [],
        description: 'Displays unstyled inlay asset A, which doesn\'t inserts at model request.\n\nUsage:: {{inlay::inlayName}}',
    });

    registerFunction({
        name: 'inlayed',
        callback: 'doc_only',
        alias: [],
        description: 'Displays styled inlay asset A, which doesn\'t inserts at model request.\n\nUsage:: {{inlayed::inlayName}}',
    });

    registerFunction({
        name: 'inlayeddata',
        callback: 'doc_only',
        alias: [],
        description: 'Displays styled inlay asset A, which inserts at model request.\n\nUsage:: {{inlayeddata::inlayName}}',
    });

    registerFunction({
        name: 'source',
        callback: 'doc_only',
        alias: [],
        description: 'Returns the source URL of user or character\'s profile. argument must be "user" or "char".\n\nUsage:: {{source::user}} or {{source::char}}',
    });

    registerFunction({
        name:"#if",
        callback: 'doc_only',
        alias: [],
        description: 'Conditional statement for CBS. 1 and "true" are truty, and otherwise false.\n\nUsage:: {{#if condition}}...{{/if}}.',
        deprecated: {
            message: 'Due to limitations of adding operators, #if is deprecated and replaced with #when. Use #when instead.',
            replacement: '#when',
        }
    })

    registerFunction({
        name:'#if_pure',
        callback: 'doc_only',
        alias: [],
        description: 'Conditional statement for CBS, which has keep whitespace handling. 1 and "true" are truty, and otherwise false.\n\nUsage:: {{#if_pure condition}}...{{/if_pure}}',
        deprecated: {
            message: 'Due to limitations of adding operators, #if_pure is deprecated and replaced with #when with keep operator. Use #when::keep::condition instead.',
            replacement: '#when',
        }
    })

    registerFunction({
        name:'#when',
        callback: 'doc_only',
        alias: [],
        description: `Conditional statement for CBS. 1 and "true" are truty, and otherwise false.

It can add operators to condition:

Basic operators:
{{#when::A::and::B}}...{{/when}} - checks if both conditions are true.
{{#when::A::or::B}}...{{/when}} - checks if at least one condition is true.
{{#when::A::is::B}}...{{/when}} - checks if A is equal to B.
{{#when::A::isnot::B}}...{{/when}} - checks if A is not equal to B.
{{#when::A::>::B}}...{{/when}} - checks if A is greater than B.
{{#when::A::<::B}}...{{/when}} - checks if A is less than B.
{{#when::A::>=::B}}...{{/when}} - checks if A is greater than or equal to B.
{{#when::A::<=::B}}...{{/when}} - checks if A is less than or equal to B.
{{#when::not::A}}...{{/when}} - negates condition, so it will be true if A is false.

Advanced operators:
{{#when::keep::A}}...{{/when}} - keep whitespace handling, so it will not trim spaces inside block.
{{#when::legacy::A}}...{{/when}} - legacy whitespace handling, so it will handle like deprecated #if.
{{#when::var::A}}...{{/when}} - checks if variable A is truthy.
{{#when::A::vis::B}}...{{/when}} - checks if variable A is equal to literal B.
{{#when::A::vnotis::B}}...{{/when}} - checks if variable A is not equal to literal B.
{{#when::toggle::togglename}}...{{/when}} - checks if toggle is enabled.
{{#when::A::tis::B}}...{{/when}} - checks if toggle A is equal to literal B.
{{#when::A::tnotis::B}}...{{/when}} - checks if toggle A is not equal to literal B.

operators can be combined like:
{{#when::keep::not::condition}}...{{/when}}
{{#when::keep::condition1::and::condition2}}...{{/when}}

You can use whitespace instead of "::" if there is no operators, like:
{{#when condition}}...{{/when}}

Usage:: {{#when condition}}...{{/when}} or {{#when::not::condition}}...{{/when}}
`,
    })

    registerFunction({
        name:':else',
        callback: 'doc_only',
        alias: [],
        description: 'Else statement for CBS. Must be used inside {{#when}}. if {{#when}} is multiline, :else must be on line without additional string. if {{#when}} is used with operator \'legacy\', it will not work.\n\nUsage:: {{#when condition}}...{{:else}}...{{/when}} or {{#when::not::condition}}...{{:else}}...{{/when}}',
    })

    registerFunction({
        name:'#pure',
        callback: 'doc_only',
        alias: [],
        description: 'displays content without any CBS processing. Useful for displaying raw HTML or other content without parsing.\n\nUsage:: {{#puredisplay}}...{{/puredisplay}}',
        deprecated: {
            message: 'Due to reparsing issue, #pure is deprecated and replaced with #puredisplay. Use #puredisplay instead.',
            replacement: '#puredisplay',
        }
    })
    registerFunction({
        name:'#puredisplay',
        callback: 'doc_only',
        alias: [],
        description: 'displays content without any CBS processing. Useful for displaying raw HTML or other content without parsing.\n\nUsage:: {{#puredisplay}}...{{/puredisplay}}',
    })

    registerFunction({
        name:':each',
        callback: 'doc_only',
        alias: ['#each'],
        description: 'Iterates over an array or object.\n\nUsage:: {{#each array}}...{{/each}} or {{#each object as key}}... {{slot::key}}...{{/each}}',
    })

    registerFunction({
        name: 'slot',
        callback: 'doc_only',
        alias: [],
        description: 'Used in various CBS functions to access specific slots or properties.\n\nUsage:: {{slot::propertyName}} or {{slot}}, depending on context.',
    })

    registerFunction({
        name: 'position',
        callback: 'doc_only',
        alias: [],
        description: 'Defines the position which can be used in various features such as @@position <positionName> decorator.\n\nUsage:: {{position::positionName}}',
    })


}
