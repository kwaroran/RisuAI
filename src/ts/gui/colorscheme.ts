import { get } from "svelte/store";
import { DataBase, setDatabase } from "../storage/database";
import { cloneDeep } from "lodash";

export interface ColorScheme{
    bgcolor: string;
    darkbg: string;
    borderc: string;
    selected: string;
    draculared: string;
    textcolor: string;
    textcolor2: string;
    darkBorderc: string;
    darkbutton: string;
    type:'light'|'dark';
}


export const defaultColorScheme: ColorScheme = {
    bgcolor: "#282a36",
    darkbg: "#21222c",
    borderc: "#6272a4",
    selected: "#44475a",
    draculared: "#ff5555",
    textcolor: "#f8f8f2",
    textcolor2: "#64748b",
    darkBorderc: "#4b5563",
    darkbutton: "#374151",
    type:'dark'
}

const colorShemes = {
    "default": defaultColorScheme,
    "light": {
        bgcolor: "#f0f0f0",
        darkbg: "#ffffff",
        borderc: "#0f172a",
        selected: "#e0e0e0",
        draculared: "#ff5555",
        textcolor: "#0f172a",
        textcolor2: "#64748b",
        darkBorderc: "#d1d5db",
        darkbutton: "#e5e7eb",
        type:'light'
    },
    "cherry": {
        bgcolor: "#450a0a",
        darkbg: "#7f1d1d",
        borderc: "#ea580c",
        selected: "#d97706",
        draculared: "#ff5555",
        textcolor: "#f8f8f2",
        textcolor2: "#fca5a5",
        darkBorderc: "#92400e",
        darkbutton: "#b45309",
        type:'dark'
    },
    "galaxy": {
        bgcolor: "#0f172a",
        darkbg: "#1f2a48",
        borderc: "#8be9fd",
        selected: "#457b9d",
        draculared: "#ff5555",
        textcolor: "#f8f8f2",
        textcolor2: "#8be9fd",
        darkBorderc: "#457b9d",
        darkbutton: "#1f2a48",
        type:'dark'
    },
    "nature": {
        bgcolor: "#1b4332",
        darkbg: "#2d6a4f",
        borderc: "#a8dadc",
        selected: "#4d908e",
        draculared: "#ff5555",
        textcolor: "#f8f8f2",
        textcolor2: "#4d908e",
        darkBorderc: "#457b9d",
        darkbutton: "#2d6a4f",
        type:'dark'
    }

} as const

export const colorSchemeList = Object.keys(colorShemes) as (keyof typeof colorShemes)[]

export function changeColorScheme(colorScheme: string){
    let db = get(DataBase)
    db.colorScheme = cloneDeep(colorShemes[colorScheme])
    db.colorSchemeName = colorScheme
    setDatabase(db)
    updateColorScheme()
}

export function updateColorScheme(){
    let db = get(DataBase)

    let colorScheme = db.colorScheme

    if(colorScheme == null){
        colorScheme = defaultColorScheme
    }

    //set css variables
    document.documentElement.style.setProperty("--risu-theme-bgcolor", colorScheme.bgcolor);
    document.documentElement.style.setProperty("--risu-theme-darkbg", colorScheme.darkbg);
    document.documentElement.style.setProperty("--risu-theme-borderc", colorScheme.borderc);
    document.documentElement.style.setProperty("--risu-theme-selected", colorScheme.selected);
    document.documentElement.style.setProperty("--risu-theme-draculared", colorScheme.draculared);
    document.documentElement.style.setProperty("--risu-theme-textcolor", colorScheme.textcolor);
    document.documentElement.style.setProperty("--risu-theme-textcolor2", colorScheme.textcolor2);
    document.documentElement.style.setProperty("--risu-theme-darkborderc", colorScheme.darkBorderc);
    document.documentElement.style.setProperty("--risu-theme-darkbutton", colorScheme.darkbutton);
}

export function updateTextTheme(){
    let db = get(DataBase)
    const root = document.querySelector(':root') as HTMLElement;
    if(!root){
        return
    }
    switch(db.textTheme){
        case "standard":{
            if(db.colorScheme.type === 'dark'){
                root.style.setProperty('--FontColorStandard', '#fafafa');
                root.style.setProperty('--FontColorItalic', '#8C8D93');
                root.style.setProperty('--FontColorBold', '#fafafa');
                root.style.setProperty('--FontColorItalicBold', '#8C8D93');
            }else{
                root.style.setProperty('--FontColorStandard', '#0f172a');
                root.style.setProperty('--FontColorItalic', '#8C8D93');
                root.style.setProperty('--FontColorBold', '#0f172a');
                root.style.setProperty('--FontColorItalicBold', '#8C8D93');
            }
            break
        }
        case "highcontrast":{
            if(db.colorScheme.type === 'dark'){
                root.style.setProperty('--FontColorStandard', '#f8f8f2');
                root.style.setProperty('--FontColorItalic', '#F1FA8C');
                root.style.setProperty('--FontColorBold', '#8BE9FD');
                root.style.setProperty('--FontColorItalicBold', '#FFB86C');
            }
            else{
                root.style.setProperty('--FontColorStandard', '#0f172a');
                root.style.setProperty('--FontColorItalic', '#F1FA8C');
                root.style.setProperty('--FontColorBold', '#8BE9FD');
                root.style.setProperty('--FontColorItalicBold', '#FFB86C');
            }
            break
        }
        case "custom":{
            root.style.setProperty('--FontColorStandard', db.customTextTheme.FontColorStandard);
            root.style.setProperty('--FontColorItalic', db.customTextTheme.FontColorItalic);
            root.style.setProperty('--FontColorBold', db.customTextTheme.FontColorBold);
            root.style.setProperty('--FontColorItalicBold', db.customTextTheme.FontColorItalicBold);
            break
        }
    }
}