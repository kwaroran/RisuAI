<script lang="ts">
    import TextInput from "src/lib/UI/GUI/TextInput.svelte";
    import NumberInput from "src/lib/UI/GUI/NumberInput.svelte";
    import SelectInput from "src/lib/UI/GUI/SelectInput.svelte";
    import OptionInput from "src/lib/UI/GUI/OptionInput.svelte";
    import OptionalInput from "src/lib/UI/GUI/OptionalInput.svelte";
    import { DataBase } from "src/ts/storage/database";
    let openOobaSettings = false
    const toggleOobaSettings = () => {
        openOobaSettings = !openOobaSettings
    }
</script>

<div class="border-darkborderc border px-2 flex flex-col py-4 rounded-md">

{#if !openOobaSettings}
    <button on:click={toggleOobaSettings}>
        ⮞ Ooba Settings
    </button>
{:else}
    <button on:click={toggleOobaSettings}> 
        ⮟ Ooba Settings
    </button>

    <div class="border-b border-b-darkborderc mt-4 mb-4">

    </div>
    <span class="text-textcolor">Ooba Mode</span>
    <SelectInput className="mt-2 mb-4" bind:value={$DataBase.reverseProxyOobaArgs.mode}>
        <OptionInput value="instruct">Instruct</OptionInput>
        <OptionInput value="chat">Chat</OptionInput>
        <OptionInput value="chat-instruct">Chat-Instruct</OptionInput>
    </SelectInput>
    <!-- name1 = user | name2 = bot --->

    {#if $DataBase.reverseProxyOobaArgs.mode === 'instruct'}
        <span class="text-textcolor">user prefix</span>
        <OptionalInput marginBottom={true} bind:value={$DataBase.reverseProxyOobaArgs.name1_instruct} />
        <span class="text-textcolor">bot prefix</span>
        <OptionalInput marginBottom={true} bind:value={$DataBase.reverseProxyOobaArgs.name2_instruct} />
        <span class="text-textcolor">system prefix</span>
        <OptionalInput marginBottom={true} bind:value={$DataBase.reverseProxyOobaArgs.context_instruct} />
        <span class="text-textcolor">system message</span>
        <OptionalInput marginBottom={true} bind:value={$DataBase.reverseProxyOobaArgs.system_message} />
    {/if}
    {#if $DataBase.reverseProxyOobaArgs.mode === 'chat' || $DataBase.reverseProxyOobaArgs.mode === 'chat-instruct'}
        <span class="text-textcolor">user prefix</span>
        <OptionalInput marginBottom={true} bind:value={$DataBase.reverseProxyOobaArgs.name1} />
        <span class="text-textcolor">bot prefix</span>
        <OptionalInput marginBottom={true} bind:value={$DataBase.reverseProxyOobaArgs.name2} />
        <span class="text-textcolor">system prefix</span>
        <OptionalInput marginBottom={true} bind:value={$DataBase.reverseProxyOobaArgs.context} />
        <span class="text-textcolor">start message</span>
        <OptionalInput marginBottom={true} bind:value={$DataBase.reverseProxyOobaArgs.greeting} />
    {/if}
    {#if $DataBase.reverseProxyOobaArgs.mode === 'chat-instruct'}
        <span class="text-textcolor">chat_instruct_command</span>
        <OptionalInput marginBottom={true} bind:value={$DataBase.reverseProxyOobaArgs.chat_instruct_command} />
    {/if}
    <span class="text-textcolor">min_p</span>
    <OptionalInput marginBottom={true} bind:value={$DataBase.reverseProxyOobaArgs.min_p} numberMode />
    <span class="text-textcolor">top_k</span>
    <OptionalInput marginBottom={true} bind:value={$DataBase.reverseProxyOobaArgs.top_k} numberMode />
    <span class="text-textcolor">repetition_penalty</span>
    <OptionalInput marginBottom={true} bind:value={$DataBase.reverseProxyOobaArgs.repetition_penalty} numberMode />
    <span class="text-textcolor">repetition_penalty_range</span>
    <OptionalInput marginBottom={true} bind:value={$DataBase.reverseProxyOobaArgs.repetition_penalty_range} numberMode />
    <span class="text-textcolor">typical_p</span>
    <OptionalInput marginBottom={true} bind:value={$DataBase.reverseProxyOobaArgs.typical_p} numberMode />
    <span class="text-textcolor">tfs</span>
    <OptionalInput marginBottom={true} bind:value={$DataBase.reverseProxyOobaArgs.tfs} numberMode />
    <span class="text-textcolor">top_a</span>
    <OptionalInput marginBottom={true} bind:value={$DataBase.reverseProxyOobaArgs.top_a} numberMode />
    <span class="text-textcolor">epsilon_cutoff</span>
    <OptionalInput marginBottom={true} bind:value={$DataBase.reverseProxyOobaArgs.epsilon_cutoff} numberMode />
    <span class="text-textcolor">eta_cutoff</span>
    <OptionalInput marginBottom={true} bind:value={$DataBase.reverseProxyOobaArgs.eta_cutoff} numberMode />
    <span class="text-textcolor">guidance_scale</span>
    <OptionalInput marginBottom={true} bind:value={$DataBase.reverseProxyOobaArgs.guidance_scale} numberMode />
    <span class="text-textcolor">penalty_alpha</span>
    <OptionalInput marginBottom={true} bind:value={$DataBase.reverseProxyOobaArgs.penalty_alpha} numberMode />
    <span class="text-textcolor">mirostat_mode</span>
    <OptionalInput marginBottom={true} bind:value={$DataBase.reverseProxyOobaArgs.mirostat_mode} numberMode />
    <span class="text-textcolor">mirostat_tau</span>
    <OptionalInput marginBottom={true} bind:value={$DataBase.reverseProxyOobaArgs.mirostat_tau} numberMode />
    <span class="text-textcolor">mirostat_eta</span>
    <OptionalInput marginBottom={true} bind:value={$DataBase.reverseProxyOobaArgs.mirostat_eta} numberMode />
    <span class="text-textcolor">encoder_repetition_penalty</span>
    <OptionalInput marginBottom={true} bind:value={$DataBase.reverseProxyOobaArgs.encoder_repetition_penalty} numberMode />
    <span class="text-textcolor">no_repeat_ngram_size</span>
    <OptionalInput marginBottom={true} bind:value={$DataBase.reverseProxyOobaArgs.no_repeat_ngram_size} numberMode />
    <span class="text-textcolor">min_length</span>
    <OptionalInput marginBottom={true} bind:value={$DataBase.reverseProxyOobaArgs.min_length} numberMode />
    <span class="text-textcolor">num_beams</span>
    <OptionalInput marginBottom={true} bind:value={$DataBase.reverseProxyOobaArgs.num_beams} numberMode />
    <span class="text-textcolor">length_penalty</span>
    <OptionalInput marginBottom={true} bind:value={$DataBase.reverseProxyOobaArgs.length_penalty} numberMode />
    <span class="text-textcolor">truncation_length</span>
    <OptionalInput marginBottom={true} bind:value={$DataBase.reverseProxyOobaArgs.truncation_length} numberMode />
    <span class="text-textcolor">max_tokens_second</span>
    <OptionalInput marginBottom={true} bind:value={$DataBase.reverseProxyOobaArgs.max_tokens_second} numberMode />
    <span class="text-textcolor">negative_prompt</span>
    <OptionalInput marginBottom={true} bind:value={$DataBase.reverseProxyOobaArgs.negative_prompt} />
    <span class="text-textcolor">custom_token_bans</span>
    <OptionalInput marginBottom={true} bind:value={$DataBase.reverseProxyOobaArgs.custom_token_bans} />
    <span class="text-textcolor">grammar_string</span>
    <OptionalInput marginBottom={true} bind:value={$DataBase.reverseProxyOobaArgs.grammar_string} />

    <span class="text-textcolor">custom_token_bans</span>
    <OptionalInput marginBottom={true} bind:value={$DataBase.reverseProxyOobaArgs.custom_token_bans} />
    <span class="text-textcolor">grammar_string</span>
    <OptionalInput marginBottom={true} bind:value={$DataBase.reverseProxyOobaArgs.grammar_string} />

    <span class="text-textcolor">temperature_last</span>
    <OptionalInput marginBottom={true} bind:value={$DataBase.reverseProxyOobaArgs.temperature_last} boolMode />
    <span class="text-textcolor">do_sample</span>
    <OptionalInput marginBottom={true} bind:value={$DataBase.reverseProxyOobaArgs.do_sample} boolMode />
    <span class="text-textcolor">early_stopping</span>
    <OptionalInput marginBottom={true} bind:value={$DataBase.reverseProxyOobaArgs.early_stopping} boolMode />
    <span class="text-textcolor">auto_max_new_tokens</span>
    <OptionalInput marginBottom={true} bind:value={$DataBase.reverseProxyOobaArgs.auto_max_new_tokens} boolMode />

    <span class="text-textcolor">ban_eos_token</span>
    <OptionalInput marginBottom={true} bind:value={$DataBase.reverseProxyOobaArgs.ban_eos_token} boolMode />
    <span class="text-textcolor">add_bos_token</span>
    <OptionalInput marginBottom={true} bind:value={$DataBase.reverseProxyOobaArgs.add_bos_token} boolMode />
    <span class="text-textcolor">skip_special_tokens</span>
    <OptionalInput marginBottom={true} bind:value={$DataBase.reverseProxyOobaArgs.skip_special_tokens} boolMode />
{/if}
</div>