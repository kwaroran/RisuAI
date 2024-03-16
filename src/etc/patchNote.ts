export const patchNote = {
    version: "1.83",
    content: 
`
# Update 1.83
- Added multi language support for creator's quote
- Added Network error resolve tips
- Added iPad fullscreen compatibility
- Changed requirements for creator's quote on uploading to RisuRealm
- Fixed inlayed emotion images not displaying properly
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