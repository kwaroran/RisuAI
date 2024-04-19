export const patchNote = {
    version: "1.96",
    content: 
`
# Update 1.96
- Added Openrouter Repetition penalty
- Added Openrouter Min P
- Added Openrouter Top A
- Added Custom Tokenizer settings for both Openrouter and Custom
- Added Remove Incomplete Sentences option
`
}

export function getPatchNote(version: string){
    if(patchNote.version.split(".")[1] === version.split(".")[1] && patchNote.version.split(".")[0] === version.split(".")[0]){
        return patchNote
    }
return {
        version: version.split(".")[0] + "." + version.split(".")[1],
        content: ""
    }
}