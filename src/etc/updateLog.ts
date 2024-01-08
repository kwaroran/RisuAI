export const patchNote = {
    version: "1.72",
    content: 
`
# Update 1.72
- Added custom chain of thoughts
- Added thought tag depth
- Added Openrouter fallback option
- Added Openrouter middle-out option
`
}

export function getPatchNote(version: string){
    if(patchNote.version.split(".")[1] === version.split(".")[1] && patchNote.version.split(".")[0] === version.split(".")[0]){
        return patchNote.content
    }
    return ''
}