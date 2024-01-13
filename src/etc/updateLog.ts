export const patchNote = {
    version: "1.74",
    content: 
`
# Update 1.74
- Added (?) button on many settings
- Hypamemory isn't marked as experimental anymore
- Generation Times isn't marked as experimental anymore
- Generation Times will work with streamed responses now
- Removed unused settings
`
}

export function getPatchNote(version: string){
    if(patchNote.version.split(".")[1] === version.split(".")[1] && patchNote.version.split(".")[0] === version.split(".")[0]){
        return patchNote.content
    }
    return ''
}