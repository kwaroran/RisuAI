import { get } from 'svelte/store'
import type { ScriptMode } from '../process/scripts'
import myWorkerUrl from './embedworker?worker&url'
import { DataBase } from '../storage/database'
import { selectedCharID } from '../stores'
import { cloneDeep } from 'lodash'

let worker = new Worker(new URL(myWorkerUrl), {type: 'module'})

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
      console.log(performance.now() - startTime )
      if(result){
        clearInterval(interval)
        resolve(result.result)
      }
      else if(performance.now() - startTime > 400){
        clearInterval(interval)
        //restart worker
        worker.terminate()
        worker = new Worker(new URL('./worker.ts', import.meta.url), {type: 'module'})
        reject('timeout')
      }
    },100)
  })
}

addWorkerFunction('getCharacter', async () => {
    const db = get(DataBase)
    const selectedChar = get(selectedCharID)
    return cloneDeep(db.characters[selectedChar])
})

export async function runCharacterJS(arg:{
    code: string,
    mode: ScriptMode
    data: string
}):Promise<string>{
    try {
        const codes = {
            "editinput": 'editInput',
            "editoutput": 'editOutput',
            "editprocess": 'editProcess',
            "editdisplay": 'editDisplay',
        } as const

        const runCode = codes[arg.mode]
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