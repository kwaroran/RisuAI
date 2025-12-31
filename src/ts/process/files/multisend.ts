import { getDatabase, setDatabase } from 'src/ts/storage/database.svelte';
import { selectedCharID } from 'src/ts/stores.svelte';
import { get } from 'svelte/store';
import { doingChat, sendChat } from '../index.svelte';
import { downloadFile } from 'src/ts/globalApi.svelte';
import { isTauri } from "src/ts/platform"
import { HypaProcesser } from '../memory/hypamemory';
import { BufferToText as BufferToText, selectMultipleFile } from 'src/ts/util';
import { postInlayAsset } from './inlays';

type sendFileArg = {
    file:string
    query:string
}

async function sendPofile(arg:sendFileArg){

    let result = ''
    let msgId = ''
    let note = ''
    let speaker = ''
    let parseMode = 0
    const db = getDatabase()
    let currentChar = db.characters[get(selectedCharID)]
    let currentChat = currentChar.chats[currentChar.chatPage]
    const lines = arg.file.split('\n')
    for(let i=0;i<lines.length;i++){
        console.log(i)
        const line = lines[i]
        if(line === ''){
            if(msgId === ''){
                result += '\n'
                continue
            }
            let text = msgId
            if(speaker !== ''){
                text = `Speaker: ${speaker}\n${text}`
            }
            if(note !== ''){
                text = `Note: ${note}\n${text}`
            }
            currentChat.message.push({
                role: 'user',
                data: text
            })
            currentChar.chats[currentChar.chatPage] = currentChat
            db.characters[get(selectedCharID)] = currentChar
            setDatabase(db)
            doingChat.set(false)
            await sendChat(-1);
            currentChar = db.characters[get(selectedCharID)]
            currentChat = currentChar.chats[currentChar.chatPage]
            const res = currentChat.message[currentChat.message.length-1]
            const msgStr = res.data.split('\n').filter((a) => {
                return a !== ''
            }).map((str) => {
                return `"${str.replaceAll('"', '\\"')}"`
            }).join('\n')
            result += `msgstr ""\n${msgStr}\n\n`
            note = ''
            speaker = ''
            msgId = ''
            if(isTauri){
                await downloadFile('translated.po', result)
            }
            continue
        }
        if(line.startsWith('#. Note =')){
            note = line.replace('#. Notes =', '').trim()
            continue
        }
        if(line.startsWith('#. Speaker =')){
            speaker = line.replace('#. Speaker =', '').trim()
            continue
        }
        if(line.startsWith('msgid')){
            parseMode = 0
            msgId = line.replace('msgid ', '').trim().replaceAll('\\"', '♠#').replaceAll('"', '').replaceAll('♠#', '\\"')
            if(msgId === ''){
                parseMode = 1
            }
            result += line + '\n'
            continue
        }
        if(parseMode === 1 && line.startsWith('"') && line.endsWith('"')){
            msgId += line.substring(1, line.length-1).replaceAll('\\"', '"')
            result += line + '\n'
            continue
        }
        if(line.startsWith('msgstr')){
            if(msgId === ''){
                result += line + '\n'
                parseMode = 0
            }
            else{
                parseMode = 2
            }
            continue
        }
        if(parseMode === 2 && line.startsWith('"') && line.endsWith('"')){
            continue
        }
        result += line + '\n'

        if(i > 100){
            break //prevent too long message in testing
        }

    }
    await downloadFile('translated.po', result)
}

async function sendPDFFile(arg:sendFileArg) {
    const pdfjsLib = (await import('pdfjs-dist'));
    const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker?worker&url');
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker.default;
    const pdf = await pdfjsLib.getDocument({data: arg.file}).promise;
    const texts:string[] = []
    for(let i = 1; i<=pdf.numPages; i++){
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const items = content.items as {str:string}[];
        for(const item of items){
            texts.push(item.str)
        }
    }
    console.log(texts)
    const hypa = new HypaProcesser()
    hypa.addText(texts)
    const result = await hypa.similaritySearch(arg.query)
    let message = ''
    for(let i = 0; i<result.length; i++){
        message += "\n" + result[i]
        if(i>5){
            break
        }
    }
    console.log(message)
    return Buffer.from(`<File>\n${message}\n</File>\n`).toString('base64')
}

