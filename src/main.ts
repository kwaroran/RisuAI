import "./styles.css";
import "./ts/polyfill";
import "core-js/actual"
import "./ts/storage/database.svelte"
import App from "./App.svelte";
import { loadData } from "./ts/globalApi";
import { initHotkey } from "./ts/hotkey";
import { preLoadCheck } from "./preload";
import { mount } from "svelte";

const errorHandler = (event: ErrorEvent) => {
    console.error(event.error)
    alert(event.error)
}
const rejectHandler = (event: PromiseRejectionEvent) => {
    console.error(event.reason)
    alert(event.reason)
}

window.addEventListener('error', errorHandler)
window.addEventListener('unhandledrejection', rejectHandler)

export const removeDefaultHandler = () => {
    window.removeEventListener('error', errorHandler)
    window.removeEventListener('unhandledrejection', rejectHandler)
}

let app: any;

if(preLoadCheck()){
    try {    
        app = mount(App, {
                  target: document.getElementById("app"),
                });
        
        loadData()
        initHotkey()
    } catch (error) {
        console.error(error, error.stack)
        alert(error)
    }
}

export default app;