import "./styles.css";
import "core-js/actual"
import App from "./App.svelte";
import { loadData } from "./ts/globalApi";
import { initHotkey } from "./ts/hotkey";
import { polyfill } from "./ts/polyfill";

polyfill()

const app = new App({
  target: document.getElementById("app"),
});

loadData()
initHotkey()
export default app;