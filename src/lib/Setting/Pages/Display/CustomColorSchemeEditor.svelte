<script lang="ts">
    import { DBState } from 'src/ts/stores.svelte';
    import {
        changeColorSchemeType,
        exportColorScheme,
        importColorScheme,
        updateCustomColorScheme,
    } from 'src/ts/gui/colorscheme';
    import SelectInput from 'src/lib/UI/GUI/SelectInput.svelte';
    import OptionInput from 'src/lib/UI/GUI/OptionInput.svelte';
    import { DownloadIcon, HardDriveUploadIcon } from '@lucide/svelte';
    import { language } from 'src/lang';
    import {
        calculateContrastRatio,
        getContrastRating,
        type ContrastRating,
    } from 'src/ts/gui/colorContrast';

    const colors = [
        ['bgcolor', 'Background'],
        ['darkbg', 'Dark Background'],
        ['borderc', 'Color 1'],
        ['selected', 'Color 2'],
        ['draculared', 'Color 3'],
        ['darkBorderc', 'Color 4'],
        ['darkbutton', 'Color 5'],
        ['textcolor', 'Text Color'],
        ['textcolor2', 'Text Color 2'],
    ] as const;

    type ContrastPair =
        | 'textBackground'
        | 'textDarkBackground'
        | 'text2Background'
        | 'text2DarkBackground';

    function getContrastPairLabel(pair: ContrastPair): string {
        switch (pair) {
            case 'textBackground':
                return language.customColorContrastTextBackground;
            case 'textDarkBackground':
                return language.customColorContrastTextDarkBackground;
            case 'text2Background':
                return language.customColorContrastText2Background;
            case 'text2DarkBackground':
                return language.customColorContrastText2DarkBackground;
        }
    }

    function getContrastRatingLabel(rating: ContrastRating): string {
        switch (rating.label) {
            case 'excellent':
                return language.customColorContrastExcellent;
            case 'good':
                return language.customColorContrastGood;
            case 'limited':
                return language.customColorContrastLimited;
            case 'poor':
                return language.customColorContrastPoor;
        }
    }

    function getContrastRatingDetail(rating: ContrastRating): string {
        switch (rating.detail) {
            case 'AAA':
                return 'AAA';
            case 'AA':
                return 'AA';
            case 'largeTextOnly':
                return language.customColorContrastLargeTextOnly;
            case 'lowContrast':
                return language.customColorContrastLowContrast;
        }
    }

    let contrastChecks = $derived.by(() => {
        const scheme = DBState.db.customColorScheme;
        const pairs = [
            ['textBackground', scheme.textcolor, scheme.bgcolor],
            ['textDarkBackground', scheme.textcolor, scheme.darkbg],
            ['text2Background', scheme.textcolor2, scheme.bgcolor],
            ['text2DarkBackground', scheme.textcolor2, scheme.darkbg],
        ] as const;

        return pairs.map(([pair, foreground, background]) => {
            const ratio = calculateContrastRatio(foreground, background);
            return {
                pair,
                foreground,
                background,
                ratio,
                rating: ratio === null ? null : getContrastRating(ratio),
            };
        });
    });
</script>

{#if DBState.db.colorSchemeName === 'custom'}
    <div class="border border-darkborderc p-2 m-2 rounded-md">
        <SelectInput
            className="mt-2"
            value={DBState.db.customColorScheme.type}
            onchange={(e) => {
                changeColorSchemeType((e.target as HTMLInputElement).value as 'light' | 'dark');
            }}
        >
            <OptionInput value="light">Light</OptionInput>
            <OptionInput value="dark">Dark</OptionInput>
        </SelectInput>

        {#each colors as color}
            <div class="flex items-center mt-2">
                <input
                    type="color"
                    class="native-color-input"
                    aria-label={color[1]}
                    bind:value={DBState.db.customColorScheme[color[0]]}
                    oninput={updateCustomColorScheme}
                />
                <span class="ml-2">{color[1]}</span>
            </div>
        {/each}

        <div class="grow flex justify-end mt-3">
            <button
                class="text-textcolor2 hover:text-green-500 mr-2 cursor-pointer"
                onclick={() => exportColorScheme()}
            >
                <DownloadIcon size={18} />
            </button>
            <button
                class="text-textcolor2 hover:text-green-500 cursor-pointer"
                onclick={() => importColorScheme()}
            >
                <HardDriveUploadIcon size={18} />
            </button>
        </div>

        {#if DBState.db.showCustomColorContrast}
            <div class="contrast-section mt-4 pt-3 border-t border-darkborderc">
                <div class="font-semibold">{language.customColorContrastTitle}</div>
                <div class="mt-1 text-sm text-textcolor2">
                    {language.customColorContrastDescription}
                </div>

                <div class="mt-3 flex flex-col gap-2">
                    {#each contrastChecks as check}
                        <div class="contrast-row flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
                            <div class="contrast-pair flex items-center min-w-0">
                                <span
                                    class="contrast-preview border border-darkborderc"
                                    style:color={check.foreground}
                                    style:background={check.background}
                                    aria-hidden="true"
                                >Aa</span>
                                <span class="ml-2">{getContrastPairLabel(check.pair)}</span>
                            </div>
                            {#if check.ratio !== null && check.rating !== null}
                                <div class="contrast-result shrink-0">
                                    <span class="contrast-ratio tabular-nums">{check.ratio.toFixed(2)} : 1</span>
                                    <span class="contrast-rating text-textcolor2">
                                        {getContrastRatingLabel(check.rating)} ({getContrastRatingDetail(check.rating)})
                                    </span>
                                </div>
                            {:else}
                                <span class="contrast-unavailable shrink-0 text-textcolor2">
                                    {language.customColorContrastUnavailable}
                                </span>
                            {/if}
                        </div>
                    {/each}
                </div>
            </div>
        {/if}

    </div>
{/if}

<style>
    .contrast-section {
        container-type: inline-size;
    }

    .contrast-result {
        display: flex;
        align-items: center;
    }

    .contrast-rating {
        margin-left: 0.5rem;
    }

    @container (max-width: 32rem) {
        .contrast-row {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            align-items: center;
            column-gap: 0.75rem;
            row-gap: 0.125rem;
        }

        .contrast-result {
            display: contents;
        }

        .contrast-ratio {
            grid-column: 2;
            grid-row: 1;
            white-space: nowrap;
        }

        .contrast-rating,
        .contrast-unavailable {
            grid-column: 1 / -1;
            grid-row: 2;
            justify-self: end;
            margin-left: 0;
            text-align: right;
        }
    }

    .contrast-preview {
        display: inline-flex;
        width: 2rem;
        height: 1.5rem;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        border-radius: 0.25rem;
        font-size: 0.75rem;
        font-weight: 600;
    }

    .native-color-input {
        width: 1.8rem;
        height: 1.8rem;
        padding: 0;
        border: 0;
        border-radius: 9999px;
        background: transparent;
        cursor: pointer;
        appearance: none;
        -webkit-appearance: none;
    }

    .native-color-input::-webkit-color-swatch-wrapper {
        padding: 0;
    }

    .native-color-input::-webkit-color-swatch {
        border: 1px solid var(--risu-theme-darkborderc);
        border-radius: 9999px;
    }

    .native-color-input::-moz-color-swatch {
        border: 1px solid var(--risu-theme-darkborderc);
        border-radius: 9999px;
    }
</style>
