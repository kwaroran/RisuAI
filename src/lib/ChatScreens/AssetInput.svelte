<script lang="ts">
    import { FileMusicIcon, PlusIcon } from "@lucide/svelte";
    import { type character, type groupChat } from "src/ts/storage/database.svelte";
    import { getFileSrc, saveAsset } from "src/ts/globalApi.svelte";
    import { selectMultipleFile } from "src/ts/util";
    interface Props {
        currentCharacter: character|groupChat;
        onSelect: (additionalAsset:[string,string,string])=>void;
    }

    const { currentCharacter, onSelect }: Props = $props();

    let assetFileExtensions:string[] = $state([])
    let assetFilePath:string[] = $state([])

    $effect.pre(() => {
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
    });
</script>
{#if currentCharacter.type ==='character'}
    <button class="hover:text-green-500 bg-textcolor2 flex justify-center items-center w-16 h-16 m-1 rounded-md" onclick={async () => {
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
            }
        }
    }}>
        <PlusIcon />
    </button>
    {#if currentCharacter.additionalAssets}
        {#each currentCharacter.additionalAssets as additionalAsset, i}
                <button onclick={()=>{
                    onSelect(additionalAsset)
                }}>
                    {#if assetFilePath[i]}
                        {#if assetFileExtensions[i] === 'mp4'}
                            <!-- svelte-ignore a11y_media_has_caption -->
                            <video class="w-16 h-16 m-1 rounded-md"><source src={assetFilePath[i]} type="video/mp4"></video>
                        {:else if assetFileExtensions[i] === 'mp3'}
                            <div class='w-16 h-16 m-1 rounded-md bg-slate-500 flex flex-col justify-center items-center'>
                                <FileMusicIcon/>
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