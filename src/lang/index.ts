import { cloneDeep, merge } from "lodash";
import { languageChinese } from "./cn";
import { languageChinese } from "./de";
import { languageEnglish } from "./en";
import { languageKorean } from "./ko";

export let language:typeof languageEnglish = languageEnglish


export function changeLanguage(lang:string){
    if(lang === 'cn'){
        language = merge(cloneDeep(languageEnglish), languageChinese)
    }
    else if(lang === 'de'){
        language = merge(cloneDeep(languageEnglish), languageGerman)
    }
    else if(lang === 'ko'){
        language = merge(cloneDeep(languageEnglish), languageKorean)
    }
    else{
        language = languageEnglish
    }
}
