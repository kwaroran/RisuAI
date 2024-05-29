export const patchNote = {
    version: "1.109",
    content: 
`
# Update 1.109 (More triggers update)
- Added new triggers
  - Added Image Generation trigger
  - Added Extract Text with Regex trigger
  - Added Cut Chat trigger
  - Added Modify Chat trigger
- Now modules can have low level access
- Fixed Lorebooks not matching with spaces
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