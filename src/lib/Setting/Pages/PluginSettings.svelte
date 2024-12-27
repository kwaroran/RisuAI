<script lang="ts">
    import { PlusIcon, TrashIcon } from "lucide-svelte";
    import { language } from "src/lang";
    import { alertConfirm } from "src/ts/alert";
    
    import { DBState } from 'src/ts/stores.svelte';
    import { importPlugin } from "src/ts/plugins/plugins";
    import TextInput from "src/lib/UI/GUI/TextInput.svelte";
    import NumberInput from "src/lib/UI/GUI/NumberInput.svelte";
    import SelectInput from "src/lib/UI/GUI/SelectInput.svelte";
    import OptionInput from "src/lib/UI/GUI/OptionInput.svelte";

</script>
<h2 class="mb-2 text-2xl font-bold mt-2">{language.plugin}</h2>

<span class="text-draculared text-xs mb-4">{language.pluginWarn}</span>


<div class="border-solid border-darkborderc p-2 flex flex-col border-1">
    {#if !DBState.db.plugins || DBState.db.plugins?.length === 0}
        <span class="text-textcolor2">{language.noPlugins}</span>
    {/if}
    {#each DBState.db.plugins as plugin, i}
        <div class="border-darkborderc mt-2 mb-2 w-full border-solid border-b-1 seperator"></div>
        <div class="flex">
            <span class="font-bold flex-grow">{plugin.displayName ?? plugin.name}</span>
            <button class="textcolor2 hover:gray-200 cursor-pointer" onclick={async () => {
                const v = await alertConfirm(language.removeConfirm + (plugin.displayName ?? plugin.name))
                if(v){
                    if(DBState.db.currentPluginProvider === plugin.name){
                        DBState.db.currentPluginProvider  = ''
                    }
                    let plugins = DBState.db.plugins ?? []
                    plugins.splice(i, 1)
                    DBState.db.plugins = plugins
                }
            }}>
                <TrashIcon />
            </button>
        </div>
        {#if plugin.version !== 2}
            <span class="text-draculared text-xs">
                {language.pluginVersionWarn.replace('{{plugin_version}}', 'API V1').replace('{{required_version}}', 'API V2')}
            </span>
        {:else if Object.keys(plugin.arguments).length > 0}
            <div class="flex flex-col mt-2 bg-dark-900 bg-opacity-50 p-3">
                {#each Object.keys(plugin.arguments) as arg}
                    <span>{arg}</span>
                    {#if Array.isArray(plugin.arguments[arg])}
                        <SelectInput className="mt-2 mb-4" bind:value={DBState.db.plugins[i].realArg[arg] as string}>
                            {#each plugin.arguments[arg] as a}
                                <OptionInput value={a}>a</OptionInput>
                            {/each}
                        </SelectInput>
                    {:else if plugin.arguments[arg] === 'string'}
                        <TextInput  bind:value={DBState.db.plugins[i].realArg[arg] as string} />
                    {:else if plugin.arguments[arg] === 'int'}
                        <NumberInput bind:value={DBState.db.plugins[i].realArg[arg] as number} />
                    {/if}
                {/each}
            </div>
        {/if}
    {/each}
</div>
<div class="text-textcolor2 mt-2 flex">
    <button onclick={() => {
        importPlugin()  
    }} class="hover:text-textcolor cursor-pointer">
        <PlusIcon />
    </button>
</div>