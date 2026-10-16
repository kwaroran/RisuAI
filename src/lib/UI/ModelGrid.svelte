<script lang="ts">
    import type { ModelGridItem, ModelGridPinnedItem } from 'src/ts/model/modelGrid'
    import { language } from 'src/lang'
    import TextInput from './GUI/TextInput.svelte'

    interface Props {
        value?: string
        items?: ModelGridItem[]
        pinnedItems?: ModelGridPinnedItem[]
        loading?: boolean
        showSubBadge?: boolean
        /** Label shown when the value matches neither a pinned entry nor a loaded item */
        fallbackLabel?: string
        onselect?: (id: string, displayName: string) => void
    }

    let { value = $bindable(''), items = [], pinnedItems = [], loading = false, showSubBadge = false, fallbackLabel, onselect }: Props = $props()

    let searchQuery = $state('')
    let sortField = $state<'name' | 'price' | 'provider'>('price')
    let sortDir   = $state<'asc' | 'desc'>('asc')

    let sortFields = $derived([
        { key: 'name'     as const, label: language.modelGridSortByName     },
        { key: 'price'    as const, label: language.modelGridSortByPrice    },
        { key: 'provider' as const, label: language.modelGridSortByProvider },
    ])

    let sortDirs = $derived([
        { key: 'asc'  as const, label: language.modelGridSortAsc  },
        { key: 'desc' as const, label: language.modelGridSortDesc },
    ])

    let filteredItems = $derived.by(() => {
        const base = searchQuery.trim()
            ? (() => {
                const terms = searchQuery.trim().toLowerCase().split(/\s+/)
                return items.filter(m => {
                    const text = (m.displayName + ' ' + m.providerName + ' ' + m.id).toLowerCase()
                    return terms.every(t => text.includes(t))
                })
              })()
            : items

        return [...base].sort((a, b) => {
            let cmp = 0
            if (sortField === 'name')          cmp = a.displayName.localeCompare(b.displayName)
            else if (sortField === 'price')    cmp = a.sortPrice - b.sortPrice
            else if (sortField === 'provider') cmp = a.providerName.localeCompare(b.providerName)
            return sortDir === 'asc' ? cmp : -cmp
        })
    })

    let selectedLabel = $derived.by(() => {
        if (!value) return '–'
        const match = pinnedItems.find(p => p.id === value) ?? items.find(m => m.id === value)
        const label = match ? `${match.providerName} / ${match.displayName}` : (fallbackLabel || value)
        return showSubBadge ? `${label} [SUB]` : label
    })

    function formatContext(length: number): string {
        if (!length) return ''
        if (length >= 1_000_000) return `${(length / 1_000_000).toFixed(0)}M`
        return `${Math.round(length / 1000)}k`
    }
</script>

<div class="mt-2 mb-4 flex flex-col gap-2">
    {#if !loading}
        <p class="text-sm text-textcolor2">
            {language.model}: <span class="font-semibold text-base text-textcolor">{selectedLabel}</span>
        </p>
    {/if}

    {#if !loading && items.length > 0}
        <div class="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-1">
            <div class="flex gap-1">
                {#each sortFields as sf}
                    <button
                        onclick={() => { sortField = sf.key }}
                        class="rounded px-3 py-1 text-sm transition-colors {sortField === sf.key ? 'bg-selected text-textcolor font-bold ring-2 ring-textcolor/30 ring-offset-1 ring-offset-bgcolor shadow-md' : 'bg-darkbutton text-textcolor2 font-medium hover:bg-darkbutton hover:text-textcolor'}"
                    >{sf.label}</button>
                {/each}
            </div>

            <span class="hidden sm:inline mx-1.5 select-none text-textcolor2">|</span>

            <div class="flex gap-1">
                {#each sortDirs as sd}
                    <button
                        onclick={() => { sortDir = sd.key }}
                        class="rounded px-3 py-1 text-sm transition-colors {sortDir === sd.key ? 'bg-selected text-textcolor font-bold ring-2 ring-textcolor/30 ring-offset-1 ring-offset-bgcolor shadow-md' : 'bg-darkbutton text-textcolor2 font-medium hover:bg-darkbutton hover:text-textcolor'}"
                    >{sd.label}</button>
                {/each}
            </div>
        </div>

        <TextInput bind:value={searchQuery} placeholder={language.modelGridSearch} size="sm" />
    {/if}

    <div class="h-80 overflow-y-auto rounded-lg border border-darkborderc bg-bgcolor">
        {#if loading}
            <div class="flex h-full items-center justify-center">
                <div class="h-8 w-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
            </div>
        {:else}
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 p-2">
                <!-- Pinned special models: always visible, unaffected by search/sort -->
                {#each pinnedItems as pinned}
                    <button
                        onclick={() => { value = pinned.id; onselect?.(pinned.id, pinned.displayName) }}
                        class="flex cursor-pointer flex-col rounded-md border p-2.5 text-left transition-colors {value === pinned.id ? 'border-selected bg-selected' : 'border-darkborderc hover:bg-selected'}"
                    >
                        <span class="text-xs text-textcolor2">{pinned.providerName}</span>
                        <span class="text-sm font-semibold leading-tight text-textcolor">{pinned.displayName}</span>
                    </button>
                {/each}

                {#if items.length === 0}
                    <p class="col-span-full py-4 text-center text-sm text-textcolor2">
                        {language.modelGridCouldNotLoad}
                    </p>
                {:else if filteredItems.length === 0}
                    <p class="col-span-full py-4 text-center text-sm text-textcolor2">
                        {language.modelGridNoModelsMatch(searchQuery)}
                    </p>
                {:else}
                    {#each filteredItems as item}
                        <button
                            onclick={() => { value = item.id; onselect?.(item.id, item.displayName) }}
                            class="flex cursor-pointer flex-col rounded-md border p-2.5 text-left transition-colors {value === item.id ? 'border-selected bg-selected' : 'border-darkborderc hover:bg-selected'}"
                        >
                            <div class="flex items-center gap-1">
                                <span class="text-xs text-textcolor2">{item.providerName}</span>
                                {#if showSubBadge}
                                    <span class="rounded px-1 text-[0.6rem] font-bold leading-tight bg-selected text-textcolor">SUB</span>
                                {/if}
                            </div>
                            <span class="line-clamp-2 text-sm font-medium leading-snug text-textcolor">{item.displayName}</span>

                            {#if item.description}
                                <span class="mt-1 line-clamp-2 text-xs leading-snug text-textcolor2">{item.description}</span>
                            {/if}

                            {#if item.prices.length > 0}
                                <div class="mt-1.5 flex flex-col gap-0.5 text-xs text-textcolor2">
                                    {#each item.prices as price}
                                        <span>{price.label}: <span class="text-textcolor">{price.value}</span>/1M</span>
                                    {/each}
                                </div>
                            {/if}

                            {#if item.context_length > 0}
                                <span class="mt-1 text-xs text-textcolor2">{language.modelGridContext(formatContext(item.context_length))}</span>
                            {/if}
                        </button>
                    {/each}
                {/if}
            </div>
        {/if}
    </div>
</div>
