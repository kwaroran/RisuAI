import localforage from "localforage";
import { v4 } from "uuid";
import { getDatabase } from "../../storage/database.svelte";
import { checkImageType } from "../../parser.svelte";
import { getModelInfo, LLMFlags } from "src/ts/model/modellist";

const inlayImageExts = [
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'
]

const inlayAudioExts = [
    'wav', 'mp3', 'ogg', 'flac'
]

const inlayVideoExts = [
    'webm', 'mp4', 'mkv'
]

const inlayStorage = localforage.createInstance({
    name: 'inlay',
    storeName: 'inlay'
})

export async function postInlayAsset(img:{
    name:string,
    data:Uint8Array
}){

    const extention = img.name.split('.').at(-1)
    const imgObj = new Image()

    if(inlayImageExts.includes(extention)){
        imgObj.src = URL.createObjectURL(new Blob([img.data], {type: `image/${extention}`}))

        return await writeInlayImage(imgObj, {
            name: img.name,
            ext: extention
        })
    }

    if(inlayAudioExts.includes(extention)){
        const b64 = Buffer.from(img.data).toString('base64')
        const dataURI = `data:audio/${extention};base64,${b64}`
        const imgid = v4()

        await inlayStorage.setItem(imgid, {
            name: img.name,
            data: dataURI,
            ext: extention,
            type: 'audio'
        })

        return `${imgid}`
    }

    if(inlayVideoExts.includes(extention)){
        const b64 = Buffer.from(img.data).toString('base64')
        const dataURI = `data:video/${extention};base64,${b64}`
        const imgid = v4()

        await inlayStorage.setItem(imgid, {
            name: img.name,
            data: dataURI,
            ext: extention,
            type: 'video'
        })

        return `${imgid}`
    }

    return null
}

export async function writeInlayImage(imgObj:HTMLImageElement, arg:{name?:string, ext?:string, id?:string} = {}) {

    let drawHeight = 0
    let drawWidth = 0
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    await new Promise((resolve) => {
        imgObj.onload = () => {
            drawHeight = imgObj.height
            drawWidth = imgObj.width

            //resize image to fit inlay, if total pixels exceed 1024*1024
            const maxPixels = 1024 * 1024
            const currentPixels = drawHeight * drawWidth
            
            if(currentPixels > maxPixels){
                const scaleFactor = Math.sqrt(maxPixels / currentPixels)
                drawWidth = Math.floor(drawWidth * scaleFactor)
                drawHeight = Math.floor(drawHeight * scaleFactor)
            }

            canvas.width = drawWidth
            canvas.height = drawHeight
            ctx.drawImage(imgObj, 0, 0, drawWidth, drawHeight)
            resolve(null)
        }
    })
    const dataURI = canvas.toDataURL('image/png')


    const imgid = arg.id ?? v4()

    await inlayStorage.setItem(imgid, {
        name: arg.name ?? imgid,
        data: dataURI,
        ext: 'png',
        height: drawHeight,
        width: drawWidth,
        type: 'image'
    })

    return `${imgid}`
}

export async function getInlayAsset(id: string){
    const img:{
        name: string,
        data: string
        ext: string
        height: number
        width: number
        type: 'image'|'video'|'audio'
    } = await inlayStorage.getItem(id)
    if(img === null){
        return null
    }
    return img
}

export async function setInlayAsset(id: string, img:{
    name: string,
    data: string,
    ext: string,
    height: number,
    width: number,
    type: 'image'|'video'|'audio'
}){
    await inlayStorage.setItem(id, img)
}

export function supportsInlayImage(){
    const db = getDatabase()
    return getModelInfo(db.aiModel).flags.includes(LLMFlags.hasImageInput)
}

export async function reencodeImage(img:Uint8Array){
    if(checkImageType(img) === 'PNG'){
        return img
    }
    const canvas = document.createElement('canvas')
    const imgObj = new Image()
    imgObj.src = URL.createObjectURL(new Blob([img], {type: `image/png`}))
    await imgObj.decode()
    let drawHeight = imgObj.height
    let drawWidth = imgObj.width
    canvas.width = drawWidth
    canvas.height = drawHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(imgObj, 0, 0, drawWidth, drawHeight)
    const b64 = canvas.toDataURL('image/png').split(',')[1]
    const b = Buffer.from(b64, 'base64')
    return b
}