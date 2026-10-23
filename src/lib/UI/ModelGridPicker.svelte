<script lang="ts">
    import { language } from 'src/lang'
    import { DBState } from 'src/ts/stores.svelte'
    import { getCachedModelGridItems, hasModelGridCache, loadModelGridItems, type ModelGridItem } from 'src/ts/model/modelGrid'
    import { modelGridSources, type ModelGridSourceId } from 'src/ts/model/modelGridSources'
    import ModelGrid from './ModelGrid.svelte'
    import SegmentedControl from './GUI/SegmentedControl.svelte'
    import TextInput from './GUI/TextInput.svelte'

    interface Props {
        source: ModelGridSourceId
    }

    let { source: sourceId }: Props = $props()
    let source = $derived(modelGridSources[sourceId])

    const FETCH_DEBOUNCE_MS = 400

    let items = $state<ModelGridItem[]>([])
    let loading = $state(true)
    let firstLoad = true

    // Refetch when anything in cacheKey() changes; typing an API key is debounced, cache hits are not
    $effect(() => {
        if (DBState.db[source.inputModeKey] !== 'list') return
        const cacheId = `${sourceId}:${source.cacheKey()}`
        const fetchItems = source.fetchItems

        // Swap a finished list in synchronously, so the previous key's list is never left selectable
        const cachedItems = getCachedModelGridItems(cacheId)
        if (cachedItems) {
            items = cachedItems
            loading = false
            firstLoad = false
            return
        }

        // Hide the previous list behind the spinner until this key's list arrives
        loading = true
        const delay = firstLoad || hasModelGridCache(cacheId) ? 0 : FETCH_DEBOUNCE_MS
        firstLoad = false

        let cancelled = false
        const timer = setTimeout(async () => {
            const result = await loadModelGridItems(cacheId, fetchItems).catch((): ModelGridItem[] => [])
            if (cancelled) return
            items = result
            loading = false
        }, delay)
        return () => {
            cancelled = true
            clearTimeout(timer)
        }
    })

    function onManualInput() {
        DBState.db[source.nameKey] = ''
        source.onModelChange?.()
    }

    function onGridSelect(_id: string, displayName: string) {
        DBState.db[source.nameKey] = displayName
        source.onModelChange?.()
    }
</script>

<span class="text-textcolor mt-4">{source.label} {language.model}</span>
<SegmentedControl
    bind:value={DBState.db[source.inputModeKey]}
    options={[
        { value: 'list', label: language.modelGridSelectFromList },
        { value: 'manual', label: language.modelGridManualInput },
    ]}
    size="md"
/>

{#if DBState.db[source.inputModeKey] === 'manual'}
    <TextInput
        marginBottom={false}
        size="sm"
        bind:value={DBState.db[source.modelKey]}
        placeholder={language.modelGridManualModelPlaceholder}
        oninput={onManualInput}
    />
{:else}
    <ModelGrid
        bind:value={DBState.db[source.modelKey]}
        {items}
        {loading}
        pinnedItems={source.pinnedItems}
        showSubBadge={source.showSubBadge?.() ?? false}
        fallbackLabel={DBState.db[source.nameKey]}
        onselect={onGridSelect}
    />
{/if}
