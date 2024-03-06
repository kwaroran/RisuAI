export const patchNote = {
    version: "1.82",
    content: 
`
# Update 1.82
- Added native fetch handling for local version
  - This would make the fetch request faster and more stable
  - This would solve many issues with fetch request on local version
- Added Claude-3 streaming
- Force Plain Fetch is now unrecommended
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