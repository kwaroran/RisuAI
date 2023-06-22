import { get } from "svelte/store";
import { DataBase, type character } from "../storage/database";
import type {LuaEngine} from 'wasmoon'
import { selectedCharID } from "../stores";

let lua: LuaEngine = null


export class CharacterLua{
    char:character
    constructor(char:character){
        this.char = char
    }
    async init(){
        if(!lua){
            const factory = new (await import("wasmoon")).LuaFactory
            lua = await factory.createEngine()
            lua.global.set('getChat', () => {
                const cha = get(DataBase).characters[get(selectedCharID)]
                return cha.chats[cha.chatPage].message
            })
            lua.global.set('setChat', () => {
                const cha = get(DataBase).characters[get(selectedCharID)]
                return cha.chats[cha.chatPage].message
            })
            lua.global.set('doSend', (a:string) => {
                console.log(a)
            })
        }
    }


}