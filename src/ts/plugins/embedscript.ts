import { get } from 'svelte/store'
import type { ScriptMode } from '../process/scripts'
//@ts-ignore
import WorkerUrl from './embedworker?worker&url'
import { getDatabase, type Message } from '../storage/database.svelte'
import { selectedCharID } from '../stores'
import { setDatabase } from '../storage/database.svelte'

let worker = new Worker(WorkerUrl, {type: 'module'})

let additionalCharaJS:string[] = []

export function addAdditionalCharaJS(code:string, position:'front'|'back' = 'back'){
    if(position === 'front'){
        additionalCharaJS.unshift(code)
    }
    else{
        additionalCharaJS.push(code)
    }
}

let results:{
    id: string,
    result: any
}[] = []

let workerFunctions: {
  [key:string]: (...args:any[])=> Promise<any>
} = {}

worker.onmessage = ({data}) => {
  if(data.type === 'api'){
    workerFunctions[data.name](...data.args).then((result)=>{
      worker.postMessage({
        type: 'result',
        id: data.id,
        result
      })
    })
  }
  else{
    results.push(data)
  }
}

function addWorkerFunction(name:string, func: (...args:any[])=> Promise<any>){
  workerFunctions[name] = func
  worker.postMessage({
    type: 'api',
    name
  })
}


function runVirtualJS(code:string){
  const id = `id${Math.random()}`.replace('.','')
  worker.postMessage({
    id,code
  })
  let startTime = performance.now()
  return new Promise((resolve,reject)=>{
    const interval = setInterval(()=>{
      const result = results.find(r=>r.id === id)
      if(result){
        clearInterval(interval)
        resolve(result.result)
      }
      else if(performance.now() - startTime > 800){
        clearInterval(interval)
        //restart worker
        worker.terminate()
        worker = new Worker(WorkerUrl, {type: 'module'})
        reject('timeout')
      }
    },10)
  })
}

addWorkerFunction('getChat', async () => {
    const db = getDatabase({
        snapshot: true
    })
    const selectedChar = get(selectedCharID)
    const char = db.characters[selectedChar]
    return safeStructuredClone(char.chats[char.chatPage].message)
})

addWorkerFunction('setChat', async (data:Message[]) => {
    const db = getDatabase()
    const selectedChar = get(selectedCharID)
    let newChat:Message[] = []
    for(const dat of data){
        if(dat.role !== 'char' && dat.role !== 'user'){
            return false
        }
        if(typeof dat.data !== 'string'){
            return false
        }
        if(typeof dat.saying !== 'string' && dat.saying !== null && dat.saying !== undefined){
            return false
        }
        if(typeof dat.time !== 'number' && dat.time !== null && dat.time !== undefined){
            return false
        }
        if(typeof dat.chatId !== 'string' && dat.chatId !== null && dat.chatId !== undefined){
            return false
        }
        newChat.push({
            role: dat.role,
            data: dat.data,
            saying: dat.saying,
            time: dat.time,
            chatId: dat.chatId
        })
    }
    db.characters[selectedChar].chats[db.characters[selectedChar].chatPage].message = newChat
    setDatabase(db)
    return true
})

addWorkerFunction('getName', async () => {
    const db = getDatabase()
    const selectedChar = get(selectedCharID)
    const char = db.characters[selectedChar]
    return char.name
})

addWorkerFunction('setName', async (data:string) => {
    const db = getDatabase()
    const selectedChar = get(selectedCharID)
    if(typeof data !== 'string'){
        return false
    }
    db.characters[selectedChar].name = data
    setDatabase(db)
    return true
})

addWorkerFunction('getDescription', async () => {
    const db = getDatabase()
    const selectedChar = get(selectedCharID)
    const char = db.characters[selectedChar]
    if(char.type === 'group'){
        return ''
    }
    return char.desc
})

addWorkerFunction('setDescription', async (data:string) => {
    const db = getDatabase()
    const selectedChar = get(selectedCharID)
    const char =db.characters[selectedChar]
    if(typeof data !== 'string'){
        return false
    }
    if(char.type === 'group'){
        return false
    }
    char.desc = data
    db.characters[selectedChar] = char
    setDatabase(db)
    return true
})

