import { invoke } from "@tauri-apps/api/core";
import { globalFetch } from "src/ts/globalApi.svelte";
import { sleep } from "src/ts/util";
import * as path from "@tauri-apps/api/path";
import { exists, readTextFile } from "@tauri-apps/plugin-fs";
import { alertClear, alertError, alertWait } from "src/ts/alert";
import { getDatabase } from "src/ts/storage/database.svelte";
let serverRunning = false;

export function checkLocalModel():Promise<string>{
    return invoke("check_requirements_local")
}

export async function startLocalModelServer(){
    if(!serverRunning){
        serverRunning = true
        await invoke("run_server_local")
    }
    return
}

export async function checkLocalServerInstalled() {
    console.log(await path.appDataDir())
    const p = await path.join(await path.appDataDir(), 'local_server', 'key.txt')
    return await exists(p)
}

export interface LocalLoaderItem {
    dir: string;
    max_seq_len?: number ;
    max_input_len?: number ;
    max_attention_size?: number ;
    compress_pos_emb?: number ;
    alpha_value?: number ;
    gpu_peer_fixed?: boolean ;
    auto_map?: boolean ;
    use_flash_attn_2?: boolean ;
    matmul_recons_thd?: number ;
    fused_mlp_thd?: number ;
    sdp_thd?: number ;
    fused_attn?: boolean ;
    matmul_fused_remap?: boolean ;
    rmsnorm_no_half2?: boolean ;
    rope_no_half2?: boolean ;
    matmul_no_half2?: boolean ;
    silu_no_half2?: boolean ;
    concurrent_streams?: boolean ;
}
// class GeneratorItem(BaseModel):
//     temperature: Union[float, None]
//     top_k: Union[int, None]
//     top_p: Union[float, None]
//     min_p: Union[float, None]
//     typical: Union[float, None]
//     token_repetition_penalty_max: Union[float, None]
//     token_repetition_penalty_sustain: Union[int, None]
//     token_repetition_penalty_decay: Union[int, None]
//     beams: Union[int, None]
//     beam_length: Union[int, None]
//     disallowed_tokens: Union[list[int], None]
//     prompt: str
//     max_new_tokens: Union[int, None]
interface LocalGeneratorItem {
    temperature?: number;
    top_k?: number;
    top_p?: number;
    min_p?: number;
    typical?: number;
    token_repetition_penalty_max?: number;
    token_repetition_penalty_sustain?: number;
    token_repetition_penalty_decay?: number;
    beams?: number;
    beam_length?: number;
    disallowed_tokens?: number[];
    prompt: string;
    max_new_tokens?: number;
}

export async function checkServerRunning() {
    try {
        console.log("checking server")
        const res = await fetch("http://localhost:7239/")
        console.log(res)
        return res.ok   
    } catch (error) {
        return false
    }
}


export async function loadExllamaFull(){

    try {
        await startLocalModelServer()
        if(await checkLocalServerInstalled()){
            alertWait("Loading exllama")
        }
        else{
            alertWait("Installing & Loading exllama, this would take a while for the first time")
        }
        while(true){
            //check is server is running by fetching the status
            if(await checkLocalServerInstalled()){
                await sleep(1000)
                try {
                    const res = await fetch("http://localhost:7239/")
                    if(res.status === 200){
                        break
                    }
                } catch (error) {}
            }
            await sleep(1000)
        }

        const body:LocalLoaderItem = {
            dir: "C:\\Users\\blueb\\Downloads\\model",
        }
    
        alertWait("Loading Local Model")
        const res = await globalFetch("http://localhost:7239/load/", {
            body: body
        })
        alertClear()
    } catch (error) {
        alertError("Error when loading Exllama: " + error)     
    }

}


async function runLocalModelOld(prompt:string){
    const db = getDatabase()

    if(!serverRunning){
        await loadExllamaFull()
    }

    const body:LocalGeneratorItem = {
        prompt: prompt,
        temperature: db.temperature,
        top_k: db.ooba.top_k,
        top_p: db.ooba.top_p,
        typical: db.ooba.typical_p,
        max_new_tokens: db.maxResponse
    }

    console.log("generating")

    const gen = await globalFetch("http://localhost:7239/generate/", {
        body: body
    })

    console.log(gen)
}

let initPython = false
export async function installPython(){
    if(initPython){
        return
    }
    initPython = true
    const appDir = await path.appDataDir()
    const completedPath = await path.join(appDir, 'python', 'completed.txt')
    if(await exists(completedPath)){
        alertWait("Python is already installed, skipping")
    }
    else{
        alertWait("Installing Python")
        await invoke("install_python", {
            path: appDir
        })
        alertWait("Installing Pip")
        await invoke("install_pip", {
            path: appDir
        })
        alertWait("Rewriting requirements")
        await invoke('post_py_install', {
            path: appDir
        })
    
        alertClear()
    }
    const dependencies = [
        'pydantic',
        'scikit-build',
        'scikit-build-core',
        'pyproject_metadata',
        'pathspec',
        'llama-cpp-python',
        'uvicorn[standard]',
        'fastapi'
    ]
    for(const dep of dependencies){
        alertWait("Installing Python Dependencies (" + dep + ")")
        await invoke('install_py_dependencies', {
            path: appDir,
            dependency: dep
        })
    }

    await invoke('run_py_server', {
        pyPath: appDir,
    })
    await sleep(4000)
    alertClear()
    return

}

export async function getLocalKey(retry = true) {
    try {
        const ft = await fetch("http://localhost:10026/")
        const keyJson = await ft.json()
        const keyPath = keyJson.dir
        const key = await readTextFile(keyPath)
        return key
    } catch (error) {
        if(!retry){
            throw `Error when getting local key: ${error}`
        }
        //if is cors error
        if(
            error.message.includes("NetworkError when attempting to fetch resource.")
            || error.message.includes("Failed to fetch")
        ){
            await installPython()
            return await getLocalKey(false)
        }
        else{
            throw `Error when getting local key: ${error}`
        }
    }
}

export async function runGGUFModel(arg:{
    prompt: string
    modelPath: string
    temperature: number
    top_p: number
    top_k: number
    maxTokens: number
    presencePenalty: number
    frequencyPenalty: number
    repeatPenalty: number
    maxContext: number
    stop: string[]
}) {
    const key = await getLocalKey()
    const b = await fetch("http://localhost:10026/llamacpp", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-risu-auth": key
        },
        body: JSON.stringify({
            prompt: arg.prompt,
            model_path: arg.modelPath,
            temperature: arg.temperature,
            top_p: arg.top_p,
            top_k: arg.top_k,
            max_tokens: arg.maxTokens,
            presence_penalty: arg.presencePenalty,
            frequency_penalty: arg.frequencyPenalty,
            repeat_penalty: arg.repeatPenalty,
            n_ctx: arg.maxContext,
            stop: arg.stop
        })
    })

    return b.body
}

export async function tokenizeGGUFModel(prompt:string):Promise<number[]> {
    const key = await getLocalKey()
    const db = getDatabase()
    const modelPath = db.aiModel.replace('local_', '')
    const b = await fetch("http://localhost:10026/llamacpp/tokenize", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-risu-auth": key
        },
        body: JSON.stringify({
            prompt: prompt,
            n_ctx: db.maxContext,
            model_path: modelPath
        })
    })

    return await b.json()
}