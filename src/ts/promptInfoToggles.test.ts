import { expect, test } from "vitest";
import { buildPromptInfoToggles } from "src/ts/toggleSyntax";

// https://github.com/kwaroran/Risuai/issues/1614
// ROOT CAUSE:
//
// sendChat built promptInfo.promptToggles from preset + module toggle sources
// only, while the toggle sidebar (Toggles.svelte) renders preset + module +
// the selected character's customModuleToggle. A character toggle that is
// effective in the UI/runtime was therefore missing from the recorded
// promptInfo.
//
// Before: no shared helper existed; the capture composed only the two sources.
//
// We fixed this by composing the same three sources the sidebar renders, in
// the same order, through one helper used by the capture path. The helper
// lives in src/ts/toggleSyntax (zero imports) so importing it here never
// drags Svelte/store initialization into the Vitest workers.
test("includes the selected character boolean toggle in promptInfo toggles (Issue #1614)", () => {
  const toggles = buildPromptInfoToggles("", "", "charT=Character Toggle", {
    toggle_charT: "1",
  });
  expect(toggles).toContainEqual({ key: "Character Toggle", value: "ON" });
});

test("keeps preset and module toggles in sidebar order", () => {
  const toggles = buildPromptInfoToggles(
    "p=Preset Toggle",
    "m=Module Toggle",
    "c=Character Toggle",
    {
      toggle_p: "1",
      toggle_m: "1",
      toggle_c: "1",
    },
  );
  expect(toggles).toEqual([
    { key: "Preset Toggle", value: "ON" },
    { key: "Module Toggle", value: "ON" },
    { key: "Character Toggle", value: "ON" },
  ]);
});

test("maps character select values from chat variables", () => {
  const toggles = buildPromptInfoToggles("", "", "mode=Mode=select=calm,bold", {
    toggle_mode: "1",
  });
  expect(toggles).toEqual([{ key: "Mode", value: "bold" }]);
});

test("preserves existing text-toggle recording behavior (records undefined)", () => {
  // Pre-existing quirk, identical for preset/module toggles: text entries
  // have no options list, so options[raw] is undefined. Out of scope for
  // #1614; this test only locks the behavior against accidental change.
  const toggles = buildPromptInfoToggles("", "", "desc=Desc=text", {
    toggle_desc: "hello",
  });
  expect(toggles).toEqual([{ key: "Desc", value: undefined }]);
});

test("omits unset toggles and stays compatible when character toggles are missing", () => {
  expect(buildPromptInfoToggles("p=Preset Toggle", "", undefined, {})).toEqual(
    [],
  );
  expect(buildPromptInfoToggles("", "", "", {})).toEqual([]);
  expect(
    buildPromptInfoToggles("p=Preset Toggle", "m=Module Toggle", undefined, {
      toggle_p: "1",
      toggle_m: "1",
    }),
  ).toEqual([
    { key: "Preset Toggle", value: "ON" },
    { key: "Module Toggle", value: "ON" },
  ]);
});
