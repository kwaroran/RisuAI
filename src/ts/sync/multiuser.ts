import { v4 } from 'uuid';
import { alertError, alertInput, alertNormal, alertWait } from '../alert';
import { get } from 'svelte/store';
import { DataBase, setDatabase, type character, saveImage } from '../storage/database';
import { selectedCharID } from '../stores';
import { findCharacterIndexbyId, sleep } from '../util';
import type { DataConnection, Peer } from 'peerjs';
import { readImage } from '../storage/globalApi';

async function importPeerJS(){
    return await import('peerjs');
}

let conn:DataConnection
let peer:Peer
let connections:DataConnection[] = []
let connectionOpen = false

export async function createMultiuserRoom(){
    //create a room with webrtc
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
                sendPeerChar()
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
    alertNormal("Room ID: " + roomId)
    return
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

type ReciveData = ReciveFirst|RequestFirst|ReciveAsset

export async function joinMultiuserRoom(){

    //join a room with webrtc
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
                }
            }
        });

        conn.on('close', function() {
            alertError("Connection closed")
            connectionOpen = false
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
        alertNormal("Connected")
    });
    
}


export function sendPeerChar(){
    if(!connectionOpen){
        return
    }
    if(!conn){
        // host user
        for(const connection of connections){
            connection.send({
                type: 'receive-char',
                data: get(DataBase).characters[get(selectedCharID)]
            });
        }
    }
    else{
        conn.send({
            type: 'receive-char',
            data: get(DataBase).characters[get(selectedCharID)]
        });
    }
}