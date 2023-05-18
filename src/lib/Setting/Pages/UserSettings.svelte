<script>
    import { language } from "src/lang";
    import { getCharImage, selectUserImg } from "src/ts/characters";
    import { DataBase } from "src/ts/database";
</script>

<h2 class="mb-2 text-2xl font-bold mt-2">{language.user}</h2>
<span class="text-neutral-200 mt-2 mb-2">{language.userIcon}</span>
<button on:click={() => {selectUserImg()}}>
    {#if $DataBase.userIcon === ''}
        <div class="rounded-md h-32 w-32 shadow-lg bg-gray-500 cursor-pointer hover:text-green-500" />
    {:else}
        {#await getCharImage($DataBase.userIcon, 'css')}
            <div class="rounded-md h-32 w-32 shadow-lg bg-gray-500 cursor-pointer hover:text-green-500" />
        {:then im} 
            <div class="rounded-md h-32 w-32 shadow-lg bg-gray-500 cursor-pointer hover:text-green-500" style={im} />                
        {/await}
    {/if}
</button>
<span class="text-neutral-200 mt-4">{language.username}</span>
<input class="text-neutral-200 mt-2 mb-4 p-2 bg-transparent input-text focus:bg-selected" placeholder="User" bind:value={$DataBase.username}>
