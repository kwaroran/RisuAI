import "./styles.css";
import "core-js/actual"
import App from "./App.svelte";
import { loadData } from "./ts/storage/globalApi";
import { initHotkey } from "./ts/hotkey";
import { polyfill } from "./ts/polyfill";
import { runEmbedding } from "./ts/process/embedding/transformers";

polyfill()

const app = new App({
  target: document.getElementById("app"),
});

loadData()
initHotkey()
runEmbedding("test")
export default app;