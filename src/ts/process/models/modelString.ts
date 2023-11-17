import { DataBase } from "src/ts/storage/database";
import { get } from "svelte/store";

export function getGenerationModelString(){
    const db = get(DataBase)
    switch (db.aiModel){
        case 'reverse_proxy':
            return 'reverse_proxy-' + (db.reverseProxyOobaMode ? 'ooba' : db.proxyRequestModel)
        case 'openrouter':
            return 'openrouter-' + db.openrouterRequestModel
        default:
            return db.aiModel
    }
}