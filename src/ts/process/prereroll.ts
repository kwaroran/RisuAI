import type { Message, MessageGenerationInfo, MessageVariant } from "../storage/database.svelte";

export const MAX_MESSAGE_VARIANTS = 10;

//variants is a gap buffer: the virtual order is variants[0..k-1], active message, variants[k..],
//where k = variantIndex (defaults to variants.length, i.e. active at the end)

function getVariantIndex(msg:Message){
    const len = msg.variants?.length ?? 0;
    const index = msg.variantIndex ?? len;
    return Math.min(Math.max(index, 0), len);
}

function cloneGenerationInfo(info?:MessageGenerationInfo):MessageGenerationInfo|undefined{
    if(!info){
        return undefined;
    }
    return {
        ...info,
        stageTiming: info.stageTiming ? {...info.stageTiming} : undefined,
    };
}

export function switchVariant(msg:Message, dir:1|-1):boolean{
    if(!msg.variants || msg.variants.length === 0){
        return false;
    }
    const index = getVariantIndex(msg);
    const slot = dir === 1 ? index : index - 1;
    if(slot < 0 || slot >= msg.variants.length){
        return false;
    }
    const incoming = msg.variants[slot];
    if(!incoming || typeof incoming.data !== 'string'){
        return false;
    }
    //time is not swapped: cold storage idle detection relies on max message.time
    msg.variants[slot] = {
        data: msg.data,
        time: msg.time,
        saying: msg.saying,
        generationInfo: msg.generationInfo,
    };
    msg.data = incoming.data;
    msg.saying = incoming.saying;
    msg.generationInfo = incoming.generationInfo;
    msg.variantIndex = slot + (dir === 1 ? 1 : 0);
    return true;
}

export function collectVariants(msg:Message):MessageVariant[]{
    const variants = msg.variants ?? [];
    const index = getVariantIndex(msg);
    const active:MessageVariant = {
        data: msg.data,
        time: msg.time,
        saying: msg.saying,
        generationInfo: cloneGenerationInfo(msg.generationInfo),
    };
    return [...variants.slice(0, index), active, ...variants.slice(index)];
}

export function attachVariants(msg:Message, pending:MessageVariant[]){
    if(pending.length === 0){
        return;
    }
    //pending (previous generations) goes before any candidates the message already has
    const existing = msg.variants ?? [];
    const index = getVariantIndex(msg);
    const merged = [...pending, ...existing];
    const overflow = Math.max(merged.length - MAX_MESSAGE_VARIANTS, 0);
    msg.variants = merged.slice(overflow);
    msg.variantIndex = Math.max(index + pending.length - overflow, 0);
}

export function appendCandidateVariants(msg:Message, extras:string[], generationInfo?:MessageGenerationInfo){
    if(extras.length === 0){
        return;
    }
    const variants = msg.variants ?? [];
    const index = getVariantIndex(msg);
    const added:MessageVariant[] = extras.map((data) => ({
        data,
        time: msg.time,
        generationInfo: cloneGenerationInfo(generationInfo),
    }));
    const merged = [...variants.slice(0, index), ...added, ...variants.slice(index)];
    const overflow = Math.max(merged.length - MAX_MESSAGE_VARIANTS, 0);
    msg.variants = merged.slice(overflow);
    msg.variantIndex = Math.max(index - overflow, 0);
}
