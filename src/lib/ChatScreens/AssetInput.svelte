<script lang="ts">
	import { get } from 'svelte/store';
    import { FileAudioIcon, PlusIcon } from "lucide-svelte";
    import { DataBase, setDatabase, type character, type groupChat } from "src/ts/storage/database";
    import { getFileSrc, saveAsset } from "src/ts/storage/globalApi";
    import { selectMultipleFile } from "src/ts/util";
    export let currentCharacter:character|groupChat;
    export let onSelect:(additionalAsset:[string,string,string])=>void;
    let assetFileExtensions:string[] = []
    let assetFilePath:string[] = []

    $:{
        if(currentCharacter.type ==='character'){
            if(currentCharacter.additionalAssets){
                for(let i = 0; i < currentCharacter.additionalAssets.length; i++){
                    // console.log('check content type ...', currentCharacter.additionalAssets[i][0], currentCharacter.additionalAssets[i][1]);
                    if(currentCharacter.additionalAssets[i].length > 2 && currentCharacter.additionalAssets[i][2]) {
                        assetFileExtensions[i] = currentCharacter.additionalAssets[i][2]
                    } else {
                        assetFileExtensions[i] = currentCharacter.additionalAssets[i][1].split('.').pop()
                    }
                    getFileSrc(currentCharacter.additionalAssets[i][1]).then((filePath) => {
                        assetFilePath[i] = filePath
                    })
                }
            }
        }
    }
</script>
{#if currentCharacter.type ==='character'}
    <button class="hover:text-green-500 bg-textcolor2 flex justify-center items-center w-16 h-16 m-1 rounded-md" on:click={async () => {
        if(currentCharacter.type === 'character'){
            const da = await selectMultipleFile(['png', 'webp', 'mp4', 'mp3', 'gif'])
            currentCharacter.additionalAssets = currentCharacter.additionalAssets ?? []
            if(!da){
                return
            }
            for(const f of da){
                console.log(f)
                const img = f.data
                const name = f.name
                const extension = name.split('.').pop().toLowerCase()
                const imgp = await saveAsset(img,'',extension)
                currentCharacter.additionalAssets.push([name, imgp, extension])
                currentCharacter = currentCharacter
            }
            const db = get(DataBase);
            setDatabase(db)
        }
    }}>
        <PlusIcon />
    </button>
    {#if currentCharacter.additionalAssets}
        {#each currentCharacter.additionalAssets as additionalAsset, i}
                <button on:click={()=>{
                    onSelect(additionalAsset)
                }}>
                    {#if assetFilePath[i]}
                        {#if assetFileExtensions[i] === 'mp4'}
                            <!-- svelte-ignore a11y-media-has-caption -->
                            <video class="w-16 h-16 m-1 rounded-md"><source src={assetFilePath[i]} type="video/mp4"></video>
                        {:else if assetFileExtensions[i] === 'mp3'}
                            <div class='w-16 h-16 m-1 rounded-md bg-slate-500 flex flex-col justify-center items-center'>
                                <FileAudioIcon/>
                                <div class='w-16 px-1 text-ellipsis whitespace-nowrap overflow-hidden'>{additionalAsset[0]}</div>
                            </div>
                            <!-- <audio controls class="w-16 h-16 m-1 rounded-md"><source src={assetPath} type="audio/mpeg"></audio> -->
                        {:else}
                        <img src={assetFilePath[i]} class="w-16 h-16 m-1 rounded-md" alt={additionalAsset[0]}/>
                        {/if}
                    {/if}
                </button>
        {/each}
    {/if}
{/if}