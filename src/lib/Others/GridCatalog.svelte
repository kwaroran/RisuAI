<script lang="ts">
    import { characterFormatUpdate, getCharImage } from "../../ts/characters";
    import { DataBase } from "../../ts/storage/database";
    import BarIcon from "../SideBars/BarIcon.svelte";
    import { User, Users } from "lucide-svelte";
    import { selectedCharID } from "../../ts/stores";
  import TextInput from "../UI/GUI/TextInput.svelte";
    export let endGrid = () => {}
    let search = ''

    function changeChar(index = -1){
        characterFormatUpdate(index)
        selectedCharID.set(index)
        endGrid()
    }

    function formatChars(search:string){
        let charas:{
            image:string
            index:number
            type:string
        }[] = []

        for(let i=0;i<$DataBase.characters.length;i++){
            const c = $DataBase.characters[i]
            if(c.name.replace(/ /g,"").toLocaleLowerCase().includes(search.toLocaleLowerCase().replace(/ /g,""))){
                charas.push({
                    image: c.image,
                    index: i,
                    type: c.type
                })
            }
        }
        return charas
        
    }
</script>

<div class="h-full w-full flex justify-center">
    <div class="h-full p-2 bg-darkbg max-w-full w-2xl flex items-center flex-col ">
        <h1 class="text-textcolor text-2xl font-bold mt-2">Catalog</h1>
        <TextInput placeholder="Search" bind:value={search} size="lg" autocomplete="off" marginBottom={true}/>
        <div class="w-full flex justify-center">
            <div class="flex flex-wrap gap-2 mx-auto container">
                {#each formatChars(search) as char}
                    <div class="flex items-center text-textcolor">
                        {#if char.image}
                            <BarIcon onClick={() => {changeChar(char.index)}} additionalStyle={getCharImage(char.image, 'css')}></BarIcon>
                        {:else}
                            <BarIcon onClick={() => {changeChar(char.index)}} additionalStyle={char.index === $selectedCharID ? 'background:var(--risu-theme-selected)' : ''}>
                                {#if char.type === 'group'}
                                    <Users />
                                {:else}
                                    <User/>
                                {/if}
                            </BarIcon>
                        {/if}
                    </div>
                {/each}
            </div>
        </div>
    </div>
</div>

<style>
    @media (max-width: 640px) {
        .container {
            justify-content: center;
            width: fit-content;
        }
    }
</style>