addWorkerFunction('getCharacterFirstMessage', async () => {
    const db = getDatabase()
    const selectedChar = get(selectedCharID)
    const char = db.characters[selectedChar]
    return char.firstMessage
})

addWorkerFunction('setCharacterFirstMessage', async (data:string) => {
    const db = getDatabase()
    const selectedChar = get(selectedCharID)
    const char = db.characters[selectedChar]
    if(typeof data !== 'string'){
        return false
    }
    char.firstMessage = data
    db.characters[selectedChar] = char
    setDatabase(db)
    return true
})

addWorkerFunction('getBackgroundEmbedding', async () => {
    const db = getDatabase()
    const selectedChar = get(selectedCharID)
    const char = db.characters[selectedChar]
    return char.backgroundHTML
})

addWorkerFunction('setBackgroundEmbedding', async (data:string) => {
    const db = getDatabase()
    const selectedChar = get(selectedCharID)
    if(typeof data !== 'string'){
        return false
    }
    db.characters[selectedChar].backgroundHTML = data
    setDatabase(db)
    return true
})


addWorkerFunction('getState', async (statename) => {
    const db = getDatabase()
    const selectedChar = get(selectedCharID)
    const char = db.characters[selectedChar]
    const chat = char.chats[char.chatPage]
    return (chat.scriptstate ?? {})[statename]
})

addWorkerFunction('setState', async (statename, data) => {
    const db = getDatabase()
    const selectedChar = get(selectedCharID)
    const char = db.characters[selectedChar]
    const chat = char.chats[char.chatPage]
    if(typeof statename !== 'string'){
        return false
    }
    if(typeof data !== 'string' && typeof data !== 'number' && typeof data !== 'boolean'){
        return false
    }
    if(typeof data === 'string' && data.length > 100000){
        return false
    }
    if(!chat.scriptstate){
        chat.scriptstate = {}
    }
    if(Object.keys(chat.scriptstate).length > 50){
        return false
    }
    chat.scriptstate[statename] = data
    char.chats[char.chatPage] = chat
    db.characters[selectedChar] = char
    setDatabase(db)
    return true
})



let compCode:{[key:string]:string[]} = {}

export async function runCharacterJS(arg:{
    code: string|null,
    mode: ScriptMode|'onButtonClick'|'modifyRequestChat'
    data: any
}):Promise<any>{
    try {
        if(arg.code === null){
            const db = getDatabase()
            const selectedChar = get(selectedCharID)
            arg.code = db.characters[selectedChar].virtualscript
        }
        const codes = {
            "editinput": 'editInput',
            "editoutput": 'editOutput',
            "editprocess": 'editProcess',
            "editdisplay": 'editDisplay',
            'onButtonClick': "onButtonClick",
            'modifyRequestChat': 'modifyRequestChat'
        } as const

        let runCodes = [...additionalCharaJS, arg.code]

        let r = arg.data

        for(const code of runCodes){
            if(!code){
                continue
            }   
            if(!compCode[code]){
                let modeList:string[] = []
                const codesplit = code.split('\n')
                for(let i = 0; i < codesplit.length; i++){
                    const line = codesplit[i].trim()
                    if(line.startsWith('//@use')){
                        modeList.push(line.replace('//@use','').trim())
                    }
                }
                compCode[code] = modeList
                // compcode length max 100
                if(Object.keys(compCode).length > 100){
                    delete compCode[Object.keys(compCode)[50]]
                }
            }

            const runCode = codes[arg.mode]

            if(!compCode[code].includes(runCode)){
                continue
            }
            const result = await runVirtualJS(`${code}\n${runCode}(${JSON.stringify(r)})`)

            if(!result){
                continue
            }

            if(arg.mode !== 'modifyRequestChat'){
                if(typeof result !== 'string'){
                    continue
                }
            }
            else{
                if(!Array.isArray(result)){
                    continue
                }
            }
        
            r = result

            if(runCode === 'onButtonClick'){
                return r
            }
        }
        return r
 
    } catch (error) {
        if(arg.mode !== 'editprocess'){
            return `Error: ${error}`
        }
        return arg.data
    }

}