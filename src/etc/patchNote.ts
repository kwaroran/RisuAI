export const patchNote = {
    version: "1.89",
    content: 
`
# Update 1.89.0
- Reworked import card system
  - Now it would read streamed data instead of whole file
  - This would reduce memory usage and increase performance, and also allow to import larger files
- Reworked RisuRealm share system
  - Now it would upload and download streamed data instead of splited assets
  - Added Upload functionallity
- Added /setvar, /addvar, /getvar command
- Fixed trigger scripts using old variable system
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