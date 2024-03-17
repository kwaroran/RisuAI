export const patchNote = {
    version: "1.84",
    content: 
`
# Update 1.84
# Changes
- Added \`{{endswith::A::B}}\`
- Added \`{{contains::A::B}}\`
- Added \`{{replace::A::B::C}}\`
- Added \`{{split::A::B}}\`
- Added \`{{join::A::B}}\`
- Added \`{{length::A}}\`
- Added \`{{arraylength::A}}\`
- Added \`{{lower::A}}\`
- Added \`{{upper::A}}\`
- Added \`{{capitalize::A}}\`
- Added \`{{round::A}}\`
- Added \`{{floor::A}}\`
- Added \`{{ceil::A}}\`
- Added \`{{abs::A}}\`
- Fix Claude streaming on ax. model
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