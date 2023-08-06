import localforage from "localforage";
import { similarity } from "ml-distance";
import { globalFetch } from "src/ts/storage/globalApi";
import { runEmbedding } from "../embedding/transformers";


export class HypaProcesser{
    oaikey:string
    vectors:memoryVector[]
    forage:LocalForage
    model:'ada'|'MiniLM'

    constructor(model:'ada'|'MiniLM'){
        this.forage = localforage.createInstance({
            name: "hypaVector"
        })
        this.vectors = []
        this.model = model
    }

    async embedDocuments(texts: string[]): Promise<number[][]> {
        const subPrompts = chunkArray(texts,512);
    
        const embeddings: number[][] = [];
    
        for (let i = 0; i < subPrompts.length; i += 1) {
          const input = subPrompts[i];
    
          const data = await this.getEmbeds(input)
    
          embeddings.push(...data);
        }
    
        return embeddings;
    }
    
    
    async getEmbeds(input:string[]|string) {
        if(this.model === 'MiniLM'){
            const inputs:string[] = Array.isArray(input) ? input : [input]
            let results:Float32Array[] = []
            for(let i=0;i<inputs.length;i++){
                const res = await runEmbedding(inputs[i])
                results.push(res)
            }
            //convert to number[][]
            const result:number[][] = []
            for(let i=0;i<results.length;i++){
                const res = results[i]
                const arr:number[] = []
                for(let j=0;j<res.length;j++){
                    arr.push(res[j])
                }
                result.push(arr)
            }
            return result
        }
        const gf = await globalFetch("https://api.openai.com/v1/embeddings", {
            headers: {
            "Authorization": "Bearer " + this.oaikey
            },
            body: {
            "input": input,
            "model": "text-embedding-ada-002"
            }
        })
        const data = gf.data
    
    
        if(!gf.ok){
            throw gf.data
        }
    
        const result:number[][] = []
        for(let i=0;i<data.data.length;i++){
            result.push(data.data[i].embedding)
        }
    
        return result
    }


    
    async addText(texts:string[]) {

        for(let i=0;i<texts.length;i++){
            const itm:memoryVector = await this.forage.getItem(texts[i])
            if(itm){
                itm.alreadySaved = true
                this.vectors.push(itm)
            }
        }

        texts = texts.filter((v) => {
            for(let i=0;i<this.vectors.length;i++){
                if(this.vectors[i].content === v){
                    return false
                }
            }
            return true
        })

        if(texts.length === 0){
            return
        }
        const vectors = await this.embedDocuments(texts)

        const memoryVectors:memoryVector[] = vectors.map((embedding, idx) => ({
            content: texts[idx],
            embedding
        }));

        for(let i=0;i<memoryVectors.length;i++){
            const vec = memoryVectors[i]
            if(!vec.alreadySaved){
                await this.forage.setItem(texts[i], vec)
            }
        }

        this.vectors = memoryVectors.concat(this.vectors)
    }

    async similaritySearch(query: string) {
        const results = await this.similaritySearchVectorWithScore((await this.getEmbeds(query))[0],);
    
        console.log(results)
        return results.map((result) => result[0]);
    }

    async similaritySearchVectorWithScore(
        query: number[],
      ): Promise<[string, number][]> {
          const memoryVectors = this.vectors
          const searches = memoryVectors
              .map((vector, index) => ({
              similarity: similarity.cosine(query, vector.embedding),
              index,
              }))
              .sort((a, b) => (a.similarity > b.similarity ? -1 : 0))
      
          const result: [string, number][] = searches.map((search) => [
              memoryVectors[search.index].content,
              search.similarity,
          ]);
      
          return result;
      }
}


type memoryVector = {
    embedding:number[]
    content:string,
    alreadySaved?:boolean
}

const chunkArray = <T>(arr: T[], chunkSize: number) =>
    arr.reduce((chunks, elem, index) => {
        const chunkIndex = Math.floor(index / chunkSize);
        const chunk = chunks[chunkIndex] || [];
        chunks[chunkIndex] = chunk.concat([elem]);
        return chunks;
}, [] as T[][]);