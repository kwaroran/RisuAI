<script lang="ts">
    import { language } from "src/lang";
    import { DBState } from "src/ts/stores.svelte";

    function formatHotkeyKey(key: string) {
        if (key === ' ') {
            return 'SPACE';
        }

        return key?.toLocaleUpperCase() ?? '';
    }
</script>

<h2 class="mb-2 text-2xl font-bold mt-2">{language.hotkey}</h2>

<div class="w-full rounded-md border border-darkborderc">
    <div class="border-b border-darkborderc px-3 py-2 text-xs text-textcolor2">
        <div class="sm:hidden">{language.action} / {language.hotkey}</div>
        <div class="hidden sm:flex sm:items-center sm:justify-between">
            <div>{language.action}</div>
            <div class="flex w-[17.5rem] justify-start">{language.hotkey}</div>
        </div>
    </div>
    {#each DBState.db.hotkeys as hotkey}
        <div class="flex flex-col gap-2 border-b border-darkborderc px-3 py-2 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
            <div class="min-w-0 text-sm text-textcolor">
                {language.hotkeyDesc[hotkey.action]}
            </div>
            <div class="flex w-full flex-wrap items-center gap-2 sm:w-[17.5rem]">
                <button
                    class="h-7 min-w-12 rounded-md px-2 text-xs transition-colors hover:text-textcolor"
                    class:bg-selected={hotkey.ctrl}
                    class:bg-transparent={!hotkey.ctrl}
                    class:text-textcolor={hotkey.ctrl}
                    class:text-textcolor2={!hotkey.ctrl}
                    onclick={() => {
                        hotkey.ctrl = !hotkey.ctrl;
                    }}
                >
                    Ctrl
                </button>
                <button
                    class="h-7 min-w-12 rounded-md px-2 text-xs transition-colors hover:text-textcolor"
                    class:bg-selected={hotkey.shift}
                    class:bg-transparent={!hotkey.shift}
                    class:text-textcolor={hotkey.shift}
                    class:text-textcolor2={!hotkey.shift}
                    onclick={() => {
                        hotkey.shift = !hotkey.shift;
                    }}
                >
                    Shift
                </button>
                <button
                    class="h-7 min-w-12 rounded-md px-2 text-xs transition-colors hover:text-textcolor"
                    class:bg-selected={hotkey.alt}
                    class:bg-transparent={!hotkey.alt}
                    class:text-textcolor={hotkey.alt}
                    class:text-textcolor2={!hotkey.alt}
                    onclick={() => {
                        hotkey.alt = !hotkey.alt;
                    }}
                >
                    Alt
                </button>
                <input
                    value={formatHotkeyKey(hotkey.key)}
                    class="h-7 w-16 rounded-md border border-darkborderc bg-transparent px-2 text-center text-xs text-textcolor transition-colors focus:border-borderc focus:outline-hidden focus:ring-2 focus:ring-borderc"
                    onkeydown={(e) => {
                        e.preventDefault();
                        hotkey.key = e.key;
                    }}
                >
            </div>
        </div>
    {/each}
</div>
