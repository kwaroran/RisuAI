export const patchNote = {
    version: "1.77",
    content: 
`
# Update 1.77
- Added Risu RCC export
  - Added password protection
  - Added license for file export
- Added memory limit border thickness (#286)
- Minor fixes
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