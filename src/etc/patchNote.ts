export const patchNote = {
    version: "1.99",
    content: 
`
# Update 1.99
- Added Playground
  - Added Chat Playground
  - Added Embedding Playground
  - Added Tokenization Playground
  - Added Syntax Playground
  - Added Jinja Playground
- Added Openrouter instruct mode
- Improved embedding performance
- Now Chat prompt item in prompt template would not show chat range by default
- Fixed Harunai enable option not appearing
- Fixed Approximate Tokens displaying wrong number
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