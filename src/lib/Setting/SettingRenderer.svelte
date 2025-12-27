<script lang="ts">
    import type { SettingItem } from 'src/ts/setting/types';
    import { language } from 'src/lang';
    import { DBState } from 'src/ts/stores.svelte';
    import Check from 'src/lib/UI/GUI/CheckInput.svelte';
    import TextInput from 'src/lib/UI/GUI/TextInput.svelte';
    import NumberInput from 'src/lib/UI/GUI/NumberInput.svelte';
    import TextAreaInput from 'src/lib/UI/GUI/TextAreaInput.svelte';
    import SliderInput from 'src/lib/UI/GUI/SliderInput.svelte';
    import SelectInput from 'src/lib/UI/GUI/SelectInput.svelte';
    import OptionInput from 'src/lib/UI/GUI/OptionInput.svelte';
    import ColorInput from 'src/lib/UI/GUI/ColorInput.svelte';
    import Button from 'src/lib/UI/GUI/Button.svelte';
    import Help from 'src/lib/Others/Help.svelte';

    interface Props {
        items: SettingItem[];
        /** Spacing between checkboxes. Default: 'mt-4' for AdvancedSettings, use 'mt-2' for AccessibilitySettings */
        checkSpacing?: 'mt-2' | 'mt-4';
    }

    let { items, checkSpacing = 'mt-4' }: Props = $props();

    function getLabel(item: SettingItem): string {
        if (item.labelKey && language[item.labelKey]) {
            return language[item.labelKey];
        }
        return item.fallbackLabel ?? '';
    }

    /**
     * Get value from nested path (e.g., 'deeplOptions.key')
     */
    function getNestedValue(path: string): any {
        const keys = path.split('.');
        let value: any = DBState.db;
        for (const key of keys) {
            if (value === undefined || value === null) return undefined;
            value = value[key];
        }
        return value;
    }

    /**
     * Set value at nested path (e.g., 'deeplOptions.key')
     */
    function setNestedValue(path: string, newValue: any): void {
        const keys = path.split('.');
        const lastKey = keys.pop()!;
        let obj: any = DBState.db;
        for (const key of keys) {
            if (obj[key] === undefined) obj[key] = {};
            obj = obj[key];
        }
        obj[lastKey] = newValue;
    }

    /**
     * Get the effective value for an item (supports both bindKey and nestedBindKey)
     */
    function getValue(item: SettingItem): any {
        if (item.nestedBindKey) {
            return getNestedValue(item.nestedBindKey);
        }
        return item.bindKey ? DBState.db[item.bindKey] : undefined;
    }

    /**
     * Set the effective value for an item (supports both bindKey and nestedBindKey)
     */
    function setValue(item: SettingItem, value: any): void {
        if (item.nestedBindKey) {
            setNestedValue(item.nestedBindKey, value);
        } else if (item.bindKey) {
            (DBState.db as any)[item.bindKey] = value;
        }
        item.options?.onChange?.();
    }
</script>

