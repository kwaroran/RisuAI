<script lang="ts">
    import { language } from 'src/lang';
    import { DBState } from 'src/ts/stores.svelte';
    import Arcodion from 'src/lib/UI/Arcodion.svelte';
    import CheckInput from 'src/lib/UI/GUI/CheckInput.svelte';
    import SliderInput from 'src/lib/UI/GUI/SliderInput.svelte';
    import Help from 'src/lib/Others/Help.svelte';

    const paramLabels: Record<string, string> = {
        memory: 'longTermMemory',
        emotion: 'emotionImage',
        translate: 'translator',
        otherAx: 'others',
    };
</script>

<Arcodion name={language.seperateParameters} styled>
    <CheckInput bind:check={DBState.db.seperateParametersEnabled} name={language.seperateParametersEnabled} />
    {#if DBState.db.seperateParametersEnabled}
        {#each Object.keys(DBState.db.seperateParameters) as param}
            <Arcodion name={language[paramLabels[param]] ?? param} styled>
                <span class="text-textcolor">{language.temperature} <Help key="tempature"/></span>
                <SliderInput min={0} max={200} marginBottom bind:value={DBState.db.seperateParameters[param].temperature} multiple={0.01} fixed={2} disableable/>
                <span class="text-textcolor">Top K</span>
                <SliderInput min={0} max={100} marginBottom step={1} bind:value={DBState.db.seperateParameters[param].top_k} disableable/>
                <span class="text-textcolor">{language.repetitionPenalty ?? 'Repetition Penalty'}</span>
                <SliderInput min={0} max={2} marginBottom step={0.01} fixed={2} bind:value={DBState.db.seperateParameters[param].repetition_penalty} disableable/>
                <span class="text-textcolor">Min P</span>
                <SliderInput min={0} max={1} marginBottom step={0.01} fixed={2} bind:value={DBState.db.seperateParameters[param].min_p} disableable/>
                <span class="text-textcolor">Top A</span>
                <SliderInput min={0} max={1} marginBottom step={0.01} fixed={2} bind:value={DBState.db.seperateParameters[param].top_a} disableable/>
                <span class="text-textcolor">Top P</span>
                <SliderInput min={0} max={1} marginBottom step={0.01} fixed={2} bind:value={DBState.db.seperateParameters[param].top_p} disableable/>
                <span class="text-textcolor">{language.frequencyPenalty}</span>
                <SliderInput min={0} max={200} marginBottom step={0.01} fixed={2} bind:value={DBState.db.seperateParameters[param].frequency_penalty} disableable/>
                <span class="text-textcolor">{language.presensePenalty}</span>
                <SliderInput min={0} max={200} marginBottom step={0.01} fixed={2} bind:value={DBState.db.seperateParameters[param].presence_penalty} disableable/>
                <span class="text-textcolor">{language.thinkingTokens}</span>
                <SliderInput min={0} max={64000} marginBottom step={200} fixed={0} bind:value={DBState.db.seperateParameters[param].thinking_tokens} disableable/>
                <span class="text-textcolor">{language.verbosity ?? 'Verbosity'}</span>
                <SliderInput min={0} max={2} marginBottom step={1} fixed={0} bind:value={DBState.db.seperateParameters[param].verbosity} disableable/>
            </Arcodion>
        {/each}
    {/if}
</Arcodion>
