export const patchNote = {
    version: "1.103",
    content: 
`
# Update 1.103
- Made logit_bias work for all gpt-based multimodal models (#418)
- Added supports of gpt-4o tokenizer for reverse_proxy (#418)
- Added GPT-4o in Custom (OpenAI-compatible) (#419)
- Added Tag autocomplete in RisuRealm upload
- Fixed GPT-4o image multimodal feature not working properly
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