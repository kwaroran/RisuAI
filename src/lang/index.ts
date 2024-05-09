import { merge } from "lodash";
import { languageChinese } from "./cn";
import { languageGerman } from "./de";
import { languageEnglish } from "./en";
import { languageKorean } from "./ko";
import { LanguageVietnamese } from "./vi";
import { languageChineseTraditional } from "./zh-Hant";

export let language:typeof languageEnglish = languageEnglish


export function changeLanguage(lang:string){
    if(lang === 'cn'){
        language = merge(structuredClone(languageEnglish), languageChinese)
    }
    else if(lang === 'de'){
        language = merge(structuredClone(languageEnglish), languageGerman)
    }
    else if(lang === 'ko'){
        language = merge(structuredClone(languageEnglish), languageKorean)
    }
    else if(lang === 'vi'){
        language = merge(structuredClone(languageEnglish), LanguageVietnamese)
    }
    else if(lang === 'zh-Hant'){
        language = merge(structuredClone(languageEnglish), languageChineseTraditional)
    }
    else{
        language = languageEnglish
    }
}
