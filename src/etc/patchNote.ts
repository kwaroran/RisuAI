export const patchNote = {
    version: "1.104",
    content: 
`
# Update 1.104
- Added experimental Hypamemory V2
- Added catalog list menu
- Added catalog trash menu
- Added trash
 - Now if you delete a character, it will be moved to the trash instead of being deleted permanently
 - You can restore the character from the trash
 - Characters in the trash will be deleted permanently after 3 days
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