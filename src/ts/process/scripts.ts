import type { character } from "../database";

const dreg = /{{data}}/g

export function processScript(char:character, data:string, mode:'editinput'|'editoutput'|'editprocess'){
    for (const script of char.customscript){
        if(script.type === mode){
            const reg = new RegExp(script.in,'g')
            data = data.replace(reg, (v) => {
                return script.out.replace(dreg, v)
            })
        }
    }
    return data
}