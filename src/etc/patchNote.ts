export const patchNote = {
    version: "1.101",
    content: 
`
# Update 1.101
- Added ≤ (or <=) operator to {{calc::A}} cbs
- Added ≥ (or >=) operator to {{calc::A}} cbs
- Added = (or ==) operator to {{calc::A}} cbs
- Now | and & operators' precedence is 1, instead of 0
- || now works as alternative to | operator
- && now works as alternative to & operator
- {{calc::A}} cbs is now set to 0 by default, instead of NaN
- {{calc::A}} cbs now automatically fills non-existing values with 0
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