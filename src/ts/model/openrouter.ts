import { get } from "svelte/store"
import { DataBase } from "../storage/database"

export async function openRouterModels() {
    try {
        const db = get(DataBase)
        let headers = {
            "Authorization": "Bearer " + db.openrouterKey,
            "Content-Type": "application/json"
        }

        const aim = fetch("https://openrouter.ai/api/v1/models", {
            headers: headers
        })  
        const res = await (await aim).json()
        return res.data.map((v:any) => {
            return v.id
        })
    } catch (error) {
        return []
    }
}