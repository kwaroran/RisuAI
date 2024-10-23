import { get } from "svelte/store";
import { hubURL } from "../characterCards";
import { DataBase } from "../storage/database.svelte";

export function keiServerURL(){
    const db = get(DataBase)
    if(db.keiServerURL) return db.keiServerURL;
    return hubURL + "/kei";
}