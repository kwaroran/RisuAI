import { get } from "svelte/store"
import { DataBase } from "../storage/database"

export function OaifixBias(bias:{[key:number]:number}){
    const db = get(DataBase)
    const emdashes = [
        2001,  2345,  8713, 16620, 17223,
       22416, 29096, 29472, 30697, 35192,
       38542, 41128, 44603, 49525, 50004,
       50617, 51749, 51757, 55434, 60654,
       61311, 63750, 63938, 63977, 66101,
       68850, 71201, 71480, 72318, 76070,
       76929, 80078, 81902, 83872, 84941,
       85366, 86319, 87247, 87671, 88958,
       90863, 93830, 96197, 99563
    ]

    const biases = []

    if(db.officialplugins.oaiFixEmdash){
        biases.push(...emdashes)
    }
    

    for (const key of biases) {
        bias[key] = -100
    }

    return bias

}

export function OaiFixKorean(text:string){

    //tokenizer problem fixes
    const replacer = {
        //commonly wrong english
        '피츠': '피스',
        '스커츠': '스커트',
        '스파츠': '스커트',
        '스마트폰': '스파트폰',
        '스위츠': '스위치',
        '해도 되': '해도 돼',
        '해도 됩니다': '해도 돼요',
        '에레베이터': '엘리베이터',
        '에리베이터': '엘리베이터',
        '에레바토르': '엘리베이터',
    }

    for (const key in replacer) {
        text = text.replace(key, replacer[key])
    }
    return text
}