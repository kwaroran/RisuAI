import "./styles.css";
import App from "./App.svelte";
import { loadData } from "./ts/globalApi";

import { Buffer as BufferPolyfill } from "buffer";
import { initHotkey } from "./ts/hotkey";
declare var Buffer: typeof BufferPolyfill;
globalThis.Buffer = BufferPolyfill;

const app = new App({
  target: document.getElementById("app"),
});

loadData();
initHotkey();
export default app;
