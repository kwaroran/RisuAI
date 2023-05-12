import { cloneDeep, merge } from "lodash";
import { languageEnglish } from "./en";
import { languageKorean } from "./ko";

export let language: typeof languageEnglish = languageEnglish;

export function changeLanguage(lang: string) {
  if (lang === "ko") {
    language = merge(cloneDeep(languageEnglish), languageKorean);
  } else {
    language = languageEnglish;
  }
}
