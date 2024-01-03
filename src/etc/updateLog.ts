export const patchNote = {
    version: "1.70.0",
    content: 
`
# Update 1.70.0
- Added new welcome page
- Added Edit Translation Display in Regex
- Added stabler character card format
- Improved default prompt
- Improved Openrouter support
- Improved Horde support
- Horde isn't unrecommended anymore
- Changed high contrast italic color
- Minor bug fixes
`
}

export function getPatchNote(version: string){
    if(patchNote.version.split(".")[1] === version.split(".")[1] && patchNote.version.split(".")[0] === version.split(".")[0]){
        return patchNote.content
    }
    return ''
}