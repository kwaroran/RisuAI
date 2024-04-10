export const patchNote = {
    version: "1.95",
    content: 
`
# Update 1.95
- Added New character import screen
- Added Metadata viewer for chat
- Changed default prompt
- Changed High contrast text color
- Changed SupaMemory and HypaMemory to return one chunk instead of multiple
- Made progress circle color to change dynamically depending how the progress is
- Imported flag would be saved when character is imported
- Fixed Realm UI cutoff
- Fixed Realm import not working for new URLs
- Fixed Error message in SupaMemory returning [Object Object]
- Fixed HypaMemory not running even the HypaMemory is enabled
- Fixed HypaMemory and SupaMemory returning same result
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