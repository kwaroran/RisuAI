<script lang="ts">
    import { BotIcon, PackageIcon, Sailboat } from "@lucide/svelte";
    import { QuickSettings } from "src/ts/stores.svelte";
    import BotSettings from "../Setting/Pages/BotSettings.svelte";
    import OtherBotSettings from "../Setting/Pages/OtherBotSettings.svelte";
    import ModuleSettings from "../Setting/Pages/Module/ModuleSettings.svelte";
</script>

<div class="flex mb-2 gap-2">
    <button class={QuickSettings.index === 0 ? 'text-textcolor ' : 'text-textcolor2'} onclick={() => {QuickSettings.index = 0}}>
        <BotIcon />
    </button>
    <button class={QuickSettings.index === 1 ? 'text-textcolor ' : 'text-textcolor2'} onclick={() => {QuickSettings.index = 1}}>
        <Sailboat />
    </button>
    <button class={QuickSettings.index === 2 ? 'text-textcolor ' : 'text-textcolor2'} onclick={() => {QuickSettings.index = 2}}>
        <PackageIcon />
    </button>
</div>

<div class="py-6 px-4 flex flex-col text-textcolor overflow-y-auto relative rs-setting-cont-5">
    {#if QuickSettings.index === 0}
        <BotSettings />
    {:else if QuickSettings.index === 1}
        <OtherBotSettings />
    {:else if QuickSettings.index === 2}
        <ModuleSettings />
    {/if}
</div>