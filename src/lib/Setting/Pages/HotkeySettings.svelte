<script lang="ts">
    import { language } from "src/lang";
    import { DBState } from "src/ts/stores.svelte";

    
</script>

{#if window.innerWidth < 768}
    <span class="text-red-500">
        {language.screenTooSmall}
    </span>

{:else}

    <table>
        <thead>
            <tr>
                <th>{language.hotkey}</th>
            </tr>
        </thead>
        <tbody>
            {#each DBState.db.hotkeys as hotkey}
                <tr>
                    <td>{language.hotkeyDesc[hotkey.action]}</td>
                    <td>

                        <button
                            class:text-textcolor={hotkey.ctrl}
                            class:text-textcolor2={!hotkey.ctrl}
                            onclick={() => {
                                hotkey.ctrl = !hotkey.ctrl;
                            }}
                        >
                            Ctrl
                        </button>
                    </td>
                    <td>
                        <button
                            class:text-textcolor={hotkey.shift}
                            class:text-textcolor2={!hotkey.shift}
                            onclick={() => {
                                hotkey.shift = !hotkey.shift;
                            }}
                        >
                            Shift
                        </button>
                    </td>
                    <td>
                        <button
                            class:text-textcolor={hotkey.alt}
                            class:text-textcolor2={!hotkey.alt}
                            onclick={() => {
                                hotkey.alt = !hotkey.alt;
                            }}
                        >
                            Alt
                        </button>
                    </td>
                    <td>
                        <input
                            value={hotkey.key === ' ' ? "SPACE" : hotkey.key?.toLocaleUpperCase()}
                            class="bg-bgcolor border-none w-16"
                            onkeydown={(e) => {
                                e.preventDefault();
                                hotkey.key = e.key;
                            }}
                        >
                    </td>
                </tr>
            {/each}
        </tbody>
    </table>
{/if}