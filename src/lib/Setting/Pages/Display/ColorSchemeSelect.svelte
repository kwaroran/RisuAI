<script lang="ts">
    import { language } from 'src/lang';
    import { DBState } from 'src/ts/stores.svelte';
    import {
        changeColorScheme,
        colorSchemeList,
        colorSchemePresets,
        type ColorScheme,
    } from 'src/ts/gui/colorscheme';

    const formatSchemeName = (name: string) => {
        if (name === 'custom') {
            return 'Custom';
        }

        return name
            .split('-')
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
    };

    const paletteStyle = (scheme: ColorScheme) => {
        const { bgcolor, darkbg, borderc, selected } = scheme;

        return `background: conic-gradient(from 45deg, ${bgcolor} 0deg 90deg, ${darkbg} 90deg 180deg, ${borderc} 180deg 270deg, ${selected} 270deg 360deg);`;
    };
</script>

<span class="text-textcolor mt-4">{language.colorScheme}</span>

<div class="mt-2 grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-2">
    {#each colorSchemeList as scheme}
        <button
            type="button"
            class="flex min-h-28 flex-col items-center justify-center gap-2 rounded-md border p-3 text-center transition-colors hover:bg-darkbutton focus:outline-hidden focus:ring-2 focus:ring-borderc"
            class:border-borderc={DBState.db.colorSchemeName === scheme}
            class:border-darkborderc={DBState.db.colorSchemeName !== scheme}
            class:bg-darkbutton={DBState.db.colorSchemeName === scheme}
            aria-pressed={DBState.db.colorSchemeName === scheme}
            title={formatSchemeName(scheme)}
            onclick={() => changeColorScheme(scheme)}
        >
            <span
                class="palette-wheel relative h-14 w-14 overflow-hidden rounded-full shadow-sm"
                aria-hidden="true"
            >
                <span class="palette-wheel-fill" style={paletteStyle(colorSchemePresets[scheme])}></span>
            </span>
            <span class="w-full truncate text-sm text-textcolor">{formatSchemeName(scheme)}</span>
        </button>
    {/each}

    <button
        type="button"
        class="flex min-h-28 flex-col items-center justify-center gap-2 rounded-md border p-3 text-center transition-colors hover:bg-darkbutton focus:outline-hidden focus:ring-2 focus:ring-borderc"
        class:border-borderc={DBState.db.colorSchemeName === 'custom'}
        class:border-darkborderc={DBState.db.colorSchemeName !== 'custom'}
        class:bg-darkbutton={DBState.db.colorSchemeName === 'custom'}
        aria-pressed={DBState.db.colorSchemeName === 'custom'}
        title="Custom"
        onclick={() => changeColorScheme('custom')}
    >
        <span
            class="palette-wheel relative h-14 w-14 overflow-hidden rounded-full shadow-sm"
            aria-hidden="true"
        >
            <span class="palette-wheel-fill" style={paletteStyle(DBState.db.customColorScheme)}></span>
        </span>
        <span class="w-full truncate text-sm text-textcolor">Custom</span>
    </button>
</div>

<style>
    .palette-wheel {
        box-shadow:
            inset 0 0 0 1px rgb(255 255 255 / 0.2),
            0 1px 2px rgb(0 0 0 / 0.15);
        box-shadow:
            inset 0 0 0 1px color-mix(in srgb, var(--risu-theme-textcolor) 20%, transparent),
            0 1px 2px rgb(0 0 0 / 0.15);
    }

    .palette-wheel-fill {
        position: absolute;
        inset: -1px;
        border-radius: inherit;
    }
</style>
