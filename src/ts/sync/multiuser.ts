import { v4 } from 'uuid';
import { alertError, alertInput, alertNormal, alertStore, alertWait } from '../alert';
import { get, writable } from 'svelte/store';
import { DataBase, setDatabase, type character, saveImage, type Chat, getCurrentChat, setCurrentChat } from '../storage/database.svelte';
import { selectedCharID } from '../stores';
import { findCharacterIndexbyId, sleep } from '../util';
import type { DataConnection, Peer } from 'peerjs';
import { readImage } from '../storage/globalApi';
import { doingChat } from '../process';

async function importPeerJS(){
    return await import('peerjs');
}

interface ReciveFirst{
    type: 'receive-char',
    data: character
}
interface RequestFirst{
    type: 'request-char'
}
interface ReciveAsset{
    type: 'receive-asset',
    id: string,
    data: Uint8Array
}
interface RequestSync{
    type: 'request-chat-sync',
    id: string,
    data: Chat
}
interface ReciveSync{
    type: 'receive-chat',
    data: Chat
}
interface RequestChatSafe{
    type: 'request-chat-safe',
    id: string
}
interface ResponseChatSafe{
    type: 'response-chat-safe'
    data: boolean,
    id: string
}
interface RequestChat{
    type: 'request-chat'
}

type ReciveData = ReciveFirst|RequestFirst|ReciveAsset|RequestSync|ReciveSync|RequestChatSafe|ResponseChatSafe|RequestChat

let conn:DataConnection
let peer:Peer
let connections:DataConnection[] = []
export let connectionOpen = false
let requestChatSafeQueue = new Map<string, {remaining:number,safe:boolean,conn?:DataConnection}>()
export let ConnectionOpenStore = writable(false)
export let ConnectionIsHost = writable(false)
export let RoomIdStore = writable('')

export async function createMultiuserRoom(){
    //create a room with webrtc
    ConnectionIsHost.set(true)
    alertWait("Loading...")

    const peerJS = await importPeerJS();
    let roomId = v4();
    peer = new peerJS.Peer(
        roomId + "-rmh"
    )

    alertWait("Waiting for peerserver to connect...")
    let open = false
    peer.on('open', function(id) {
        open = true
        roomId = id
    });
    peer.on('connection', function(conn) {
        connections.push(conn)
        console.log("new connection", conn)

        async function requestChar(excludeAssets:string[]|null = null){
            const db = get(DataBase)
            const selectedCharId = get(selectedCharID)
            const char = structuredClone(db.characters[selectedCharId])
            if(char.type === 'group'){
                return
            }
            char.chats = [char.chats[char.chatPage]]
            conn.send({
                type: 'receive-char',
                data: char
            });
            if(excludeAssets !== null){
                if(char.additionalAssets){
                    const ass = char.additionalAssets.filter((asset) => {
                        return !excludeAssets.includes(asset[1])
                    })

                    for(const a of ass){
                        conn.send({
                            type: 'receive-asset',
                            id: a[1],
                            data: await readImage(a[1])
                        })
                    }
                    
                }
                if(char.emotionImages){
                    const ass = char.emotionImages.filter((asset) => {
                        return !excludeAssets.includes(asset[1])
                    })
                    
                    for(const a of ass){
                        conn.send({
                            type: 'receive-asset',
                            id: a[1],
                            data: await readImage(a[1])
                        })
                    }
                }

            }
        }

        conn.on('data', function(data:ReciveData) {
            if(data.type === 'request-char'){
                requestChar()
            }
            if(data.type === 'receive-char'){
                const db = get(DataBase)
                const selectedCharId = get(selectedCharID)
                const char = structuredClone(db.characters[selectedCharId])
                const recivedChar = data.data
                if(char.type === 'group'){
                    return
                }
                char.chats[char.chatPage] = recivedChar.chats[0]
            }
            if(data.type === 'request-chat-sync'){
                const db = get(DataBase)
                const selectedCharId = get(selectedCharID)
                const char = db.characters[selectedCharId]
                char.chats[char.chatPage] = data.data
                db.characters[selectedCharId] = char
                latestSyncChat = data.data
                setDatabase(db)

                for(const connection of connections){
                    if(connection.connectionId === conn.connectionId){
                        continue
                    }
                    const rs:ReciveSync = {
                        type: 'receive-chat',
                        data: data.data
                    }
                    connection.send(rs)
                }
            }
            if(data.type === 'request-chat'){
                const db = get(DataBase)
                const selectedCharId = get(selectedCharID)
                const char = db.characters[selectedCharId]
                const chat = char.chats[char.chatPage]
                const rs:ReciveSync = {
                    type: 'receive-chat',
                    data: chat
                }
                conn.send(rs)
            }
            if(data.type === 'request-chat-safe'){
                const queue = {
                    remaining: connections.length,
                    safe: true,
                    conn: conn
                }
                requestChatSafeQueue.set(data.id, queue)
                for(const connection of connections){
                    if(connection.connectionId === conn.connectionId){
                        queue.remaining--
                        requestChatSafeQueue.set(data.id, queue)
                        continue
                    }
                    const rs:RequestChatSafe = {
                        type: 'request-chat-safe',
                        id: data.id
                    }
                    connection.send(rs)
                }
                if(queue.remaining === 0){
                    if(waitingMultiuserId === data.id){
                        waitingMultiuserId = ''
                        waitingMultiuserSafe = queue.safe
                    }
                    else if(queue.conn){
                        const rs:ResponseChatSafe = {
                            type: 'response-chat-safe',
                            data: queue.safe,
                            id: data.id
                        }
                        queue.conn.send(rs)
                        requestChatSafeQueue.delete(data.id)
                    }
                }
            }
            if(data.type === 'response-chat-safe'){
                const queue = requestChatSafeQueue.get(data.id)
                if(queue){
                    queue.remaining--
                    if(!data.data){
                        queue.safe = false
                    }
                    if(queue.remaining === 0){
                        if(waitingMultiuserId === data.id){
                            waitingMultiuserId = ''
                            waitingMultiuserSafe = queue.safe
                        }
                        else if(queue.conn){
                            const rs:ResponseChatSafe = {
                                type: 'response-chat-safe',
                                data: queue.safe,
                                id: data.id
                            }
                            queue.conn.send(rs)
                            requestChatSafeQueue.delete(data.id)
                        }
                    }
                }
            }
        });

        conn.on('close', function() {
            for(let i = 0; i < connections.length; i++){
                if(connections[i].connectionId === conn.connectionId){
                    connections.splice(i, 1)
                    break
                }
            }
        })
    });
    while(!open){
        await sleep(100)
    }

    connectionOpen = true
    ConnectionOpenStore.set(true)
    RoomIdStore.set(roomId)
    alertStore.set({
        type: 'none',
        msg: ''
    })
    return
}

