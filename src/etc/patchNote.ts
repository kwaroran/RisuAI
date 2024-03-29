export const patchNote = {
    version: "1.89",
    content: 
`
# Update 1.90.0
- Added {{spread::A}} and {{trim::B}}
- Fixed undefined variable crashing the app
- Now invaild curly brace syntax will be ignored
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