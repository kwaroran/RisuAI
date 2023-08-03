<!-- svelte-ignore a11y-click-events-have-key-events -->
<div  class="fixed top-0 left-0 h-full w-full bg-black bg-opacity-50 flex flex-col z-50 items-center justify-center" on:click={close}>
    <div class="bg-darkbg rounded-md p-4 max-w-full flex flex-col w-2xl" on:click|stopPropagation>
        
        {#if !$DataBase.account}
            <span class="font-bold text-2xl w-full">You must login to Risu Account upload to RisuRealm</span>
            <span class="text-textcolor2">You can login in app settings 🡲 account</span>
            <button on:click={async () => {
                close()
            }} class="text-textcolor mt-2 text-lg bg-transparent border-solid border-1 border-borderc p-4 hover:bg-green-800 transition-colors cursor-pointer">OK</button>
            
        {:else}
        <h1 class="font-bold text-2xl w-full">
            <span>
                Share {char.name} to {language.hub}
            </span>
            <button class="float-right text-textcolor2 hover:text-green-500" on:click={close}>
                <XIcon />
            </button>
        </h1>
        <div class="mb-2 mt-2 w-full border-t-2 border-t-bgcolor"></div>
        <span class="text-textcolor">{language.creatorNotes}</span>
        <span class="text-textcolor2 text-sm">A description that displays when you search and when you first open a bot.</span>
        <span class="text-textcolor2 text-sm">More than 20 characters.</span>
        <TextAreaInput autocomplete="off" bind:value={char.creatorNotes} height={"20"} />
        <span class="text-textcolor">{language.tags}</span>
        <span class="text-textcolor2 text-sm">Tags to search your character easily. latin alphabets only. seperate by comma.</span>
        <TextInput placeholder="" bind:value={tags} on:input={() => {
            tags = tags.replace(/[^a-zA-Z,]/g, '').toLocaleLowerCase()
        }} />

        {#if char.license !== 'CC BY-NC-SA 4.0' && char.license !== 'CC BY-SA 4.0'}

        <span class="text-textcolor mt-4">License</span>
        <span class="text-textcolor2 text-sm">You can choose license for the downloaders to limit the usages of your card's prompt.</span>
        <SelectInput bind:value={license}>
            <OptionInput value="">None</OptionInput>
            {#each Object.keys(CCLicenseData) as ccl}
                <OptionInput value={ccl}>{CCLicenseData[ccl][2]} ({CCLicenseData[ccl][1]})</OptionInput>
            {/each}
        </SelectInput>

        {/if}
        <div class="flex items-center flex-wrap mt-4">
            <button class="bg-bgcolor p-2 rounded-lg" class:ring-1={!privateMode} on:click={() => {privateMode = false}}>🌏 Show Author ID</button>
            <button class="bg-bgcolor p-2 rounded-lg ml-2" class:ring-1={privateMode} on:click={() => {privateMode = true}}>🔒 Anonymized</button>
        </div>
        <div class="flex items-center flex-wrap mt-2">
            <button class="bg-bgcolor p-2 rounded-lg" class:ring-1={!nsfwMode} on:click={() => {nsfwMode = false}}>🎖️ Safe</button>
            <button class="bg-bgcolor p-2 rounded-lg ml-2" class:ring-1={nsfwMode} on:click={() => {nsfwMode = true}}>🔞 NSFW</button>
        </div>
        {#if nsfwMode}
            <span class="text-textcolor2 text-sm">Grotesque Contents and non-adult characters with NSFW would be banned.</span>
        {/if}
        <Button on:click={async () => {
            if(char.creatorNotes.length < 20){
                alertError("Creator Notes must be longer than 20 characters")
            }
            else{
                shareRisuHub(char, {
                    anon: privateMode,
                    nsfw: nsfwMode,
                    tag: tags,
                    license: license
                })
                close()
            }
        }} className="mt-2" size="lg">{language.shareCloud}</Button>
        {/if}

    </div>
</div>


<script lang="ts">
    import { XIcon } from "lucide-svelte";
    import { language } from "src/lang";
    import { alertError } from "src/ts/alert";
    import { shareRisuHub } from "src/ts/characterCards";
    import { DataBase, type character } from "src/ts/storage/database";
    import TextInput from "../GUI/TextInput.svelte";
    import TextAreaInput from "../GUI/TextAreaInput.svelte";
    import Button from "../GUI/Button.svelte";
    import SelectInput from "../GUI/SelectInput.svelte";
    import { CCLicenseData } from "src/ts/creation/license";
    import OptionInput from "../GUI/OptionInput.svelte";
    export let close = () => {}
    export let char:character
    let tags=""
    let privateMode = false
    let nsfwMode = false
    let license = ""

</script>