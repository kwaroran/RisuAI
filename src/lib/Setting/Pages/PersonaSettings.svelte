<script lang="ts">
    import { language } from "src/lang";
  import BaseRoundedButton from "src/lib/UI/BaseRoundedButton.svelte";
  import TextAreaInput from "src/lib/UI/GUI/TextAreaInput.svelte";
  import TextInput from "src/lib/UI/GUI/TextInput.svelte";
  import { alertConfirm, alertError } from "src/ts/alert";
    import { changeUserPersona, getCharImage, saveUserPersona, selectUserImg } from "src/ts/characters";
    import { DataBase, setDatabase } from "src/ts/storage/database";
  import { get } from "svelte/store";

</script>
<h2 class="mb-2 text-2xl font-bold mt-2">{language.persona}</h2>

<div class="p-4 rounded-md bg-darkbg flex-wrap flex gap-2">
    {#each $DataBase.personas as persona, i}
        <button on:click={() => {
            changeUserPersona(i)
        }}>
            {#if persona.icon === ''}
                <div class="rounded-md h-20 w-20 shadow-lg bg-textcolor2 cursor-pointer hover:text-green-500" class:ring={i === $DataBase.selectedPersona} />
            {:else}
                {#await getCharImage(persona.icon, 'css')}
                    <div class="rounded-md h-20 w-20 shadow-lg bg-textcolor2 cursor-pointer hover:text-green-500" class:ring={i === $DataBase.selectedPersona}/>
                {:then im} 
                    <div class="rounded-md h-20 w-20 shadow-lg bg-textcolor2 cursor-pointer hover:text-green-500" style={im} class:ring={i === $DataBase.selectedPersona} />                
                {/await}
            {/if}
        </button>
    {/each}
    <div class="flex justify-center items-center ml-2 mr-2">
        <BaseRoundedButton
            onClick={() => {
                let db = get(DataBase)
                db.personas.push({
                    name: 'New Persona',
                    icon: '',
                    personaPrompt: ''
                })
                setDatabase(db)
                changeUserPersona(db.personas.length - 1)
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


<div class="mt-4 mb-4 border-y-1 border-y-selected">
</div>

<div class="flex w-full items-starts rounded-md bg-darkbg p-4">
    <div class="flex flex-col mt-4">
        <button on:click={() => {selectUserImg()}}>
            {#if $DataBase.userIcon === ''}
                <div class="rounded-md h-28 w-28 shadow-lg bg-textcolor2 cursor-pointer hover:text-green-500" />
            {:else}
                {#await getCharImage($DataBase.userIcon, 'css')}
                    <div class="rounded-md h-28 w-28 shadow-lg bg-textcolor2 cursor-pointer hover:text-green-500" />
                {:then im} 
                    <div class="rounded-md h-28 w-28 shadow-lg bg-textcolor2 cursor-pointer hover:text-green-500" style={im} />                
                {/await}
            {/if}
        </button>
    </div>
    <div class="flex flex-grow flex-col p-2 ml-4">
        <span class="text-sm text-textcolor2">{language.name}</span>
        <TextInput marginBottom size="lg" placeholder="User" bind:value={$DataBase.username} />
        <span class="text-sm text-textcolor2">{language.description}</span>
        <TextAreaInput height="32" autocomplete="off" bind:value={$DataBase.personaPrompt} placeholder={`Put the description of this persona here.\nExample: [<user> is a 20 year old girl.]`} />
        <div>
            <button class="float-right rounded-md border border-red-700 p-2 hover:bg-red-700 transition-colors mt-4 text-sm" on:click={async () => {
                if($DataBase.personas.length === 1){
                    return
                }
                const d = await alertConfirm(`${language.removeConfirm}${$DataBase.personas[$DataBase.selectedPersona].name}`)
                if(d){
                    saveUserPersona()
                    let personas = $DataBase.personas
                    personas.splice($DataBase.selectedPersona, 1)
                    $DataBase.personas = personas
                    changeUserPersona(0, 'noSave')
                }
            }}>
                {language.remove}
            </button>
        </div>
    </div>
</div>