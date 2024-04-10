export const patchNote = {
    version: "1.94",
    content: 
`
# Update 1.94
- Added "If Value" condition in Trigger Scripts
- Added "Call Trigger" effect in Trigger Scripts
- Added "Stop Sending Prompt" effect in Trigger Scripts
- Added "Run Command" effect in Trigger Scripts
- Added Trigger Scripts' help dialog
- Added "risu-trigger" attribute support to trigger Trigger Scripts in HTML
- Reworked {{button::A::B}} to use with Trigger Scripts
- Trigger Scripts now parses curly braced syntax in attributes
- Fixed Commands not chaining properly
- Fixed Trigger Scripts' variable not saving and syncing properly
- Changed CharacterJS in character to not be shown unless unrecommended option is enabled
- Changed CharacterJS to not be exported in character export
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