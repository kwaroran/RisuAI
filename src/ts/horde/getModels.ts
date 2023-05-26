import { sleep } from "../util"

let modelList:string[]|'loading' = null

//until horde is ready
// modelList = []

export async function getHordeModels():Promise<string[]> {
    
    if(modelList === null){
        try {
            modelList = 'loading'
            const models = await fetch("https://stablehorde.net/api/v2/status/models?type=text")
            modelList = ((await models.json()).map((a) => {
                return a.name
            }) as string[])
            return modelList
        } catch (error) {
            modelList = null
            return []        
        }
    }
    else if(modelList === 'loading'){
        while(true){
            if(modelList !== 'loading'){
                return getHordeModels()
            }
            await sleep(10)
        }
    }
    else{
        return modelList
    }
}