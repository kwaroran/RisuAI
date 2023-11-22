import { v4 } from 'uuid';
import { alertError, alertInput, alertNormal, alertWait } from '../alert';
import { get } from 'svelte/store';
import { DataBase, setDatabase, type character } from '../storage/database';
import { selectedCharID } from '../stores';
import { cloneDeep } from 'lodash';
import { findCharacterIndexbyId, sleep } from '../util';
import type { DataConnection, Peer } from 'peerjs';

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
        roomId + "-risuai-multiuser"
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
        function requestChar(){
            const db = get(DataBase)
            const selectedCharId = get(selectedCharID)
            const char = cloneDeep(db.characters[selectedCharId])
            if(char.type === 'group'){
                return
            }
            char.chats = [char.chats[char.chatPage]]
            conn.send({
                type: 'receive-char',
                data: char
            });
        }

        conn.on('data', function(data:ReciveData) {
            if(data.type === 'request-char'){
                requestChar()
            }
            if(data.type === 'receive-char'){
                const db = get(DataBase)
                const selectedCharId = get(selectedCharID)
                const char = cloneDeep(db.characters[selectedCharId])
                const recivedChar = data.data
                if(char.type === 'group'){
                    return
                }
                char.chats[char.chatPage] = recivedChar.chats[0]
                sendPeerChar()
            }
        });
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

type ReciveData = ReciveFirst|RequestFirst

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
            }
        });
    
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