import "./styles.css";
import "./ts/polyfill";
import "core-js/actual"
import "./ts/storage/database.svelte"
import App from "./App.svelte";
import { loadData } from "./ts/globalApi";
import { initHotkey } from "./ts/hotkey";
import { preLoadCheck } from "./preload";
import { mount } from "svelte";

preLoadCheck()
let app = mount(App, {
    target: document.getElementById("app"),
});
loadData()
initHotkey()

export default app;