{#each items as item (item.id)}
    {#if !item.renderManually && (!item.condition || item.condition(DBState.db))}
        {#if item.type === 'header'}
            {#if item.options?.level === 'h2'}
                <h2 class="text-2xl font-bold mt-2 mb-2">{getLabel(item)}</h2>
            {:else if item.options?.level === 'warning'}
                <span class="text-draculared text-xs mb-6">{getLabel(item)}</span>
            {:else}
                <span class="text-textcolor mt-4 mb-2">{getLabel(item)}</span>
            {/if}
        {:else if item.type === 'check'}
            <div class="flex items-center {checkSpacing}">
                {#if item.nestedBindKey}
                    <Check check={getNestedValue(item.nestedBindKey)} onChange={(v) => setNestedValue(item.nestedBindKey!, v)} name={getLabel(item)}>
                        {#if item.helpKey}<Help key={item.helpKey} unrecommended={item.options?.helpUnrecommended}/>{/if}
                    </Check>
                {:else}
                    <Check bind:check={DBState.db[item.bindKey]} onChange={item.options?.onChange} name={getLabel(item)}>
                        {#if item.helpKey}<Help key={item.helpKey} unrecommended={item.options?.helpUnrecommended}/>{/if}
                    </Check>
                {/if}
            </div>
        {:else if item.type === 'checkBlock'}
            <span class="text-textcolor mt-2">{getLabel(item)}
                {#if item.helpKey}<Help key={item.helpKey} unrecommended={item.options?.helpUnrecommended}/>{/if}
            </span>
            {#if item.nestedBindKey}
                <Check check={getNestedValue(item.nestedBindKey)} onChange={(v) => setNestedValue(item.nestedBindKey!, v)} hiddenName />
            {:else}
                <Check bind:check={DBState.db[item.bindKey]} hiddenName />
            {/if}
        {:else if item.type === 'text'}
            <span class="text-textcolor mt-2">{getLabel(item)}
                {#if item.helpKey}<Help key={item.helpKey}/>{/if}
            </span>
            {#if item.nestedBindKey}
                <TextInput 
                    marginBottom={true} 
                    size={item.options?.inputSize}
                    value={getNestedValue(item.nestedBindKey) ?? ''}
                    oninput={(e) => setNestedValue(item.nestedBindKey!, e.currentTarget.value)}
                    placeholder={item.options?.placeholder}
                    hideText={item.options?.hideText}
                />
            {:else}
                <TextInput 
                    marginBottom={true} 
                    size={item.options?.inputSize}
                    bind:value={DBState.db[item.bindKey]}
                    placeholder={item.options?.placeholder}
                    hideText={item.options?.hideText}
                />
            {/if}
        {:else if item.type === 'number'}
            <span class="text-textcolor">{getLabel(item)}
                {#if item.helpKey}<Help key={item.helpKey}/>{/if}
            </span>
            {#if item.nestedBindKey}
                <NumberInput 
                    marginBottom={true} 
                    size="sm" 
                    min={item.options?.min} 
                    max={item.options?.max} 
                    value={getNestedValue(item.nestedBindKey) ?? 0}
                    onChange={(e) => setNestedValue(item.nestedBindKey!, parseInt(e.currentTarget.value) || 0)}
                />
            {:else}
                <NumberInput 
                    marginBottom={true} 
                    size="sm" 
                    min={item.options?.min} 
                    max={item.options?.max} 
                    bind:value={DBState.db[item.bindKey]}
                />
            {/if}
        {:else if item.type === 'textarea'}
            <span class="text-textcolor">{getLabel(item)}
                {#if item.helpKey}<Help key={item.helpKey}/>{/if}
            </span>
            {#if item.nestedBindKey}
                <TextAreaInput 
                    value={getNestedValue(item.nestedBindKey) ?? ''}
                    onchange={() => setNestedValue(item.nestedBindKey!, getNestedValue(item.nestedBindKey!) ?? '')}
                    placeholder={item.options?.placeholder}
                />
            {:else}
                <TextAreaInput 
                    bind:value={DBState.db[item.bindKey]}
                    placeholder={item.options?.placeholder}
                />
            {/if}
        {:else if item.type === 'slider'}
            <span class="text-textcolor">{getLabel(item)}
                {#if item.helpKey}<Help key={item.helpKey}/>{/if}
            </span>
            <SliderInput 
                marginBottom={true}
                min={item.options?.min} 
                max={item.options?.max}
                step={item.options?.step}
                fixed={item.options?.fixed}
                multiple={item.options?.multiple}
                disableable={item.options?.disableable}
                customText={item.options?.customText}
                bind:value={DBState.db[item.bindKey]}
                onchange={item.options?.onChange}
            />
        {:else if item.type === 'select'}
            <span class="text-textcolor mt-4">{getLabel(item)}
                {#if item.helpKey}<Help key={item.helpKey}/>{/if}
            </span>
            {@const options = item.options?.getSelectOptions?.() ?? item.options?.selectOptions ?? []}
            {#if item.nestedBindKey}
                <SelectInput 
                    value={getNestedValue(item.nestedBindKey) ?? ''}
                    onchange={(e) => {
                        setNestedValue(item.nestedBindKey!, e.currentTarget.value);
                        item.options?.onValueChange?.(e.currentTarget.value);
                    }}
                >
                    {#each options as opt}
                        <OptionInput value={opt.value}>{opt.label}</OptionInput>
                    {/each}
                </SelectInput>
            {:else}
                <SelectInput 
                    bind:value={DBState.db[item.bindKey]}
                    onchange={(e) => item.options?.onValueChange?.(e.currentTarget.value)}
                >
                    {#each options as opt}
                        <OptionInput value={opt.value}>{opt.label}</OptionInput>
                    {/each}
                </SelectInput>
            {/if}
        {:else if item.type === 'color'}
            <div class="flex items-center mt-2">
                <ColorInput bind:value={(DBState.db as any)[item.bindKey]} />
                <span class="ml-2">{getLabel(item)}</span>
            </div>
        {:else if item.type === 'button'}
            <Button 
                className="mt-4"
                onclick={item.options?.onClick}
            >
                {getLabel(item)}
            </Button>
        {/if}
    {/if}
{/each}
