<script lang="ts">
    import type { SettingItem, SettingContext } from 'src/ts/setting/types';
    import { UNINITIALIZED, getLabel, getSettingValue, setSettingValue } from 'src/ts/setting/utils';
    import { untrack } from 'svelte';
    import SliderInput from 'src/lib/UI/GUI/SliderInput.svelte';
    import Help from 'src/lib/Others/Help.svelte';

    interface Props {
        item: SettingItem;
        ctx: SettingContext;
    }

    let { item, ctx }: Props = $props();

    let localValue: any = $state(untrack(() => getSettingValue(item, ctx)));

    // Sync: DB → local (one-way read)
    $effect(() => {
        localValue = getSettingValue(item, ctx);
    });

    // Write-back: local → DB (guarded)
    $effect(() => {
        const val = localValue;
        if (val === UNINITIALIZED) return;
        untrack(() => {
            if (val !== getSettingValue(item, ctx)) {
                setSettingValue(item, val, ctx);
            }
        });
    });

    let _sliderMult = $derived(item.options?.multiple ?? 1);
    let _sliderDisabled = $derived(localValue === -1000 || localValue === undefined || localValue === UNINITIALIZED);
    let customText = $derived(
        typeof item.options?.customText === 'function'
            ? item.options.customText(localValue)
            : item.options?.customText
    );
</script>

<span class="text-textcolor {item.classes ?? ''}">
    {getLabel(item)}
    {#if item.helpKey}<Help key={item.helpKey as any}/>{/if}
</span>
<div class="flex gap-2 items-center mb-4">
    <div class="flex-1">
        <SliderInput
            marginBottom={false}
            min={item.options?.min}
            max={item.options?.max}
            step={item.options?.step}
            fixed={item.options?.fixed}
            multiple={item.options?.multiple}
            disableable={item.options?.disableable}
            {customText}
            bind:value={localValue}
        />
    </div>
    <input
        type="number"
        value={_sliderDisabled ? '' : ((localValue ?? 0) * _sliderMult).toFixed(item.options?.fixed ?? 0)}
        disabled={_sliderDisabled}
        min={item.options?.min !== undefined ? item.options.min * _sliderMult : undefined}
        max={item.options?.max !== undefined ? item.options.max * _sliderMult : undefined}
        step={item.options?.step !== undefined ? item.options.step * _sliderMult : _sliderMult}
        onchange={(e) => {
            const v = parseFloat(e.currentTarget.value);
            if (!isNaN(v)) {
                const { min = -Infinity, max = Infinity, step = 1 } = item.options ?? {};
                const precision = item.options?.fixed ?? 0;
                const raw = v / _sliderMult;
                const rounded = parseFloat((Math.round(raw / step) * step).toFixed(precision));
                localValue = Math.min(Math.max(rounded, min), max);
            } else {
                e.currentTarget.value = _sliderDisabled ? '' : ((localValue ?? 0) * _sliderMult).toFixed(item.options?.fixed ?? 0);
            }
        }}
        class="border border-darkborderc focus:border-borderc rounded-md bg-transparent focus:ring-borderc focus:ring-2 focus:outline-hidden transition-colors duration-200 text-sm text-textcolor disabled:text-textcolor2 px-2 py-1 w-20 shrink-0"
    />
</div>
