<script lang="ts">
    import { language } from "src/lang";
    import Accordion from "src/lib/UI/Accordion.svelte";
    import Check from "src/lib/UI/GUI/CheckInput.svelte";

    import { DBState } from 'src/ts/stores.svelte';
    import ChatFormatSettings from "./ChatFormatSettings.svelte";
</script>

<Accordion name={`OrcaRouter ${language.settings}`} styled>
    <div class="flex items-center mb-4">
        <Check bind:check={DBState.db.useInstructPrompt} name={language.useInstructPrompt}/>
    </div>
    {#if DBState.db.useInstructPrompt}
        <ChatFormatSettings />
    {/if}
</Accordion>
