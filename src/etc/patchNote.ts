export const patchNote = {
    version: "1.98",
    content: 
`
# Update 1.98
- Added Hanurai Memory feature
- Added Supamemory boilerplate
- Added Llama3 Tokenizer
- Added Openrouter instruct mode
- Improved vector embedding similarity calculation
- Fixed error alert returning [object Object] instead of the error message
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