export const patchNote = {
    version: "1.102",
    content: 
`
# Update 1.102
- Changed download URL notification
- Fixed hanurai to skip query chats when push to processor (#400)
- Fixed ollama's hardcoded url (#404)
- Added New Option Combine Translation (#405)
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