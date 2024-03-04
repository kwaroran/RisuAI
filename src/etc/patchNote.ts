export const patchNote = {
    version: "1.78",
    content: 
`
# Update 1.78
- Added Modules
  - Modules are package of triggers, regex, and lorebook
  - You can enable globally, or enable only in specific chat
  - Designed for easy sharing and activation/deactivation.
- Removed global regex and lorebook
  - This would be replaced by modules
  - Old global regex and lorebook will be converted to modules 
- Fixed Claude prompting
- Settings menu would be remembered
- Added persona portraits (#289)
- Added gpt-3.5-turbo-0125 (#288)
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