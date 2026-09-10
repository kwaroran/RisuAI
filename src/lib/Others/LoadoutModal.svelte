<script lang="ts">
    import {
        XIcon,
        StarIcon,
        ClockIcon,
        UserIcon,
        ListIcon,
        SaveIcon,
        TrashIcon,
    } from "@lucide/svelte";
    import { DBState } from "src/ts/stores.svelte";
    import { loadoutModalStore } from "src/ts/stores.svelte";
    import { applyLoadout, saveCurrentLoadout, type Loadout } from "src/ts/loadout";
    import { getCurrentCharacter } from "src/ts/storage/database.svelte";

    type LoadoutApplyOption = 'modules' | 'globalVariables' | 'preset' | 'persona';

    let loadOptions: Record<LoadoutApplyOption, boolean> = $derived(DBState.db.loadoutApplyOptions ?? {
        modules: true,
        globalVariables: true,
        preset: true,
        persona: true,
    });

    const loadOptionLabels: Record<LoadoutApplyOption, string> = {
        modules: 'Modules',
        globalVariables: 'Global Variables',
        preset: 'Preset',
        persona: 'Persona',
    };

    let saveName = $state('');

    function close() {
        loadoutModalStore.open = false;
    }

    const RECENT_LIMIT = 3;

    function getSortedLoadouts(): Loadout[] {
        return [...(DBState.db.loadouts ?? [])].sort(
            (a, b) => b.lastUsed - a.lastUsed,
        );
    }

    function getRecentLoadouts(): Loadout[] {
        return getSortedLoadouts().slice(0, RECENT_LIMIT);
    }

    function getCharacterLoadouts(): Loadout[] {
        const chaId = getCurrentCharacter()?.chaId;
        if (!chaId) return [];
        return getSortedLoadouts()
            .filter((l) => l.characterIds?.includes(chaId))
            .slice(0, RECENT_LIMIT);
    }

    function getFavoriteLoadouts(): Loadout[] {
        return getSortedLoadouts().filter((l) => l.favorite);
    }

    function getAllLoadouts(): Loadout[] {
        return getSortedLoadouts();
    }

    function onSelect(loadout: Loadout) {
        const apply = (Object.keys(loadOptions) as LoadoutApplyOption[]).filter(k => loadOptions[k]);
        applyLoadout(loadout, apply);
        close();
    }

    function toggleFavorite(loadout: Loadout, e: MouseEvent) {
        e.stopPropagation();
        loadout.favorite = !loadout.favorite;
    }

    function formatDate(ts: number): string {
        const d = new Date(ts);
        return d.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    function removeLoadout(loadout: Loadout) {
        const index = DBState.db.loadouts.findIndex(l => l.id === loadout.id);
        if (index !== -1) {
            DBState.db.loadouts.splice(index, 1);
        }
    }
</script>

{#snippet loadoutCard(loadout: Loadout)}
    <div
        class="flex items-center gap-1 rounded-md bg-textcolor/5 hover:bg-textcolor/10 transition-colors"
    >
        <button
            class="flex-1 min-w-0 text-left flex flex-col px-3 py-2.5"
            onclick={() => onSelect(loadout)}
        >
            <span class="text-sm font-medium text-textcolor/90 truncate"
                >{loadout.name}</span
            >
            <span
                class="flex items-center gap-2 mt-0.5 text-xs text-textcolor/40 flex-wrap"
            >
                {#if loadout.presetName}
                    <span
                        >Preset: <span class="text-textcolor/60"
                            >{loadout.presetName}</span 
                        ></span
                    >
                {/if}
                <span>{formatDate(loadout.lastUsed)}</span>
            </span>
        </button>
        <button
            class="shrink-0 pr-1 py-2.5 transition-colors {loadout.favorite
                ? 'text-yellow-400'
                : 'text-textcolor/20 hover:text-textcolor/50'}"
            onclick={(e) => toggleFavorite(loadout, e)}
            aria-label={loadout.favorite ? "Unfavorite" : "Favorite"}
            title={loadout.favorite ? "Unfavorite" : "Favorite"}
        >
            <StarIcon
                size={15}
                fill={loadout.favorite ? "currentColor" : "none"}
            />
        </button>
        <button
            class="shrink-0 pr-3 py-2.5 transition-colors hover:text-red-400/50 text-textcolor/20"
            onclick={(e) => removeLoadout(loadout)}
            aria-label={"Remove"}
            title={"Remove"}
        >
            <TrashIcon
                size={15}
            />
        </button>
    </div>
{/snippet}

<div
    class="fixed inset-0 z-40 bg-black/60 flex justify-center items-center"
    role="presentation"
    onclick={(e) => {
        if (e.target === e.currentTarget) close();
    }}
>
    <div
        class="bg-darkbg rounded-lg flex flex-col w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-xl"
    >
        <div
            class="flex items-center justify-between px-5 py-3 border-b border-textcolor/10 shrink-0"
        >
            <span class="text-base font-semibold text-textcolor/90"
                >Select Loadout</span
            >
            <button
                class="text-textcolor/50 hover:text-textcolor/90 transition-colors"
                onclick={close}
                aria-label="Close"
            >
                <XIcon size={18} />
            </button>
        </div>

        <div class="flex items-center gap-2 px-5 py-2.5 border-b border-textcolor/10 shrink-0 flex-wrap">
            <span class="text-xs text-textcolor/40 uppercase tracking-wider font-medium mr-1">Load:</span>
            {#each Object.keys(loadOptions) as key}
                {@const k = key as LoadoutApplyOption}
                <button
                    class="px-2.5 py-1 rounded text-xs font-medium transition-colors {loadOptions[k]
                        ? 'bg-textcolor/15 text-textcolor/90'
                        : 'bg-textcolor/5 text-textcolor/30 hover:bg-textcolor/10 hover:text-textcolor/50'}"
                    onclick={() => loadOptions[k] = !loadOptions[k]}
                >
                    {loadOptionLabels[k]}
                </button>
            {/each}
        </div>

        <div
            class="overflow-y-auto flex-1 px-4 py-3 flex flex-col gap-5 break-any"
        >
            {#if getRecentLoadouts().length > 0}
                <section>
                    <div
                        class="flex items-center gap-1.5 mb-2 text-textcolor/50 text-xs uppercase tracking-wider font-medium"
                    >
                        <ClockIcon size={13} />
                        <span>Recently Used</span>
                    </div>
                    <div class="flex flex-col gap-1">
                        {#each getRecentLoadouts() as loadout (loadout.id)}
                            {@render loadoutCard(loadout)}
                        {/each}
                    </div>
                </section>
            {/if}

            {#if getCharacterLoadouts().length > 0}
                <section>
                    <div
                        class="flex items-center gap-1.5 mb-2 text-textcolor/50 text-xs uppercase tracking-wider font-medium"
                    >
                        <UserIcon size={13} />
                        <span>Recently Used with This Character</span>
                    </div>
                    <div class="flex flex-col gap-1">
                        {#each getCharacterLoadouts() as loadout (loadout.id)}
                            {@render loadoutCard(loadout)}
                        {/each}
                    </div>
                </section>
            {/if}

            {#if getFavoriteLoadouts().length > 0}
                <section>
                    <div
                        class="flex items-center gap-1.5 mb-2 text-yellow-400/70 text-xs uppercase tracking-wider font-medium"
                    >
                        <StarIcon size={13} />
                        <span>Favorites</span>
                    </div>
                    <div class="flex flex-col gap-1">
                        {#each getFavoriteLoadouts() as loadout (loadout.id)}
                            {@render loadoutCard(loadout)}
                        {/each}
                    </div>
                </section>
            {/if}

            <section>
                <div
                    class="flex items-center gap-1.5 mb-2 text-textcolor/50 text-xs uppercase tracking-wider font-medium"
                >
                    <ListIcon size={13} />
                    <span>All Loadouts</span>
                </div>
                {#if getAllLoadouts().length === 0}
                    <p class="text-textcolor/30 text-sm px-1">
                        No loadouts saved yet.
                    </p>
                {:else}
                    <div class="flex flex-col gap-1">
                        {#each getAllLoadouts() as loadout (loadout.id)}
                            {@render loadoutCard(loadout)}
                        {/each}
                    </div>
                {/if}
            </section>
        </div>

        <div class="flex items-center gap-2 px-5 py-3 border-t border-textcolor/10 shrink-0">
            <input
                type="text"
                bind:value={saveName}
                placeholder="Loadout name…"
                class="flex-1 min-w-0 bg-textcolor/5 hover:bg-textcolor/8 focus:bg-textcolor/10 border border-textcolor/10 focus:border-textcolor/25 rounded px-3 py-1.5 text-sm text-textcolor/80 placeholder:text-textcolor/25 outline-none transition-colors"
            />
            <button
                class="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded bg-textcolor/10 hover:bg-textcolor/15 text-textcolor/70 hover:text-textcolor/90 text-sm font-medium transition-colors disabled:opacity-30 disabled:pointer-events-none"
                disabled={!saveName.trim()}
                onclick={() => {
                    saveCurrentLoadout(saveName.trim());
                }}
            >
                <SaveIcon size={14} />
                Save
            </button>
        </div>
    </div>
</div>

<style>
    .break-any {
        word-break: normal;
        overflow-wrap: anywhere;
    }
</style>
