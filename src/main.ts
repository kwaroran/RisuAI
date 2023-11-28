import "./styles.css";
import "core-js/actual"
import App from "./App.svelte";
import { loadData } from "./ts/storage/globalApi";
import { initHotkey } from "./ts/hotkey";
import { polyfill } from "./ts/polyfill";
import { watchParamButton } from "./ts/plugins/embedscript";

polyfill()

const app = new App({
  target: document.getElementById("app"),
});

loadData()
initHotkey()
watchParamButton()

export default app;