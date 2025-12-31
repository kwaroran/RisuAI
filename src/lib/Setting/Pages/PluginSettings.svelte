<script lang="ts">
    import { PlusIcon, TrashIcon, LinkIcon, CodeXmlIcon } from "@lucide/svelte";
    import { language } from "src/lang";
    import { alertConfirm, alertMd } from "src/ts/alert";
    import { TriangleAlert } from '@lucide/svelte';

    import { DBState, hotReloading } from "src/ts/stores.svelte";
    import { checkPluginUpdate, createBlankPlugin, importPlugin, loadPlugins, updatePlugin } from "src/ts/plugins/plugins";
    import TextInput from "src/lib/UI/GUI/TextInput.svelte";
    import NumberInput from "src/lib/UI/GUI/NumberInput.svelte";
    import SelectInput from "src/lib/UI/GUI/SelectInput.svelte";
    import OptionInput from "src/lib/UI/GUI/OptionInput.svelte";
    import migrationGuideContent from "src/ts/plugins/migrationGuide.md?raw";
    import CheckInput from "src/lib/UI/GUI/CheckInput.svelte";
    import TextAreaInput from "src/lib/UI/GUI/TextAreaInput.svelte";
    import { hotReloadPluginFiles } from "src/ts/plugins/apiV3/developMode";

    let showParams = $state([])
</script>

<h2 class="mb-2 text-2xl font-bold mt-2">{language.plugin}</h2>

<span class="text-draculared text-xs mb-4">{language.pluginWarn}</span>

