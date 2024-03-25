export const patchNote = {
    version: "1.88",
    content: 
`
# Update 1.88
- Added DeepLX API support for translation #328
- Added ElevenLabs Multilingual support #328
- Added CharacterJS API support for Background Embedding #324
- Added CodeMinor based syntax highlighting on input #325
- Added ST preset import support
- Reworked Variable system, now variables are stored in CharacterJS states, rather than in the chat context

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