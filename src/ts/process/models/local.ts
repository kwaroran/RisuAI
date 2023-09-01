import { invoke } from "@tauri-apps/api/tauri";
import { globalFetch } from "src/ts/storage/globalApi";
import { sleep } from "src/ts/util";
import * as path from "@tauri-apps/api/path";
import { createDir, exists, readDir, readTextFile } from "@tauri-apps/api/fs";
import { alertClear, alertError, alertMd, alertWait } from "src/ts/alert";
import { get } from "svelte/store";
import { DataBase } from "src/ts/storage/database";
import { open } from '@tauri-apps/api/shell';

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

export async function getServerKey() {
    if(!await checkLocalServerInstalled()){
        console.log("no key")
        return ''
    }
    const p = await path.join(await path.appDataDir(), 'local_server', 'key.txt')
    const tx = await readTextFile(p)
    console.log(tx)
    return tx
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
        const res = await fetch("http://localhost:7239/", {
            headers: {
                'x-risu-key': await getServerKey()
            }
        })
        console.log(res)
        return res.ok   
    } catch (error) {
        return false
    }
}


export async function loadExllamaFull(model:string){

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
                    const res = await fetch("http://localhost:7239/", {
                        headers: {
                            'x-risu-key': await getServerKey()
                        }
                    })
                    if(res.status === 200){
                        break
                    }
                } catch (error) {}
            }
            await sleep(1000)
        }

        const modelPath = await path.join(await path.appDataDir(), 'local_models', model)

        const body:LocalLoaderItem = {
            "dir": modelPath,
            "max_seq_len": null,
            "max_input_len": null,
            "max_attention_size":null,
            "compress_pos_emb": null,
            "alpha_value": null,
            "gpu_peer_fixed":null,
            "auto_map": null,
            "use_flash_attn_2": null,
            "matmul_recons_thd": null,
            "fused_mlp_thd": null,
            "sdp_thd": null,
            "fused_attn": null,
            "matmul_fused_remap": null,
            "rmsnorm_no_half2": null,
            "rope_no_half2": null,
            "matmul_no_half2": null,
            "silu_no_half2": null,
            "concurrent_streams": null
        }
    
        alertWait("Loading Local Model")
        const res = await fetch("http://localhost:7239/load/", {
            body: JSON.stringify(body),
            headers: {
                'x-risu-key': await getServerKey(),
                'Content-Type': 'application/json'
            },
            method: "POST"
        })

        if(res.status !== 200){
            alertError("Error when loading Exllama: " + await res.text())
        }
        else{
            alertClear()
        }
    } catch (error) {
        alertError("Error when loading Exllama: " + error)     
    }

}

export async function getLocalModelList() {
    const p = await path.join(await path.appDataDir(), 'local_models')
    if(!await exists(p)){
        await createDir(p, {
            recursive: true
        })
    }
    const dirContents = await readDir(p)
    return dirContents.map(x => x.name)
}

export async function openLocalModelFolder(){
    const p = await path.join(await path.appDataDir(), 'local_models')
    if(!await exists(p)){
        await createDir(p, {
            recursive: true
        })
    }
    await invoke('open_folder',{path:p})

}

interface runLocalModelParams extends LocalGeneratorItem {
    model: string;
}


export async function runLocalModel(data:runLocalModelParams){
    const db = get(DataBase)

    if(!serverRunning){
        await loadExllamaFull(data.model)
    }

    const body:LocalGeneratorItem = {
        prompt: data.prompt ?? null,
        temperature: data.temperature,
        top_k: data.top_k ?? null,
        top_p: data.top_p ?? null,
        typical: data.typical ?? null,
        max_new_tokens: data.max_new_tokens ?? null,
        "min_p": data.min_p ?? null,
        "token_repetition_penalty_max": data.token_repetition_penalty_max ?? null,
        "token_repetition_penalty_sustain":data.token_repetition_penalty_sustain ?? null,
        "token_repetition_penalty_decay":data.token_repetition_penalty_decay ?? null,
        "beams":data.beams ?? null,
        "beam_length":data.beam_length ?? null,
        "disallowed_tokens": data.disallowed_tokens ?? null,
    }

    console.log("generating")

    const gen = await fetch("http://localhost:7239/generate/", {
        body: JSON.stringify(body),
        headers: {
            'x-risu-key': await getServerKey(),
            'Content-Type': 'application/json'
        },
        method: "POST"
    })

    if(gen.status !== 200){
        alertError("Error when generating: " + await gen.text())
    }

    let res:string = await gen.json()

    res = res.substring(prompt.length)

    return res

}