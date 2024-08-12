import { writable } from "svelte/store";

if(import.meta.env.DEV){
    console.log(`Lite Mode: ${import.meta.env.VITE_RISU_LITE}`)
}
export const isLite = writable(import.meta.env.VITE_RISU_LITE === 'TRUE')