async function sendTxtFile(arg:sendFileArg) {
    const lines = arg.file.split('\n').filter((a) => {
        return a !== ''
    })
    const hypa = new HypaProcesser()
    hypa.addText(lines)
    const result = await hypa.similaritySearch(arg.query)
    let message = ''
    for(let i = 0; i<result.length; i++){
        message += "\n" + result[i]
        if(i>5){
            break
        }
    }
    console.log(message)
    return Buffer.from(`<File>\n${message}\n</File>\n`).toString('base64')
}

async function sendXMLFile(arg:sendFileArg) {
    const hypa = new HypaProcesser()
    let nodeTexts:string[] = []
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(arg.file, "text/xml");
    const nodes = xmlDoc.getElementsByTagName('*')
    for(const node of nodes){
        nodeTexts.push(node.textContent)
    }
    hypa.addText(nodeTexts)
    const result = await hypa.similaritySearch(arg.query)
    let message = ''
    for(let i = 0; i<result.length; i++){
        message += "\n" + result[i]
        if(i>5){
            break
        }
    }
    console.log(message)
    return Buffer.from(`<File>\n${message}\n</File>\n`).toString('base64')    
}

type postFileResult = postFileResultAsset | postFileResultVoid | postFileResultText

type postFileResultAsset = {
    data: string,
    type: 'asset',
}

type postFileResultVoid = {
    type: 'void',
}

type postFileResultText = {
    data: string,
    type: 'text',
    name: string
}
export async function postChatFile(query:string|{
    name:string,
    data:Uint8Array
}):Promise<postFileResult[]>{
    const files = typeof(query) === 'string' ? (await selectMultipleFile([
        //image format
        'jpg',
        'jpeg',
        'png',
        'webp',
        'gif',
        'avif',

        //audio format
        'wav',
        'mp3',
        'ogg',
        'flac',

        //video format
        'mp4',
        'webm',
        'mpeg',
        'avi',

        //other format
        'po',
        // 'pdf',
        'txt'
    ])) : [query]

    if(!files){
        return null
    }

    const xquery = typeof(query) === 'string' ? query : ''
    const results: postFileResult[] = []

    for(const file of files){
        const extention = file.name.split('.').at(-1)
        console.log(extention)

        switch(extention){
            case 'po':{
                await sendPofile({
                    file: BufferToText(file.data),
                    query: xquery
                })
                results.push({
                    type: 'void'
                })
                break
            }
            case 'pdf':{
                results.push({
                    type: 'text',
                    data: await sendPDFFile({
                        file: BufferToText(file.data),
                        query: xquery
                    }),
                    name: file.name
                })
                break
            }
            case 'xml':{
                results.push({
                    type: 'text',
                    data: await sendXMLFile({
                        file: BufferToText(file.data),
                        query: xquery
                    }),
                    name: file.name
                })
                break
            }

            //image format
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'webp':
            case 'gif':
            case 'avif':

            //audio format
            case 'wav':
            case 'mp3':
            case 'ogg':
            case 'flac':

            //video format
            case 'mp4':
            case 'webm':
            case 'mpeg':
            case 'avi':{
                const postData = await postInlayAsset(file)
                if(!postData){
                    continue
                }
                results.push({
                    data: postData,
                    type: 'asset'
                })
                break
            }
            case 'txt':{
                results.push({
                    type: 'text',
                    data: await sendTxtFile({
                        file: BufferToText(file.data),
                        query: xquery
                    }),
                    name: file.name
                })
                break
            }
        }
    }

    return results
}