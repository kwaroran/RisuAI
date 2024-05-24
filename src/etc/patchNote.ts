export const patchNote = {
    version: "1.105",
    content: 
`
# Update 1.105
- Reworked RisuRealm share screen
 - Now it uses RisuRealm iframe instead of GUI provided by app
- Added RisuRealm preset sharing support
- Added new preset sharing screen
- Added {{first_msg_index}} CBS #436
- Removed RisuRCC dude to low usage
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