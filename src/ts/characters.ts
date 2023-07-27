import { get, writable } from "svelte/store";
import { DataBase, saveImage, setDatabase, type character, type Chat, defaultSdDataFunc } from "./storage/database";
import { alertConfirm, alertError, alertNormal, alertSelect, alertStore } from "./alert";
import { language } from "../lang";
import { encode as encodeMsgpack, decode as decodeMsgpack } from "msgpackr";
import { checkNullish, findCharacterbyId, selectMultipleFile, selectSingleFile, sleep } from "./util";
import { v4 as uuidv4 } from 'uuid';
import { selectedCharID } from "./stores";
import { checkCharOrder, downloadFile, getFileSrc, readImage } from "./storage/globalApi";
import * as yuso from 'yuso'

export function createNewCharacter() {
    let db = get(DataBase)
    db.characters.push(createBlankChar())
    setDatabase(db)
    checkCharOrder()
    return db.characters.length - 1
}

export function createNewGroup(){
    let db = get(DataBase)
    db.characters.push({
        type: 'group',
        name: "",
        firstMessage: "",
        chats: [{
            message: [],
            note: '',
            name: 'Chat 1',
            localLore: []
        }],        chatPage: 0,
        viewScreen: 'none',
        globalLore: [],
        characters: [],
        autoMode: false,
        useCharacterLore: true,
        emotionImages: [],
        customscript: [],
        chaId: uuidv4(),
        firstMsgIndex: -1,
        characterTalks: [],
        characterActive: []
    })
    setDatabase(db)
    checkCharOrder()
    return db.characters.length - 1
}

export async function getCharImage(loc:string, type:'plain'|'css'|'contain') {
    if(!loc || loc === ''){
        if(type ==='css'){
            return ''
        }
        return null
    }
    const filesrc = await getFileSrc(loc)
    if(type === 'plain'){
        return filesrc
    }
    else if(type ==='css'){
        return `background: url("${filesrc}");background-size: cover;`
    }
    else{
        return `background: url("${filesrc}");background-size: contain;background-repeat: no-repeat;background-position: center;`
    }
}

export async function selectCharImg(charId:number) {
    const selected = await selectSingleFile(['png'])
    if(!selected){
        return
    }
    const img = selected.data
    let db = get(DataBase)
    const imgp = await saveImage(img)
    db.characters[charId].image = imgp
    setDatabase(db)
}

export async function selectUserImg() {
    const selected = await selectSingleFile(['png'])
    if(!selected){
        return
    }
    const img = selected.data
    let db = get(DataBase)
    const imgp = await saveImage(img)
    db.userIcon = imgp
    db.personas[db.selectedPersona] = {
        name: db.username,
        icon: db.userIcon,
        personaPrompt: db.personaPrompt
    }
    setDatabase(db)
}

export function saveUserPersona() {
    let db = get(DataBase)
    db.personas[db.selectedPersona] = {
        name: db.username,
        icon: db.userIcon,
        personaPrompt: db.personaPrompt
    }
    setDatabase(db)
}

export function changeUserPersona(id:number, save:'save'|'noSave' = 'save') {
    if(save === 'save'){
        saveUserPersona()
    }
    let db = get(DataBase)
    const pr = db.personas[id]
    db.personaPrompt = pr.personaPrompt
    db.username = pr.name,
    db.userIcon = pr.icon
    db.selectedPersona = id
    setDatabase(db)
    
}

export const addingEmotion = writable(false)

export async function addCharEmotion(charId:number) {
    addingEmotion.set(true)
    const selected = await selectMultipleFile(['png', 'webp', 'gif'])
    if(!selected){
        addingEmotion.set(false)
        return
    }
    let db = get(DataBase)
    for(const f of selected){
        console.log(f)
        const img = f.data
        const imgp = await saveImage(img)
        const name = f.name.replace('.png','').replace('.webp','')
        let dbChar = db.characters[charId]
        if(dbChar.type !== 'group'){
            dbChar.emotionImages.push([name,imgp])
            db.characters[charId] = dbChar
        }
        setDatabase(db)
    }
    addingEmotion.set(false)
}

export async function rmCharEmotion(charId:number, emotionId:number) {
    let db = get(DataBase)
    let dbChar = db.characters[charId]
    if(dbChar.type !== 'group'){
        dbChar.emotionImages.splice(emotionId, 1)
        db.characters[charId] = dbChar
    }
    setDatabase(db)
}


