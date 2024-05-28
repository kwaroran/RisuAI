export const patchNote = {
    version: "1.108",
    content: 
`
# Update 1.108 (Low Level Access)
- Added new character field: Low Level Access
   - Enabling this field will allow you to access the low level functions, like accessing the AI model via triggers
   - Added Run Main Model trigger
   - Added Resend AI trigger
   - Added Check Similarity trigger
   - Added Show Alert trigger
- Added is Truthy condition in trigger
- Fixed lorebook not threatening as a match if the key is not lowercase
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