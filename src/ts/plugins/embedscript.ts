import { get } from 'svelte/store'
import type { ScriptMode } from '../process/scripts'
import WorkerUrl from './embedworker?worker&url'
import { DataBase, type Chat, type character, type Message } from '../storage/database'
import { selectedCharID } from '../stores'
import { add, cloneDeep } from 'lodash'
import { sleep } from '../util'
import { characterFormatUpdate } from '../characters'
import { setDatabase } from '../storage/database'

let worker = new Worker(WorkerUrl, {type: 'module'})

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
      else if(performance.now() - startTime > 400){
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
    const db = get(DataBase)
    const selectedChar = get(selectedCharID)
    const char = db.characters[selectedChar]
    return cloneDeep(char.chats[char.chatPage].message)
})

addWorkerFunction('setChat', async (data:Message[]) => {
    const db = get(DataBase)
    const selectedChar = get(selectedCharID)
    let newChat:Message[] = []
    for(const dat of data){
        if(dat.role !== 'char' && dat.role !== 'user'){
            return false
        }
        if(typeof dat.data !== 'string'){
            return false
        }
        if(typeof dat.saying !== 'string'){
            return false
        }
        if(typeof dat.time !== 'number'){
            return false
        }
        if(typeof dat.chatId !== 'string'){
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
    const db = get(DataBase)
    const selectedChar = get(selectedCharID)
    const char = db.characters[selectedChar]
    return char.name
})

addWorkerFunction('setName', async (data:string) => {
    const db = get(DataBase)
    const selectedChar = get(selectedCharID)
    if(typeof data !== 'string'){
        return false
    }
    db.characters[selectedChar].name = data
    setDatabase(db)
    return true
})

addWorkerFunction('getDescription', async () => {
    const db = get(DataBase)
    const selectedChar = get(selectedCharID)
    const char = db.characters[selectedChar]
    if(char.type === 'group'){
        return ''
    }
    return char.desc
})

addWorkerFunction('setDescription', async (data:string) => {
    const db = get(DataBase)
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
    const db = get(DataBase)
    const selectedChar = get(selectedCharID)
    const char = db.characters[selectedChar]
    return char.firstMessage
})

addWorkerFunction('setCharacterFirstMessage', async (data:string) => {
    const db = get(DataBase)
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

addWorkerFunction('getState', async (statename) => {
    const db = get(DataBase)
    const selectedChar = get(selectedCharID)
    const char = db.characters[selectedChar]
    const chat = char.chats[char.chatPage]
    return (chat.scriptstate ?? {})[statename]
})

addWorkerFunction('setState', async (statename, data) => {
    const db = get(DataBase)
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



let lastCode = ''
let lastModeList:string[] = []

export async function runCharacterJS(arg:{
    code: string|null,
    mode: ScriptMode|'onButtonClick'
    data: string
}):Promise<string>{
    try {
        if(arg.code === null){
            const db = get(DataBase)
            const selectedChar = get(selectedCharID)
            arg.code = db.characters[selectedChar].virtualscript
        }
        const codes = {
            "editinput": 'editInput',
            "editoutput": 'editOutput',
            "editprocess": 'editProcess',
            "editdisplay": 'editDisplay',
            'onButtonClick': "onButtonClick"
        } as const

        if(lastCode !== arg.code){
            lastModeList = []
            const codesplit = arg.code.split('\n')
            for(let i = 0; i < codesplit.length; i++){
                const line = codesplit[i]
                if(line.startsWith('//@use')){
                    lastModeList.push(line.replace('//@use','').trim())
                }
            }
            lastCode = arg.code
        }

        const runCode = codes[arg.mode]

        if(!lastModeList.includes(runCode)){
            return arg.data
        }
        const result = await runVirtualJS(`${arg.code}\n${runCode}(${JSON.stringify(arg.data)})`)

        if(!result){
            return arg.data
        }
    
        return result.toString()   
    } catch (error) {
        if(arg.mode !== 'editprocess'){
            return `Error: ${error}`
        }
        return arg.data
    }

}

export async function watchParamButton() {
    while(true){
        const qs = document.querySelectorAll('*[risu-btn]:not([risu-btn-run="true"])')
        for(let i = 0; i < qs.length; i++){
            const q = qs[i]
            const code = q.getAttribute('risu-btn')
            q.setAttribute('risu-btn-run','true')
            q.addEventListener('click',async ()=>{
                await runCharacterJS({
                    code: null,
                    mode: 'onButtonClick',
                    data: code
                })
            })
        }
        await sleep(100)
    }
}