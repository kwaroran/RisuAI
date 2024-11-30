import { hubURL } from "../characterCards";
import { getDatabase } from "../storage/database.svelte";

export function keiServerURL(){
    const db = getDatabase()
    if(db.keiServerURL) return db.keiServerURL;
    return hubURL + "/kei";
}