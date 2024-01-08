export const patchNote = {
    version: "1.73",
    content: 
`
# Update 1.73
- Added WebLLM Local
 - WebLLM Local is a option for users who want to use LLM directly on their computer, without sending any data to the server.
 - WebLLM Local is experimental, and may not work on all devices.
 - Currently WebLLM Local only supports three models, but more will be added in the future.
 - Also, in future updates, You may be able to use WebLLM Local with any transformer model.
 - Currently WebLLM Local only supports CPU, but GPU support with WebGPU will be added in the future.
`
}

export function getPatchNote(version: string){
    if(patchNote.version.split(".")[1] === version.split(".")[1] && patchNote.version.split(".")[0] === version.split(".")[0]){
        return patchNote.content
    }
    return ''
}