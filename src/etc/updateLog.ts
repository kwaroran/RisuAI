export const patchNote = {
    version: "1.69.1",
    content: 
`
# Update 1.69.1
- Added Patch Note
- Added Added Send Name on Non-group Chat option
- Added Send original role option
- Minor fixes 
`
}

export function getPatchNote(version: string){
    if(patchNote.version.split(".")[1] === version.split(".")[1] && patchNote.version.split(".")[0] === version.split(".")[0]){
        return patchNote.content
    }
    return ''
}