import localforage from "localforage";
import { selectSingleFile } from "./util";
import { v4 } from "uuid";
import { DataBase } from "./storage/database";
import { get } from "svelte/store";

const inlayStorage = localforage.createInstance({
    name: 'inlay',
    storeName: 'inlay'
})

export async function postInlayImage(){
    const img = await selectSingleFile([
        //image format
        'jpg',
        'jpeg',
        'png',
        'webp'
    ])

    if(!img){
        return null
    }

    const extention = img.name.split('.').at(-1)

    //darw in canvas to convert to png
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const imgObj = new Image()
    let drawHeight, drawWidth = 0
    imgObj.src = URL.createObjectURL(new Blob([img.data], {type: `image/${extention}`}))
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
        name: img.name,
        data: dataURI,
        ext: extention,
        height: drawHeight,
        width: drawWidth
    })

    return `{{inlay::${imgid}}}`
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
    return db.aiModel.startsWith('gptv')
}