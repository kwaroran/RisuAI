export const patchNote = {
    version: "1.92",
    content: 
`
# Update 1.93.1
- Added {{#each A B}} syntax for looping through arrays
- Added {{range::A}} syntax which returns an array of numbers from 0 to A
- Added {{assetlist}} and {{emotionlist}} which returns a list of assets and emotions
- Added functionality to update card to realm optionally
- Changed {{history}} behavior to return the array of history
- Fixed a bug where {{#if}} was not working properly when its nested multiple times
- Removed <Pure> tag dude to buggy behavior
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