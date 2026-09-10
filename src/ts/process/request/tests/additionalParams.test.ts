import { describe, expect, it, vi } from "vitest";

vi.mock("src/ts/storage/database.svelte", () => ({
    getDatabase: () => ({}),
}));

import { parseAdditionalParamJsonValue } from "../additionalParams";
import { applyAdditionalParameters } from "../shared";
import { withOpenRouterAttributionHeaders } from "../../../network/openRouterHeaders";

describe("parseAdditionalParamJsonValue", () => {
    it("parses standard JSON additional parameter values", () => {
        expect(
            parseAdditionalParamJsonValue('{"enable_thinking":true,"budget_tokens":0}')
        ).toEqual({
            enable_thinking: true,
            budget_tokens: 0,
        });
    });

    it("accepts Python-style booleans and null in json:: values", () => {
        expect(
            parseAdditionalParamJsonValue(
                '{"enable_thinking": True, "nested": {"flag": False, "value": None}}'
            )
        ).toEqual({
            enable_thinking: true,
            nested: {
                flag: false,
                value: null,
            },
        });
    });

    it("does not rewrite quoted keyword strings", () => {
        expect(
            parseAdditionalParamJsonValue(
                '{"string_true": "True", "string_false": "False", "string_none": "None"}'
            )
        ).toEqual({
            string_true: "True",
            string_false: "False",
            string_none: "None",
        });
    });

    it("returns undefined for invalid json:: payloads", () => {
        expect(parseAdditionalParamJsonValue('{"enable_thinking": Truthy}')).toBeUndefined();
    });
});

describe("applyAdditionalParameters", () => {
    it("removes OpenRouter title aliases case-insensitively", () => {
        const headers = withOpenRouterAttributionHeaders("https://openrouter.ai/api/v1", {
            "x-title": "Legacy title",
            "X-Custom": "kept",
        });

        applyAdditionalParameters({}, headers, [["header::X-Title", "{{none}}"]]);

        expect(withOpenRouterAttributionHeaders("https://openrouter.ai/api/v1", headers)).toBe(headers);
        expect(headers).toEqual({
            "HTTP-Referer": "https://risuai.xyz",
            "X-Custom": "kept",
        });
    });

    it("replaces OpenRouter title aliases and differently-cased referers", () => {
        const headers = withOpenRouterAttributionHeaders("https://openrouter.ai/api/v1", {
            Authorization: "Bearer test-key",
        });

        applyAdditionalParameters({}, headers, [
            ["header::X-Title", "MyApp"],
            ["header::http-referer", "https://example.com"],
        ]);

        expect(headers).toEqual({
            Authorization: "Bearer test-key",
            "X-Title": "MyApp",
            "http-referer": "https://example.com",
        });
    });

    it("keeps exact header deletion semantics outside OpenRouter", () => {
        const headers = {
            "X-Title": "remove",
            "x-title": "keep",
        };

        applyAdditionalParameters({}, headers, [["header::X-Title", "{{none}}"]]);

        expect(headers).toEqual({ "x-title": "keep" });
    });
});
