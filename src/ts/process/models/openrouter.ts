export async function openRouterModels() {
    try {
        const aim = fetch("https://openrouter.ai/api/v1/models")  
        const res = await (await aim).json()
        return res.data.map((v:any) => {
            return v.id
        })
    } catch (error) {
        return []
    }
}