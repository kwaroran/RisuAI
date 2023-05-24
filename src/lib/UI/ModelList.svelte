<script lang="ts">
    import { DataBase } from "src/ts/database";
    import { isTauri } from "src/ts/globalApi";
    import { getHordeModels } from "src/ts/horde/getModels";

    export let value = ""
</script>

{#await getHordeModels()}
    <select class="bg-transparent input-text mt-2 mb-2 text-gray-200 appearance-none text-sm" value="">
        <option value="" class="bg-darkbg appearance-none">Loading...</option>
    </select>
{:then models}
    <select class="bg-transparent input-text mt-2 mb-2 text-gray-200 appearance-none text-sm" bind:value>
        <optgroup class="bg-darkbg appearance-none" label="OpenAI">
            <option value="gpt35" class="bg-darkbg appearance-none">OpenAI GPT-3.5</option>
            <option value="gpt4" class="bg-darkbg appearance-none">OpenAI GPT-4</option>
        </optgroup>    
        <optgroup class="bg-darkbg appearance-none" label="Other Providers">
            <option value="palm2" class="bg-darkbg appearance-none">Google Palm2</option>
            <option value="textgen_webui" class="bg-darkbg appearance-none">Text Generation WebUI</option>
            {#if $DataBase.plugins.length > 0}
                <option value="custom" class="bg-darkbg appearance-none">Plugin</option>
            {/if}
        </optgroup>
        <!-- <optgroup class="bg-darkbg appearance-none" label="Horde">
            {#each models as model}
                <option value={"horde:::" + model} class="bg-darkbg appearance-none">{model}</option>            
            {/each}
        </optgroup> -->
    </select>
{/await}