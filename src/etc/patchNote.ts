export const patchNote = {
    version: "1.87",
    content: 
`
# Update 1.87
- Changed name of Reverse Proxy to Custom (OpenAI-Compatible)
- Added Additional Parameters to Custom (OpenAI-Compatible)
- Added Height mode option
- Fixed file post not working on Custom (OpenAI-Compatible)
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