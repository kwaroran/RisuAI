import extract from 'png-chunks-extract';
import encode from 'png-chunks-encode';
import textKey from 'png-chunk-text'

export const PngMetadata = {
    write: (pngBuffer: Uint8Array, metadata: Record<string, string>): Buffer => {
        let chunks:{
            name:string
            data:Uint8Array
        }[] = extract(Buffer.from(pngBuffer));

        chunks = chunks.filter((v) => {
            return v.name.toLocaleLowerCase() !== 'text'
        })

        for (const key in metadata) {
            const value = metadata[key];
            chunks.splice(-1, 0, textKey.encode(key, value))
        }
        const encoded = encode(chunks);
        return encoded
    },
    writeStream:(pngBuffer: Uint8Array, metadata: Record<string, string>): Buffer => {
        let chunks:{
            name:string
            data:Uint8Array
        }[] = extract(Buffer.from(pngBuffer));

        chunks = chunks.filter((v) => {
            return v.name.toLocaleLowerCase() !== 'text'
        })

        for (const key in metadata) {
            const value = metadata[key];
            chunks.splice(-1, 0, textKey.encode(key, value))
        }
        const encoded = encode(chunks);
        return encoded
    },
    filter: (pngBuffer: Uint8Array) => {
        try {
            let chunks:{
                name:string
                data:Uint8Array
            }[] = extract(Buffer.from(pngBuffer));
    
            chunks = chunks.filter((v) => {
                return v.name.toLocaleLowerCase() !== 'text'
            })
    
            const encoded = encode(chunks);
            return encoded   
        } catch (error) {
            return pngBuffer
        }
    }
}