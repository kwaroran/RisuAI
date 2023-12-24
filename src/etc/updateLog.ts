export const patchNote = {
    version: "1.68.0",
    content: 
`
- Added Post End
- Added Send Chat as System
- Added Utility Override
- Minor fixes    
`
}

export function getPatchNote(version: string){
    if(patchNote.version.split(".")[1] === version.split(".")[1] && patchNote.version.split(".")[0] === version.split(".")[0]){
        return patchNote.content
    }
    return ''
}