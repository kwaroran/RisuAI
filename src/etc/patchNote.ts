export const patchNote = {
    version: "1.110",
    content: 
`
# Update 1.110 (Modules Update)
- Improved module GUI
  - Added search bar
  - Now modules are ordered by name
  - Now global modules are ordered in the end of the list in the chat GUI
- Added module export and import from Realm
- Added preset import from Realm
- Added \`{{position::<name>}}\` CBS
   - This CBS will be replaced to lorebooks that uses \`@@position pt_<name>\` decorator
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