<div class="border-solid border-darkborderc p-2 flex flex-col border-1">
    {#if !DBState.db.plugins || DBState.db.plugins?.length === 0}
        <span class="text-textcolor2">{language.noPlugins}</span>
    {/if}
    {#each DBState.db.plugins as plugin, i}
        {#if i!==0}
        <div
            class="border-darkborderc mt-2 mb-2 w-full border-solid border-b-1 seperator"
        ></div>
        {/if}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <div class="flex gap-2" aria-labelledby="show-params" role='button' tabindex="0" onclick={() => {
            if(showParams.includes(i)){
                showParams.splice(showParams.indexOf(i),1)
            }
            else{
                showParams.push(i)
            }
        }}>
            <div class="font-bold grow">
                <span>
                    {plugin.displayName ?? plugin.name}
                </span>
                {#if hotReloading.includes(plugin.name)}
                    <span class="text-sm rounded bg-amber-700 ml-2 px-2 py-1 text-white">
                        Hot
                    </span>
                {/if}
            </div>
            {#if plugin.version === 2}
                <button class="text-yellow-400 hover:gray-200 cursor-pointer" onclick={() => {
                    alertMd(migrationGuideContent);
                }} >
                    <TriangleAlert />
                </button>
            {/if}

            {#if plugin.customLink}
                {#each plugin.customLink as link}
                    {#if typeof link.link === "string" && (link.link.startsWith("http://") || link.link.startsWith("https://"))}
                        <a
                            href={link.link}
                            target="_blank"
                            rel="nofollow noopener noreferrer"
                            class="text-textcolor2 hover:text-textcolor cursor-pointer"
                            title={link.hoverText}
                        >
                            <LinkIcon></LinkIcon>
                        </a>
                    {/if}
                {/each}
            {/if}

            {#if plugin.updateURL}
                {#await checkPluginUpdate(plugin) then updateInfo}
                    {#if updateInfo}
                        <button
                            class="text-green-400 hover:gray-200 cursor-pointer"
                            onclick={async () => {
                                const v = await alertConfirm(
                                    language.pluginUpdateFoundInstallIt
                                );
                                if (v) {
                                    updatePlugin(plugin)
                                }
                            }}
                        >
                            <PlusIcon />
                        </button>
                    {/if}
                {/await}
            {/if}

            <!--Also, remove button.-->
            <button
                class="textcolor2 hover:gray-200 cursor-pointer"
                onclick={async () => {
                    const v = await alertConfirm(
                        language.removeConfirm +
                            (plugin.displayName ?? plugin.name),
                    );
                    if (v) {
                        if (DBState.db.currentPluginProvider === plugin.name) {
                            DBState.db.currentPluginProvider = "";
                        }
                        let plugins = DBState.db.plugins ?? [];
                        plugins.splice(i, 1);
                        DBState.db.plugins = plugins;
                        loadPlugins()
                    }
                }}
            >
                <TrashIcon />
            </button>
        </div>
        {#if plugin.version === 1}
            <span class="text-draculared text-xs">
                {language.pluginVersionWarn
                    .replace("{{plugin_version}}", "API V1")
                    .replace("{{required_version}}", "API V3")}
            </span>
            <!--List up args-->
        {:else if Object.keys(plugin.arguments).filter((i) => !i.startsWith("hidden_")).length > 0 && showParams.includes(i)}
            <div class="flex flex-col mt-2 bg-dark-900/50 p-3">
                {#each Object.keys(plugin.arguments) as arg}
                    {#if !arg.startsWith("hidden_")}
                        {#if typeof(plugin?.argMeta?.[arg]?.divider) === 'string'}
                            {#if plugin?.argMeta?.[arg]?.divider}
                                <div class="flex items-center mt-6">
                                    <div aria-hidden="true" class="w-full border-t border-darkborderc"></div>
                                    <div class="relative flex justify-center">
                                        <span class="px-2 text-sm text-textarea text-nowrap">{plugin?.argMeta?.[arg]?.divider}</span>
                                    </div>
                                    <div aria-hidden="true" class="w-full border-t border-darkborderc"></div>
                                </div>
                            {:else}
                                <div aria-hidden="true" class="w-full border-t border-darkborderc mt-6"></div>
                            {/if}
                        {/if}
                        <span class="mb-2 mt-6">{plugin?.argMeta?.[arg]?.name || arg}</span>
                        {#if plugin?.argMeta?.[arg]?.description}
                            <span class="mb-2 text-sm text-textcolor2">{plugin?.argMeta?.[arg]?.description}</span>
                        {/if}
                        {#if Array.isArray(plugin.arguments[arg])}
                            <SelectInput
                                className="mt-2 mb-4"
                                bind:value={
                                    DBState.db.plugins[i].realArg[arg] as string
                                }
                            >
                                {#each plugin.arguments[arg] as a}
                                    <OptionInput value={a}>a</OptionInput>
                                {/each}
                            </SelectInput>
                        {:else if plugin.arguments[arg] === "string"}

                            {#if plugin?.argMeta?.[arg]?.textarea}
                                <TextAreaInput
                                    bind:value={
                                        DBState.db.plugins[i].realArg[arg] as string
                                    }
                                    placeholder={plugin?.argMeta?.[arg]?.placeholder}
                                />
                            {:else if plugin?.argMeta?.[arg]?.radio}
                                {#each plugin?.argMeta?.[arg]?.radio?.split(",") as radioOption}
                                    <CheckInput
                                        check={DBState.db.plugins[i].realArg[arg] === (radioOption.split('|').at(-1))}
                                        onChange={(e) => {
                                            if(e){
                                                DBState.db.plugins[i].realArg[arg] = (radioOption.split('|').at(-1))
                                            }
                                        }}
                                        margin={false}
                                        name={radioOption.split('|').at(0)}
                                    />
                                {/each}
                            {:else}
                                <TextInput
                                    bind:value={
                                        DBState.db.plugins[i].realArg[arg] as string
                                    }
                                    placeholder={plugin?.argMeta?.[arg]?.placeholder}
                                />
                            {/if}
                        {:else if plugin.arguments[arg] === "int"}
                            {#if plugin?.argMeta?.[arg]?.checkbox}
                                <CheckInput
                                    check={DBState.db.plugins[i].realArg[arg] === '1'}
                                    onChange={(e) => {
                                        DBState.db.plugins[i].realArg[arg] = e ? '1' : '0'
                                    }}
                                    margin={false}
                                    name={
                                        plugin?.argMeta?.[arg]?.checkbox === '1' ? language.enable : plugin?.argMeta?.[arg]?.checkbox
                                    }
                                />
                            {:else if plugin?.argMeta?.[arg]?.radio}
                                {#each plugin?.argMeta?.[arg]?.radio?.split(",") as radioOption}
                                    <CheckInput
                                        check={DBState.db.plugins[i].realArg[arg] === parseInt(radioOption.split('|').at(-1))}
                                        onChange={(e) => {
                                            if(e){
                                                DBState.db.plugins[i].realArg[arg] = parseInt(radioOption.split('|').at(-1))
                                            }
                                        }}
                                        margin={false}
                                        name={radioOption.split('|').at(0)}
                                    />
                                {/each}
                            {:else}
                                <NumberInput
                                    bind:value={
                                        DBState.db.plugins[i].realArg[arg] as number
                                    }
                                    placeholder={plugin?.argMeta?.[arg]?.placeholder}
                                />
                            {/if}
                        {/if}
                    {/if}
                {/each}
            </div>
        {/if}
    {/each}
</div>
<div class="text-textcolor2 mt-2 flex gap-2">
    <button
        onclick={() => {
            importPlugin()
        }}
        class="hover:text-textcolor cursor-pointer"
    >
        <PlusIcon />
    </button>

    <button
        onclick={async () => {
            await hotReloadPluginFiles()
        }}
        class="hover:text-textcolor cursor-pointer"
    >
        <CodeXmlIcon />
    </button>
</div>
