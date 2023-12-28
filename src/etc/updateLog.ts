export const patchNote = {
    version: "1.69.0",
    content: 
`
# Update 1.69.4
- Added Export as Dataset feature
`
}

export function getPatchNote(version: string){
    if(patchNote.version.split(".")[1] === version.split(".")[1] && patchNote.version.split(".")[0] === version.split(".")[0]){
        return patchNote.content
    }
    return ''
}