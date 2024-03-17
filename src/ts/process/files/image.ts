import localforage from "localforage";
import { selectSingleFile } from "../../util";
import { v4 } from "uuid";
import { DataBase } from "../../storage/database";
import { get } from "svelte/store";
import { checkImageType } from "../../parser";

const inlayStorage = localforage.createInstance({
    name: 'inlay',
    storeName: 'inlay'
})

export async function postInlayImage(img:{
    name:string,
    data:Uint8Array
}){

    const extention = img.name.split('.').at(-1)
    const imgObj = new Image()
    imgObj.src = URL.createObjectURL(new Blob([img.data], {type: `image/${extention}`}))

    return await writeInlayImage(imgObj, {
        name: img.name,
        ext: extention
    })
}

export async function writeInlayImage(imgObj:HTMLImageElement, arg:{name?:string, ext?:string} = {}) {

    let drawHeight = 0
    let drawWidth = 0
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    await new Promise((resolve) => {
        imgObj.onload = () => {
            drawHeight = imgObj.height
            drawWidth = imgObj.width

            //resize image to fit inlay, if it's too big (max 1024px)
            if(drawHeight > 1024){
                drawWidth = drawWidth * (1024 / drawHeight)
                drawHeight = 1024
            }
            if(drawWidth > 1024){
                drawHeight = drawHeight * (1024 / drawWidth)
                drawWidth = 1024
            }
            drawHeight = Math.floor(drawHeight)
            drawWidth = Math.floor(drawWidth)

            canvas.width = drawWidth
            canvas.height = drawHeight
            ctx.drawImage(imgObj, 0, 0, drawWidth, drawHeight)
            resolve(null)
        }
    })
    const dataURI = canvas.toDataURL('image/png')


    const imgid = v4()

    await inlayStorage.setItem(imgid, {
        name: arg.name ?? imgid,
        data: dataURI,
        ext: arg.ext ?? 'png',
        height: drawHeight,
        width: drawWidth
    })

    return `${imgid}`
}

export async function getInlayImage(id: string){
    const img:{
        name: string,
        data: string
        ext: string
        height: number
        width: number
    } = await inlayStorage.getItem(id)
    if(img === null){
        return null
    }
    return img
}

export function supportsInlayImage(){
    const db = get(DataBase)
    return db.aiModel.startsWith('gptv') || (db.aiModel === 'reverse_proxy' && db.proxyRequestModel?.startsWith('gptv')) || db.aiModel === 'gemini-pro-vision'
            || db.aiModel.startsWith('claude-3') || db.proxyRequestModel?.startsWith('claude-3')
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