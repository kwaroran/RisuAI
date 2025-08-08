import { Mutex } from "src/ts/mutex";
import type { Chat } from "src/ts/storage/database.svelte";
import type { LuaEngine } from "wasmoon";
import type { PyodideContext } from "./python";

export interface BasicScriptingEngineState {
    code?: string;
    mutex: Mutex;
    chat?: Chat;
    setVar?: (key: string, value: string) => void,
    getVar?: (key: string) => string,
}

export interface LuaScriptingEngineState extends BasicScriptingEngineState {
    engine?: LuaEngine;
    type: 'lua';
}

export interface PythonScriptingEngineState extends BasicScriptingEngineState {
    pyodide?: PyodideContext
    type: 'py';
}

export type ScriptingEngineState = LuaScriptingEngineState | PythonScriptingEngineState;

export let ScriptingEngines = new Map<string, ScriptingEngineState>()
let pendingEngineCreations = new Map<string, Promise<ScriptingEngineState>>();

export async function getOrCreateEngineState(
    mode: string,
    type: 'lua' | 'py'
): Promise<ScriptingEngineState> {
    let engineState = ScriptingEngines.get(mode);
    if (engineState) {
        return engineState;
    }

    let pendingCreation = pendingEngineCreations.get(mode);
    if (pendingCreation) {
        return pendingCreation;
    }

    const creationPromise = (async () => {
        const engineState: ScriptingEngineState = {
            mutex: new Mutex(),
            type: type,
        };
        ScriptingEngines.set(mode, engineState);

        pendingEngineCreations.delete(mode);

        return engineState;
    })();

    pendingEngineCreations.set(mode, creationPromise);

    return creationPromise;
}
