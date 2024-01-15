export const patchNote = {
    version: "1.75",
    content: 
`
# Update 1.75
- Added @@move_top and @@move_bottom in regex script
- Added @@end, @@assistant, @@user, @@system
- depercated @@@end, @@@assistant, @@@user, @@@system for consistency
 - Use newly added two @ version instead
 - deprecated commands could be removed in future update
- Added {{br}}, used for line break
- sendChat error message changed
- fix AWS claude (by @bangonicdd)
- fix TTS replace error when empty string
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