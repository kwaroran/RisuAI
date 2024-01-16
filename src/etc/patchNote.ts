export const patchNote = {
    version: "1.76",
    content: 
`
# Update 1.76
- Added Commands
  - /input: Show input dialog and return inputted text
  - /echo: Show toast message
  - /popup: Show popup message
  - /pass: Pass the pipe
  - /buttons: Show button dialog and return selected button
  - /speak: Speak text as TTS
  - /send: Send text to chat as user, without sending to LLM
  - /sendas: Send text to chat as character, with sending to LLM
  - /comment: Adds comment to chat
  - /cut: Cut the text
  - /del: Delete the recent text
  - Most of them are SilyTavern compatible
- Memory Punctuation Removal is now on by default
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