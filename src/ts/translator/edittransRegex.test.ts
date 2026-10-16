import { beforeEach, describe, expect, it, vi } from "vitest";
import type { character, customscript } from "../storage/database.svelte";

const database: { presetRegex: customscript[] } = { presetRegex: [] };

vi.mock("../storage/database.svelte", () => ({
    getDatabase: () => database,
}));

vi.mock("../process/modules", () => ({
    getModuleRegexScripts: () => [] as customscript[],
    moduleUpdate: () => {},
}));

const parserCalls: { data: string, chatID: number }[] = [];

vi.mock("../parser/parser.svelte", () => ({
    applyMarkdownToNode: () => {},
    risuChatParser: (data: string, arg: { chatID?: number } = {}) => {
        parserCalls.push({ data, chatID: arg.chatID ?? -1 });
        return data.replaceAll("{{char}}", "Risu");
    },
}));

import { applyEdittransRegex } from "./translator";

const script = (v: Partial<customscript>): customscript => ({
    comment: "",
    in: "",
    out: "",
    type: "edittrans",
    ...v,
} as customscript);

const alwaysExistChar = { customscript: [] } as unknown as character;

const apply = (text: string, scripts: customscript[], chatID = -1) => {
    database.presetRegex = scripts;
    return applyEdittransRegex(text, "chatid", alwaysExistChar, chatID);
};

beforeEach(() => {
    database.presetRegex = [];
    parserCalls.length = 0;
    vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("applyEdittransRegex", () => {
    it("applies preset scripts of the edittrans type only", () => {
        expect(apply("hello world", [
            script({ in: "world", out: "there" }),
            script({ in: "hello", out: "bye", type: "editdisplay" }),
        ])).toBe("hello there");
    });

    it("skips a script with an invalid regex and keeps the remaining ones", () => {
        expect(apply("hello world", [
            script({ in: "(unclosed", out: "x" }),
            script({ in: "world", out: "there" }),
        ])).toBe("hello there");
    });

    it("skips a script with an empty in", () => {
        expect(apply("hello", [
            script({ in: "", out: "INJECTED" }),
        ])).toBe("hello");
    });

    it("drops unsupported and repeated flags instead of throwing", () => {
        expect(apply("Hello hello", [
            script({ in: "hello", out: "hi", ableFlag: true, flag: "ggi z" }),
        ])).toBe("hi hi");
    });

    it("falls back to the u flag when no native flag is left", () => {
        expect(apply("aaa", [
            script({ in: "a", out: "b", ableFlag: true, flag: "<cbs>" }),
        ])).toBe("baa");
    });

    it("parses curly braced syntaxes in IN with the cbs flag", () => {
        expect(apply("Risu said hi", [
            script({ in: "{{char}}", out: "Seia", ableFlag: true, flag: "g<cbs>" }),
        ])).toBe("Seia said hi");
    });

    it("does not parse curly braced syntaxes in IN without the cbs flag", () => {
        expect(apply("Risu said hi", [
            script({ in: "{{char}}", out: "Seia", ableFlag: true, flag: "g" }),
        ])).toBe("Risu said hi");
        expect(parserCalls).toEqual([]);
    });

    it("forwards the chatID to the parser so message scoped syntaxes resolve", () => {
        apply("Risu said hi", [
            script({ in: "{{char}}", out: "Seia", ableFlag: true, flag: "g<cbs>" }),
        ], 7);
        expect(parserCalls).toEqual([{ data: "{{char}}", chatID: 7 }]);
    });

    it("sorts scripts by the order flag, higher first", () => {
        expect(apply("a", [
            script({ in: "b", out: "c", ableFlag: true, flag: "g<order 1>" }),
            script({ in: "a", out: "b", ableFlag: true, flag: "g<order 2>" }),
        ])).toBe("c");
    });

    it("keeps the declaration order when no order flag is set", () => {
        expect(apply("a", [
            script({ in: "b", out: "c" }),
            script({ in: "a", out: "b" }),
        ])).toBe("b");
    });

    it("moves the match to the top with the move_top flag", () => {
        expect(apply("body\n<note>keep</note>", [
            script({ in: "<note>.*?</note>", out: "$&", ableFlag: true, flag: "g<move_top>" }),
        ])).toBe("<note>keep</note>\nbody\n");
    });

    it("moves the match to the bottom with the move_bottom flag", () => {
        expect(apply("<note>keep</note>\nbody", [
            script({ in: "<note>(.*?)</note>", out: "[$1]", ableFlag: true, flag: "g<move_bottom>" }),
        ])).toBe("\nbody\n[keep]");
    });

    it("leaves the text alone when a move script does not match", () => {
        expect(apply("body", [
            script({ in: "<note>.*?</note>", out: "$&", ableFlag: true, flag: "g<move_top>" }),
        ])).toBe("body");
    });

    it("ignores custom flags that are not supported here", () => {
        expect(apply("hello world", [
            script({ in: "world", out: "there", ableFlag: true, flag: "g<repeat_back><no_end_nl>" }),
        ])).toBe("hello there");
    });

    it("returns the text untouched for an empty charArg", () => {
        database.presetRegex = [script({ in: "hello", out: "bye" })];
        expect(applyEdittransRegex("hello", "", alwaysExistChar)).toBe("hello");
    });
});
