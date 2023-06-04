import { cloneDeep, merge } from "lodash";
import { languageEnglish } from "./en";
import { languageKorean } from "./ko";
import { languageChinese } from "./cn";

export let language:typeof languageEnglish = languageEnglish


export function changeLanguage(lang:string){
    if(lang === 'ko'){
        language = merge(cloneDeep(languageEnglish), languageKorean)
    }
    else if(lang === 'cn'){
        language = merge(cloneDeep(languageEnglish), languageChinese)
    }
    else{
        language = languageEnglish
    }
}