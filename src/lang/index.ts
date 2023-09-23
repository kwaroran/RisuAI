import { cloneDeep, merge } from "lodash";
import { languageChinese } from "./cn";
import { languageGerman } from "./de";
import { languageEnglish } from "./en";
import { languageKorean } from "./ko";
import { LanguageVietnamese } from "./vi";

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
    else if(lang === 'vi'){
        language = merge(cloneDeep(languageEnglish), LanguageVietnamese)
    }
    else{
        language = languageEnglish
    }
}
