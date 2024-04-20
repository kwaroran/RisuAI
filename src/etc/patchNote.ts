export const patchNote = {
    version: "1.97",
    content: 
`
# Update 1.97
- Replaced old Prefix-based instruct model formatter to jinja based instruct model formatter
- Added Llama3 formatter template
- Added Llama2 formatter template
- Added Chatml formatter template
- Added GPT2 formatter template
- Added Gemma formatter template
- Added Mistral formatter template
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