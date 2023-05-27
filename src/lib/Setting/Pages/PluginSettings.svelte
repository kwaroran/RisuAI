<script lang="ts">
  import { PlusIcon, TrashIcon } from "lucide-svelte";
  import { language } from "src/lang";
  import { alertConfirm } from "src/ts/alert";
  import { DataBase } from "src/ts/storage/database";
  import { importPlugin } from "src/ts/process/plugins";

</script>
<h2 class="mb-2 text-2xl font-bold mt-2">{language.plugin}</h2>
<span class="text-draculared text-xs mb-4">{language.pluginWarn}</span>


<div class="border-solid border-borderc p-2 flex flex-col border-1">
    {#if $DataBase.plugins.length === 0}
        <span class="text-gray-500">No Plugins</span>
    {:else}
        {#each $DataBase.plugins as plugin, i}
            {#if i !== 0}
                <div class="border-borderc mt-2 mb-2 w-full border-solid border-b-1 seperator"></div>
            {/if}
                <div class="flex">
                    <span class="font-bold flex-grow">{plugin.displayName ?? plugin.name}</span>
                    <button class="gray-500 hover:gray-200 cursor-pointer" on:click={async () => {
                        const v = await alertConfirm(language.removeConfirm + (plugin.displayName ?? plugin.name))
                        if(v){
                            if($DataBase.currentPluginProvider === plugin.name){
                                $DataBase.currentPluginProvider  = ''
                            }
                            let plugins = $DataBase.plugins
                            plugins.splice(i, 1)
                            $DataBase.plugins = plugins
                        }
                    }}>
                        <TrashIcon />
                    </button>
                </div>
                {#if Object.keys(plugin.arguments).length > 0}
                    <div class="flex flex-col mt-2 bg-dark-900 bg-opacity-50 p-3">
                        {#each Object.keys(plugin.arguments) as arg}
                            <span>{arg}</span>
                            {#if Array.isArray(plugin.arguments[arg])}
                                <select class="bg-transparent input-text mt-2 mb-4 text-gray-200 appearance-none" bind:value={$DataBase.plugins[i].realArg[arg]}>
                                    {#each plugin.arguments[arg] as a}
                                        <option value={a} class="bg-darkbg appearance-none">a</option>
                                    {/each}
                                </select>
                            {:else if plugin.arguments[arg] === 'string'}
                                <input class="text-neutral-200 p-2 bg-transparent input-text focus:bg-selected" bind:value={$DataBase.plugins[i].realArg[arg]}>
                            {:else if plugin.arguments[arg] === 'int'}
                                <input class="text-neutral-200 p-2 bg-transparent input-text focus:bg-selected" type="number" bind:value={$DataBase.plugins[i].realArg[arg]}>
                            {/if}
                        {/each}
                    </div>
                {/if}
        {/each}
    {/if}
</div>
<div class="text-gray-500 mt-2 flex">
    <button on:click={() => {
        importPlugin()  
    }} class="hover:text-neutral-200 cursor-pointer">
        <PlusIcon />
    </button>
</div>