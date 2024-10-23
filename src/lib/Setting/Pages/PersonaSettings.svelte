<script lang="ts">
    import { language } from "src/lang";
    import BaseRoundedButton from "src/lib/UI/BaseRoundedButton.svelte";
    import Button from "src/lib/UI/GUI/Button.svelte";
    import Check from "src/lib/UI/GUI/CheckInput.svelte";
    import TextAreaInput from "src/lib/UI/GUI/TextAreaInput.svelte";
    import TextInput from "src/lib/UI/GUI/TextInput.svelte";
    import { alertConfirm, alertSelect } from "src/ts/alert";
    import { getCharImage } from "src/ts/characters";
    import { changeUserPersona, exportUserPersona, importUserPersona, saveUserPersona, selectUserImg } from "src/ts/persona";
    import { DBState, setDatabase } from "src/ts/storage/database.svelte";
    import { get } from "svelte/store";

</script>
<h2 class="mb-2 text-2xl font-bold mt-2">{language.persona}</h2>

<div class="p-4 rounded-md border-darkborderc border mb-2 flex-wrap flex gap-2">
    {#each DBState.db.personas as persona, i}
        <button onclick={() => {
            changeUserPersona(i)
        }}>
            {#if persona.icon === ''}
                <div class="rounded-md h-20 w-20 shadow-lg bg-textcolor2 cursor-pointer hover:text-green-500" class:ring={i === DBState.db.selectedPersona}></div>
            {:else}
                {#await getCharImage(persona.icon, 'css')}
                    <div class="rounded-md h-20 w-20 shadow-lg bg-textcolor2 cursor-pointer hover:text-green-500" class:ring={i === DBState.db.selectedPersona}></div>
                {:then im} 
                    <div class="rounded-md h-20 w-20 shadow-lg bg-textcolor2 cursor-pointer hover:text-green-500" style={im} class:ring={i === DBState.db.selectedPersona}></div>                
                {/await}
            {/if}
        </button>
    {/each}
    <div class="flex justify-center items-center ml-2 mr-2">
        <BaseRoundedButton
            onClick={async () => {
                const sel = parseInt(await alertSelect([language.createfromScratch, language.importCharacter]))
                if(sel === 1){
                    return
                }
                DBState.db.personas.push({
                    name: 'New Persona',
                    icon: '',
                    personaPrompt: ''
                })
                changeUserPersona(DBState.db.personas.length - 1)
            }}
            ><svg viewBox="0 0 24 24" width="1.2em" height="1.2em"
                ><path
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                /></svg
            >
        </BaseRoundedButton>
    </div>
</div>

<div class="flex w-full items-starts rounded-md border-darkborderc border p-4 max-w-full flex-wrap">
    <div class="flex flex-col mt-4 mr-4">
        <button onclick={() => {selectUserImg()}}>
            {#if DBState.db.userIcon === ''}
                <div class="rounded-md h-28 w-28 shadow-lg bg-textcolor2 cursor-pointer hover:text-green-500"></div>
            {:else}
                {#await getCharImage(DBState.db.userIcon, DBState.db.personas[DBState.db.selectedPersona].largePortrait ? 'lgcss' : 'css')}
                    <div class="rounded-md h-28 w-28 shadow-lg bg-textcolor2 cursor-pointer hover:text-green-500"></div>
                {:then im} 
                    <div class="rounded-md h-28 w-28 shadow-lg bg-textcolor2 cursor-pointer hover:text-green-500" style={im}></div>                
                {/await}
            {/if}
        </button>
    </div>
    <div class="flex flex-grow flex-col p-2 max-w-full">
        <span class="text-sm text-textcolor2">{language.name}</span>
        <TextInput marginBottom size="lg" placeholder="User" bind:value={DBState.db.username}/>
        <span class="text-sm text-textcolor2">{language.description}</span>
        <TextAreaInput autocomplete="off" bind:value={DBState.db.personaPrompt} placeholder={`Put the description of this persona here.\nExample: [<user> is a 20 year old girl.]`} />
        <div class="flex gap-2 mt-4 max-w-full flex-wrap">
            <Button onclick={exportUserPersona}>{language.export}</Button>
            <Button onclick={importUserPersona}>{language.import}</Button>

            <Button styled="danger" onclick={async () => {
                if(DBState.db.personas.length === 1){
                    return
                }
                const d = await alertConfirm(`${language.removeConfirm}${DBState.db.personas[DBState.db.selectedPersona].name}`)
                if(d){
                    saveUserPersona()
                    let personas = DBState.db.personas
                    personas.splice(DBState.db.selectedPersona, 1)
                    DBState.db.personas = personas
                    changeUserPersona(0, 'noSave')
                }
            }}>{language.remove}</Button>
            <Check bind:check={DBState.db.personas[DBState.db.selectedPersona].largePortrait}>{language.largePortrait}</Check>
        </div>
    </div>
</div>