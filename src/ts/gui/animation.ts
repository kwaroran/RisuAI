import { get } from "svelte/store";
import { DataBase } from "../storage/database";

export function updateAnimationSpeed(){
    const db = get(DataBase);
    document.documentElement.style.setProperty('--risu-animation-speed', db.animationSpeed  + 's');
}