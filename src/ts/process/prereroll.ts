let rerolls:{[key:string]:string[]} = {};
let rerollIndex:{[key:string]:number} = {};

export function Prereroll(genId:string){
    if(rerolls[genId]){
        let index = rerollIndex[genId];
        index += 1;
        rerollIndex[genId] = index;
        return rerolls[genId][index] ?? null;
    }
    return null;
}
export function PreUnreroll(genId:string){
    if(rerolls[genId]){
        let index = rerollIndex[genId];
        index -= 1;
        if(index < 0){
            return null
        }
        rerollIndex[genId] = index;
        return rerolls[genId][index] ?? null;
    }
    return null;
}

export function addRerolls(genId:string, values:string[]){
    rerolls[genId] = values;
    rerollIndex[genId] = 0;
}