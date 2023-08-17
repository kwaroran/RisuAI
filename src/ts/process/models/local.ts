import { invoke } from "@tauri-apps/api/tauri";
import { globalFetch } from "src/ts/storage/globalApi";
import { sleep } from "src/ts/util";
import * as path from "@tauri-apps/api/path";
import { exists } from "@tauri-apps/api/fs";
import { alertClear, alertError, alertMd, alertWait } from "src/ts/alert";
import { get } from "svelte/store";
import { DataBase } from "src/ts/storage/database";
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
    const p = await path.join(await path.appDataDir(), 'local_server')
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
            try {
                const res = await globalFetch("http://localhost:7239/")
                if(res.ok){
                    break
                }
            } catch (error) {}
            await sleep(1000)
        }

        const body:LocalLoaderItem = {
            dir: "exllama",
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


export async function runLocalModel(prompt:string){
    const db = get(DataBase)

    const body:LocalGeneratorItem = {
        prompt: prompt,
        temperature: db.temperature,
        top_k: db.ooba.top_k,
        top_p: db.ooba.top_p,
        typical: db.ooba.typical_p,
        max_new_tokens: db.maxResponse
    }

    const gen = await globalFetch("http://localhost:7239/generate/", {
        body: body
    })

    console.log(gen)
}