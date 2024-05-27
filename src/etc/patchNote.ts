export const patchNote = {
    version: "1.107",
    content: 
`
# Update 1.107 (Things & Stuff Update)
- Added custom toggle system in prompt template
- Added default variable setting in prompt template and characters
- Removed experimental flag from HypaMemory V2
- Added HypaMemory V2 chunk size and allocation size setting
- Changed old COT toggle to deprecated, dude to new custom toggle system
- Fixed Supamemory summary not working when generation choices are more than 1
- Fixed triggerscript not handling undefined values as null
- Fixed Character Card V3 export not working or missing fields in specific cases
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