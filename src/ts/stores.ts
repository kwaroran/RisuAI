import { writable } from "svelte/store";

function updateSize(){
    SizeStore.set({
        w: window.innerWidth,
        h: window.innerHeight
    })
}

export const SizeStore = writable({
    w: 0,
    h: 0
})
export const sideBarStore = writable(false)
export const selectedCharID = writable(-1)
export const CharEmotion = writable({} as {[key:string]: [string, string, number][]})
export const ViewBoxsize = writable({ width: 12 * 16, height: 12 * 16 }); // Default width and height in pixels
export const settingsOpen = writable(false)

updateSize()
window.addEventListener("resize", updateSize);