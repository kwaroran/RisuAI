import "./ts/polyfill";
import "core-js/actual"
import "./ts/storage/database.svelte"
import App from "./App.svelte";
import { loadData } from "./ts/globalApi.svelte";
import { initHotkey } from "./ts/hotkey";
import { preLoadCheck } from "./preload";
import { mount } from "svelte";

preLoadCheck()
let app = mount(App, {
    target: document.getElementById("app"),
});
loadData()
initHotkey()
document.getElementById('preloading').remove()

export default app;