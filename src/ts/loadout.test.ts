import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./persona", () => ({
    changeUserPersona: vi.fn(),
}));

vi.mock("./storage/database.svelte", () => ({
    changeToPreset: vi.fn(),
    getCurrentCharacter: vi.fn(() => ({
        chaId: "character-1",
        image: "character-image",
    })),
}));

vi.mock("./stores.svelte", () => ({
    DBState: {
        db: {},
    },
}));

import { applyLoadout, makeLoadout, type Loadout } from "./loadout";
import { DBState } from "./stores.svelte";

function resetDb(hypaV3: boolean) {
    DBState.db = {
        botPresets: [{ name: "Bot Preset" }],
        botPresetsId: 0,
        personas: [{ id: "persona-1" }],
        selectedPersona: 0,
        enabledModules: ["module-1"],
        globalChatVariables: { key: "value" },
        hypaV3,
        hypaV3Presets: [
            { name: "Default", settings: {} },
            { name: "Detailed", settings: {} },
        ],
        hypaV3PresetId: 1,
        loadouts: [],
        lastLoadedLoadoutName: "",
    } as any;
}

function makeTestLoadout(hypaV3PresetName: string): Loadout {
    return {
        name: "Loadout",
        id: "loadout-1",
        lastUsed: 0,
        favorite: false,
        characterIds: [],
        modules: [],
        globalVariables: {},
        presetName: "",
        personaId: "",
        icons: [],
        hypaV3PresetName,
    };
}

describe("Loadout HypaV3 preset handling", () => {
    beforeEach(() => {
        (globalThis as any).safeStructuredClone = structuredClone;
    });

    it("does not store a HypaV3 preset name when HypaV3 memory is disabled", () => {
        resetDb(false);

        const loadout = makeLoadout({ name: "Loadout" });

        expect(loadout.hypaV3PresetName).toBe("");
    });

    it("does not apply a HypaV3 preset when HypaV3 memory is disabled", () => {
        resetDb(false);

        applyLoadout(makeTestLoadout("Default"), ["hypaV3Preset"]);

        expect(DBState.db.hypaV3PresetId).toBe(1);
    });

    it("stores and applies the selected HypaV3 preset when HypaV3 memory is enabled", () => {
        resetDb(true);

        const loadout = makeLoadout({ name: "Loadout" });
        expect(loadout.hypaV3PresetName).toBe("Detailed");

        DBState.db.hypaV3PresetId = 0;
        applyLoadout(makeTestLoadout("Detailed"), ["hypaV3Preset"]);

        expect(DBState.db.hypaV3PresetId).toBe(1);
    });
});
