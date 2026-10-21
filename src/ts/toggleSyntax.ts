// Dependency-light toggle-syntax helpers shared by the promptInfo capture
// path (src/ts/process/index.svelte.ts), the toggle sidebar
// (src/lib/SideBars/Toggles.svelte, via re-export from src/ts/util), and
// unit tests.
//
// This module intentionally has zero imports: importing it must never drag
// Svelte/store initialization into Vitest workers. Previously these helpers
// lived in src/ts/util, whose broad import graph crashed the full test run
// with unhandled store-init errors (see PR #1623 CI follow-up).

export type sidebarToggleGroup = {
    key?:string,
    value?:string,
    type:'group',
    children:sidebarToggle[]
}

export type sidebarToggleGroupEnd = {
    key?:string,
    value?:string,
    type:'groupEnd',
}

export type sidebarToggle =
    | sidebarToggleGroup
    | sidebarToggleGroupEnd
    | {
        key?:string,
        value?:string,
        type:'caption',
    } 
    | {
        key?:string,
        value?:string,
        type:'divider',
    } 
    | {
        key:string,
        value:string,
        type:'select',
        options:string[]
    }
    | {
        key:string,
        value:string,
        type:'text'|'textarea'|undefined,
        options?:string[]
    }

export function parseToggleSyntax(template:string){
    try {
        if(!template){
            return []
        }
    
        const keyValue:sidebarToggle[] = []
    
        const splited = template.split('\n')

        for(const line of splited){
            const [key, value, type, option] = line.split('=')
            if(type === 'group' || type === 'groupEnd' || type === 'divider'){
                keyValue.push({
                    key,
                    value,
                    type,
                    children: []
                })
            } else if(type === 'caption' && value){
                keyValue.push({
                    key,
                    value,
                    type
                })
            } else if((key && value)){
                keyValue.push({
                    key,
                    value,
                    type: type === 'select' || type === 'text' || type === 'textarea' ? type : undefined,
                    options: option?.split(',') ?? []
                })
            }
        }

        return keyValue   
    } catch (error) {
        console.error(error)
        return []
    }
}

export function buildPromptInfoToggles(
    customPromptTemplateToggle: string,
    moduleToggles: string,
    characterToggles: string | undefined,
    chatVariables: {[key:string]:string}
){
    // Join sources with newlines like the toggle sidebar does, so a source
    // without a trailing newline cannot merge with the next source's first line.
    const template = [customPromptTemplateToggle, moduleToggles, characterToggles ?? '']
        .filter(source => source)
        .join('\n')
    return parseToggleSyntax(template)
        .flatMap(toggle => {
            const raw = chatVariables[`toggle_${toggle.key}`]
            if (toggle.type === 'select' || toggle.type === 'text') {
                return [{ key: toggle.value, value: toggle.options[raw] }];
            }
            if (raw === '1') {
                return [{ key: toggle.value, value: 'ON' }];
            }
            return [];
        })
}
