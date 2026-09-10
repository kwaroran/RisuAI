<script lang="ts">
    import { PlusIcon, TrashIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import Help from 'src/lib/Others/Help.svelte'
    import Accordion from 'src/lib/UI/Accordion.svelte'
    import CheckInput from 'src/lib/UI/GUI/CheckInput.svelte'
    import OptionInput from 'src/lib/UI/GUI/OptionInput.svelte'
    import SelectInput from 'src/lib/UI/GUI/SelectInput.svelte'
    import OpenrouterProviderList from 'src/lib/UI/OpenrouterProviderList.svelte'
    import { getVercelGatewayProviders } from 'src/ts/model/vercel'
    import { LLMFormat } from 'src/ts/model/modellist'
    import { DBState } from 'src/ts/stores.svelte'

    function addProvider() {
        DBState.db.vercelGateway.order = [...DBState.db.vercelGateway.order, '']
    }

    function removeProvider() {
        DBState.db.vercelGateway.order = DBState.db.vercelGateway.order.slice(0, -1)
    }

    function isProviderExcluded(provider: string): boolean {
        const excluded = DBState.db.vercelGateway.excluded ?? []
        if(excluded.length > 0) return excluded.includes(provider)

        const legacyOnly = DBState.db.vercelGateway.only ?? []
        return legacyOnly.length > 0 && !legacyOnly.includes(provider)
    }

    function setProviderExcluded(provider: string, shouldExclude: boolean, providers: { slug: string }[]) {
        const excluded = providers
            .filter((item) => isProviderExcluded(item.slug))
            .map((item) => item.slug)
        const next = shouldExclude
            ? [...excluded, provider]
            : excluded.filter((item) => item !== provider)

        DBState.db.vercelGateway.excluded = [...new Set(next)]
        DBState.db.vercelGateway.only = []
    }
</script>

<Accordion name={language.vercelGatewaySettings} styled>
    <span class="text-textcolor">{language.vercelAPIFormat}</span>
    <SelectInput value={DBState.db.vercelRequestFormat.toString()} onchange={(event) => {
        DBState.db.vercelRequestFormat = Number(event.currentTarget.value) as LLMFormat
    }}>
        <OptionInput value={LLMFormat.OpenAICompatible.toString()}>{language.vercelChatCompletions}</OptionInput>
        <OptionInput value={LLMFormat.OpenAIResponseAPI.toString()}>{language.vercelResponsesAPI}</OptionInput>
    </SelectInput>

    <span class="mt-4 text-textcolor">{language.vercelProviderSort}</span>
    <SelectInput bind:value={DBState.db.vercelGateway.sort}>
        <OptionInput value="auto">{language.vercelSortAuto}</OptionInput>
        <OptionInput value="cost">{language.vercelSortCost}</OptionInput>
        <OptionInput value="ttft">{language.vercelSortTTFT}</OptionInput>
        <OptionInput value="tps">{language.vercelSortTPS}</OptionInput>
    </SelectInput>

    <span class="mt-4 text-textcolor">{language.vercelServiceTier} <Help key="vercelServiceTier" /></span>
    <SelectInput bind:value={DBState.db.vercelGateway.serviceTier}>
        <OptionInput value="default">{language.vercelTierDefault}</OptionInput>
        <OptionInput value="priority">{language.vercelTierPriority}</OptionInput>
        <OptionInput value="flex">{language.vercelTierFlex}</OptionInput>
    </SelectInput>

    <div class="mt-4 flex flex-col gap-3 text-textcolor">
        <CheckInput bind:check={DBState.db.vercelGateway.zeroDataRetention} name={language.vercelZeroDataRetention}><Help key="vercelZeroDataRetention" /></CheckInput>
        <CheckInput bind:check={DBState.db.vercelGateway.disallowPromptTraining} name={language.vercelDisallowPromptTraining}><Help key="vercelDisallowPromptTraining" /></CheckInput>
        <CheckInput bind:check={DBState.db.vercelGateway.automaticCaching} name={language.vercelAutomaticCaching}><Help key="vercelAutomaticCaching" /></CheckInput>
    </div>

    {#await getVercelGatewayProviders(DBState.db.vercelRequestModel)}
        <p class="mt-4 text-textcolor2">{language.loading}...</p>
    {:then providers}
        <Accordion name={language.vercelProviderOrder} help="vercelGatewayRouting" styled>
            {#each DBState.db.vercelGateway.order as _, index}
                <span class="mt-4 text-textcolor">{language.provider} {index + 1}</span>
                <OpenrouterProviderList bind:value={DBState.db.vercelGateway.order[index]} options={providers} />
            {/each}
            <div class="flex gap-2">
                <button class="rounded-md bg-selected p-2 text-textcolor" onclick={addProvider}><PlusIcon /></button>
                <button class="rounded-md bg-red-500 p-2 text-white" onclick={removeProvider}><TrashIcon /></button>
            </div>
        </Accordion>

        <div class="mt-4 flex flex-col gap-2 rounded-md border border-selected p-3">
            <span class="text-lg text-textcolor">{language.vercelProviderExcluded} <Help key="vercelGatewayRouting" /></span>
            <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {#each providers as provider}
                    <CheckInput
                        check={isProviderExcluded(provider.slug)}
                        name={provider.name}
                        onChange={(excluded) => setProviderExcluded(provider.slug, excluded, providers)}
                    />
                {/each}
            </div>
        </div>
    {/await}
</Accordion>
