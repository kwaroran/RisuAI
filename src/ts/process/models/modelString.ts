import { getDatabase } from "src/ts/storage/database.svelte";

export function getGenerationModelString(){
    const db = getDatabase()
    switch (db.aiModel){
        case 'reverse_proxy':
            return 'custom-' + (db.reverseProxyOobaMode ? 'ooba' : db.customProxyRequestModel)
        case 'openrouter':
            return 'openrouter-' + db.openrouterRequestModel
        default:
            return db.aiModel
    }
}