let waitingMultiuserId = ''
let waitingMultiuserSafe = false
let latestSyncChat:Chat|null = null

export async function joinMultiuserRoom(){

    //join a room with webrtc
    ConnectionIsHost.set(false)
    alertWait("Loading...")
    const peerJS = await importPeerJS();
    peer = new peerJS.Peer(
        v4() + "-risuai-multiuser-join"
    )

    peer.on('open', async (id) => {
        const roomId = await alertInput("Enter room id")
        alertWait("Waiting for peerserver to connect...")
    
        let open = false
        conn = peer.connect(roomId);
        RoomIdStore.set(roomId)

        conn.on('open', function() {
            alertWait("Waiting for host to accept connection")
            open = true
            conn.send({
                type: 'request-char'
            })
        });
        
        conn.on('data', function(data:ReciveData) {
            switch(data.type){
                case 'receive-char':{
                    //create temp character
                    const db = get(DataBase)
                    const cha = data.data
                    cha.chaId = '§temp'
                    cha.chatPage = 0
                    const ind = findCharacterIndexbyId('§temp')
                    const selectedcharIndex = get(selectedCharID)
                    if(ind === -1){
                        db.characters.push(cha)
                    }
                    else{
                        db.characters[ind] = cha
                    }
                    const tempInd = findCharacterIndexbyId('§temp')
                    if(selectedcharIndex !== tempInd){
                        selectedCharID.set(tempInd)
                    }
                    setDatabase(db)
                    break
                }
                case 'receive-asset':{
                    saveImage(data.data, data.id)
                    break
                }
                case 'receive-chat':{
                    const db = get(DataBase)
                    const selectedCharId = get(selectedCharID)
                    const char = structuredClone(db.characters[selectedCharId])
                    char.chats[char.chatPage] = data.data
                    db.characters[selectedCharId] = char
                    latestSyncChat = data.data
                    setDatabase(db)
                    break
                }
                case 'request-chat-safe':{
                    const rs:ResponseChatSafe = {
                        type: 'response-chat-safe',
                        data: !get(doingChat) || data.id === waitingMultiuserId,
                        id: data.id
                    }
                    conn.send(rs)
                    break
                }
                case 'response-chat-safe':{
                    if(data.id === waitingMultiuserId){
                        waitingMultiuserId = ''
                        waitingMultiuserSafe = data.data
                    }
                }
            }
        });

        conn.on('close', function() {
            alertError("Connection closed")
            connectionOpen = false
            ConnectionOpenStore.set(false)
            selectedCharID.set(-1)
        })
    
        let waitTime = 0
        while(!open){
            await sleep(100)
            waitTime += 100
            if(waitTime > 10000){
                alertError("Connection timed out")
                return
            }
        }        
        connectionOpen = true
        ConnectionOpenStore.set(true)
        alertNormal("Connected")
    });
    
}


export async function peerSync(){
    if(!connectionOpen){
        return
    }
    await sleep(1)
    const chat = getCurrentChat()
    latestSyncChat = chat
    if(!conn){
        // host user
        for(const connection of connections){
            connection.send({
                type: 'receive-chat',
                data: chat
            });
        }
    }
    else{
        conn.send({
            type: 'request-chat-sync',
            data: chat
        } as RequestSync)
    }
}

export async function peerSafeCheck() {
    if(!connectionOpen){
        return true
    }
    await sleep(500)
    if(!conn){
        waitingMultiuserId = v4()
        requestChatSafeQueue.set(waitingMultiuserId, {
            remaining: connections.length,
            safe: true,
        })
        for(const connection of connections){
            const rs:RequestChatSafe = {
                type: 'request-chat-safe',
                id: waitingMultiuserId
            }
            connection.send(rs)
        }
        while(waitingMultiuserId !== ''){
            await sleep(100)
        }
        return waitingMultiuserSafe
    }
    else{
        waitingMultiuserId = v4()
        const rs:RequestChatSafe = {
            type: 'request-chat-safe',
            id: waitingMultiuserId
        }
        conn.send(rs)
        while(waitingMultiuserId !== ''){
            await sleep(100)
        }
        return waitingMultiuserSafe

    }
}

export function peerRevertChat() {
    if(!connectionOpen || !latestSyncChat){
        return
    }
    setCurrentChat(latestSyncChat)
}