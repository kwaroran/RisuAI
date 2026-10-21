import { getDatabase } from "src/ts/storage/database.svelte";

export function getGenerationModelString(name?:string){
    const db = getDatabase()
    switch (name ?? db.aiModel){
        case 'reverse_proxy':
            return 'custom-' + (db.reverseProxyOobaMode ? 'ooba' : db.customProxyRequestModel)
        case 'openrouter':
            return 'openrouter-' + db.openrouterRequestModel
        case 'orcarouter':
            return 'orcarouter-' + db.orcarouterRequestModel
        case 'nanogpt': {
            const modelLabel = db.nanogptRequestModelName || db.nanogptRequestModel
            return 'NanoGPT ' + modelLabel + (db.nanogptUseSubscriptionEndpoint ? ' [SUB]' : '')
        }
        case 'ollama-hosted':
        case 'ollama-cloud': {
            const modelLabel = name === 'ollama-cloud'
                ? db.ollamaCloudModelName || db.ollamaCloudModel
                : db.ollamaModelName || db.ollamaModel
            return `Ollama ${name === 'ollama-cloud' ? 'Cloud' : 'Local'} ${modelLabel}`
        }
        default:
            return name ?? db.aiModel
    }
}
