export const patchNote = {
    version: "1.86",
    content: 
`
# Update 1.86
- Added 'Request info inside chat' option
- Added response info for streamed chat
- Added color scheme customization
- Added color scheme export and import
- Added {{previous_chat_log::A}} syntax
- Minor bug fixes
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