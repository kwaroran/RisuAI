export const patchNote = {
    version: "1.71",
    content: 
`
# Update 1.71
- Added VITS support
 - Added VITS model import/export
- Bug fixes
`
}

export function getPatchNote(version: string){
    if(patchNote.version.split(".")[1] === version.split(".")[1] && patchNote.version.split(".")[0] === version.split(".")[0]){
        return patchNote.content
    }
    return ''
}