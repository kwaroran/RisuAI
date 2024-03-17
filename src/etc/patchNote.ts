export const patchNote = {
    version: "1.85",
    content: 
`
# Update 1.85
- Added Claude-3 vision functionality
- Added local captioning for non-vision models
- Post file button would be available regardless of settings
- Removed 'able post file' setting, since it's always available now
- Fixed creator's quote not updating
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