export async function exportChat(page:number){
    try {

        const mode = await alertSelect(['Export as JSON', "Export as TXT"])
        const selectedID = get(selectedCharID)
        const db = get(DataBase)
        const chat = db.characters[selectedID].chats[page]
        const char = db.characters[selectedID]
        const date = new Date().toJSON();
        console.log(mode)
        if(mode === '0'){
            const stringl = Buffer.from(JSON.stringify({
                type: 'risuChat',
                ver: 1,
                data: chat
            }), 'utf-8')
    
            await downloadFile(`${char.name}_${date}_chat`.replace(/[<>:"/\\|?*\.\,]/g, "") + '.json', stringl)
    
        }
        else{
            
            let stringl = chat.message.map((v) => {
                if(v.saying){
                    return `${findCharacterbyId(v.saying).name}\n${v.data}`
                }
                else{
                    return `${v.role === 'char' ? char.name : db.username}\n${v.data}`
                }
            }).join('\n\n')

            if(char.type !== 'group'){
                stringl = `${char.name}\n${char.firstMessage}\n\n` + stringl
            }

            await downloadFile(`${char.name}_${date}_chat`.replace(/[<>:"/\\|?*\.\,]/g, "") + '.txt', Buffer.from(stringl, 'utf-8'))

        }
        alertNormal(language.successExport)
    } catch (error) {
        alertError(`${error}`)
    }
}

export async function importChat(){
    const dat =await selectSingleFile(['json','jsonl'])
    if(!dat){
        return
    }
    try {
        const selectedID = get(selectedCharID)
        let db = get(DataBase)

        if(dat.name.endsWith('jsonl')){
            const lines = Buffer.from(dat.data).toString('utf-8').split('\n')
            let newChat:Chat = {
                message: [],
                note: "",
                name: "Imported Chat",
                localLore: []
            }

            let isFirst = true
            for(const line of lines){
                
                const presedLine = JSON.parse(line)
                if(presedLine.name && presedLine.is_user, presedLine.mes){
                    if(!isFirst){
                        newChat.message.push({
                            role: presedLine.is_user ? "user" : 'char',
                            data: formatTavernChat(presedLine.mes, db.characters[selectedID].name)
                        })
                    }
                }

                isFirst = false
            }

            if(newChat.message.length === 0){
                alertError(language.errors.noData)
                return
            }

            db.characters[selectedID].chats.push(newChat)
            setDatabase(db)
            alertNormal(language.successImport)
        }
        else{
            const json = JSON.parse(Buffer.from(dat.data).toString('utf-8'))
            if(json.type === 'risuChat' && json.ver === 1){
                const das:Chat = json.data
                if(!(checkNullish(das.message) || checkNullish(das.note) || checkNullish(das.name) || checkNullish(das.localLore))){
                    db.characters[selectedID].chats.push(das)
                    setDatabase(db)
                    alertNormal(language.successImport)
                    return
                }
                else{
                    alertError(language.errors.noData)
                    return   
                }
            }
            else{
                alertError(language.errors.noData)
                return
            }
        }

    } catch (error) {
        alertError(`${error}`)
    }
}

function formatTavernChat(chat:string, charName:string){
    const db = get(DataBase)
    return chat.replace(/<([Uu]ser)>|\{\{([Uu]ser)\}\}/g, db.username).replace(/((\{\{)|<)([Cc]har)(=.+)?((\}\})|>)/g, charName)
}

export function characterFormatUpdate(index:number|character){
    let db = get(DataBase)
    let cha = typeof(index) === 'number' ? db.characters[index] : index
    if(cha.chats.length === 0){
        cha.chats = [{
            message: [],
            note: '',
            name: 'Chat 1',
            localLore: []
        }]
    }
    if(!cha.chats[cha.chatPage]){
        cha.chatPage = 0
    }
    if(!cha.chats[cha.chatPage].message){
        cha.chats[cha.chatPage].message = []
    }
    if(!cha.type){
        cha.type = 'character'
    }
    if(!cha.chaId){
        cha.chaId = uuidv4()
    }
    if(cha.type !== 'group'){
        if(checkNullish(cha.sdData)){
            cha.sdData = defaultSdDataFunc()
        }
        if(checkNullish(cha.utilityBot)){
            cha.utilityBot = false
        }
        cha.triggerscript = cha.triggerscript ?? []
        cha.alternateGreetings = cha.alternateGreetings ?? []
        cha.exampleMessage = cha.exampleMessage ?? ''
        cha.creatorNotes = cha.creatorNotes ?? ''
        cha.systemPrompt = cha.systemPrompt ?? ''
        cha.tags = cha.tags ?? []
        cha.creator = cha.creator ?? ''
        cha.characterVersion = cha.characterVersion ?? ''
        cha.personality = cha.personality ?? ''
        cha.scenario = cha.scenario ?? ''
        cha.firstMsgIndex = cha.firstMsgIndex ?? -1
        cha.additionalData = cha.additionalData ?? {
            tag: [],
            creator: '',
            character_version: ''
        }
        cha.voicevoxConfig = cha.voicevoxConfig ?? {
            SPEED_SCALE: 1,
            PITCH_SCALE: 0,
            INTONATION_SCALE: 1,
            VOLUME_SCALE: 1
        }
        if(cha.postHistoryInstructions){
            cha.chats[cha.chatPage].note += "\n" + cha.postHistoryInstructions
            cha.chats[cha.chatPage].note = cha.chats[cha.chatPage].note.trim()
            cha.postHistoryInstructions = null
        }

    }
    else{
        if((!cha.characterTalks) || cha.characterTalks.length !== cha.characters.length){
            cha.characterTalks = []
            for(let i=0;i<cha.characters.length;i++){
                cha.characterTalks.push(1 / 6 * 4)
            }
        }
        if((!cha.characterActive) || cha.characterActive.length !== cha.characters.length){
            cha.characterActive = []
            for(let i=0;i<cha.characters.length;i++){
                cha.characterActive.push(true)
            }
        }
    }
    if(checkNullish(cha.customscript)){
        cha.customscript = []
    }
    if(typeof(index) === 'number'){
        db.characters[index] = cha
        setDatabase(db)
    }
    return cha
}


export function createBlankChar():character{
    return {
        name: '',
        firstMessage: '',
        desc: '',
        notes: '',
        chats: [{
            message: [],
            note: '',
            name: 'Chat 1',
            localLore: []
        }],
        chatPage: 0,
        emotionImages: [],
        bias: [],
        viewScreen: 'none',
        globalLore: [],
        chaId: uuidv4(),
        type: 'character',
        sdData: defaultSdDataFunc(),
        utilityBot: false,
        customscript: [],
        exampleMessage: '',
        creatorNotes:'',
        systemPrompt:'',
        postHistoryInstructions:'',
        alternateGreetings:[],
        tags:[],
        creator:"",
        characterVersion: '',
        personality:"",
        scenario:"",
        firstMsgIndex: -1,
        replaceGlobalNote: "",
        triggerscript: []
    }
}


export async function makeGroupImage() {
    try {
        alertStore.set({
            type: 'wait',
            msg: `Loading..`
        })
        const db = get(DataBase)
        const charID = get(selectedCharID)
        const group = db.characters[charID]
        if(group.type !== 'group'){
            return
        }
    
        const imageUrls = await Promise.all(group.characters.map((v) => {
            return getCharImage(findCharacterbyId(v).image, 'plain')
        }))
    
        
    
        const canvas = document.createElement("canvas");
        canvas.width = 256
        canvas.height = 256
        const ctx = canvas.getContext("2d");
      
        // Load the images
        const images = [];
        let loadedImages = 0;
      
        await Promise.all(
            imageUrls.map(
            (url) =>
                new Promise<void>((resolve) => {
                    const img = new Image();
                    img.crossOrigin="anonymous"
                    img.onload = () => {
                        images.push(img);
                        resolve();
                    };
                    img.src = url;
                })
            )
        );
      
        // Calculate dimensions and draw the grid
        const numImages = images.length;
        const numCols = Math.ceil(Math.sqrt(images.length));
        const numRows = Math.ceil(images.length / numCols);
        const cellWidth = canvas.width / numCols;
        const cellHeight = canvas.height / numRows;
      
        for (let row = 0; row < numRows; row++) {
          for (let col = 0; col < numCols; col++) {
            const index = row * numCols + col;
            if (index >= numImages) break;
            ctx.drawImage(
              images[index],
              col * cellWidth,
              row * cellHeight,
              cellWidth,
              cellHeight
            );
          }
        }
      
        // Return the image URI
    
        const uri = canvas.toDataURL()
        console.log(uri)
        canvas.remove()
        db.characters[charID].image = await saveImage(dataURLtoBuffer(uri));
        setDatabase(db)
        alertStore.set({
            type: 'none',
            msg: ''
        })
    } catch (error) {
        alertError(`${error}`)
    }
}

function dataURLtoBuffer(string:string){
    const regex = /^data:.+\/(.+);base64,(.*)$/;

    const matches = string.match(regex);
    const ext = matches[1];
    const data = matches[2];
    return Buffer.from(data, 'base64');
}

export async function addDefaultCharacters() {
    const imgs = [fetch('/sample/rika.png'),fetch('/sample/yuzu.png')]

    alertStore.set({
        type: 'wait',
        msg: `Loading Sample bots...`
    })

    for(const img of imgs){
        const imgBuffer = await (await img).arrayBuffer()
        const readed = yuso.decode(Buffer.from(imgBuffer), "risuai")
        await sleep(10)
        const va = decodeMsgpack(Buffer.from(readed,'base64')) as any
        if(va.type !== 101){
            alertError(language.errors.noData)
            return
        }
        let char:character = va.data
        let db = get(DataBase)
        if(char.emotionImages && char.emotionImages.length > 0){
            for(let i=0;i<char.emotionImages.length;i++){
                await sleep(10)
                const imgp = await saveImage(char.emotionImages[i][1] as any)
                char.emotionImages[i][1] = imgp
            }
        }
        char.chats = [{
            message: [],
            note: '',
            name: 'Chat 1',
            localLore: []
        }]

        if(checkNullish(char.sdData)){
            char.sdData = defaultSdDataFunc()
        }

        char.chatPage = 0
        char.image = await saveImage(yuso.trim(Buffer.from(imgBuffer)))
        char.chaId = uuidv4()
        db.characters.push(characterFormatUpdate(char))
        setDatabase(db)
    }

    alertStore.set({
        type: 'none',
        msg: ''
    })
}