import "./ts/polyfill";
import "core-js/actual"
import "./ts/storage/database.svelte"
import App from "./App.svelte";
import { loadData } from "./ts/bootstrap";
import { initHotkey } from "./ts/hotkey";
import { preLoadCheck } from "./preload";
import { initTitlebar } from "./ts/gui/titlebar.svelte";
import { mount } from "svelte";

window.addEventListener('vite:preloadError', (event) => {
    console.error("Chunk load error detected:", event);
    alert("The server has been updated or the network connection has been lost. Please refresh the page.");
});

preLoadCheck()
initTitlebar()
let app = mount(App, {
    target: document.getElementById("app"),
});
loadData()
initHotkey()
document.getElementById('preloading').remove()

export default app;