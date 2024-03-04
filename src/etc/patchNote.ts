export const patchNote = {
    version: "1.81",
    content: 
`
# Update 1.81
- Added {{model}}
  - {{model}} outputs the current ai model that is being used
- Added {{axmodel}}
  - {{axmodel}} outputs the current ax. model that is being used
- Added {{startswith::A::B}}
  - {{startswith::A::B}} returns true if A starts with B
- Improved Claude 3 format handling
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