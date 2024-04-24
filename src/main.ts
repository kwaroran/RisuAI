import "./styles.css";
import "core-js/actual"
import App from "./App.svelte";
import { loadData } from "./ts/storage/globalApi";
import { initHotkey } from "./ts/hotkey";
import { polyfill } from "./ts/polyfill";

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

let app: App;
try {
    polyfill()

    app = new App({
      target: document.getElementById("app"),
    });
    
    loadData()
    initHotkey()
} catch (error) {
    console.error(error, error.stack)
    alert(error)
}

export default app;