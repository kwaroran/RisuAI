import "./styles.css";
import "core-js/actual"
import App from "./App.svelte";
import { loadData } from "./ts/storage/globalApi";
import { initHotkey } from "./ts/hotkey";
import { polyfill } from "./ts/polyfill";

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