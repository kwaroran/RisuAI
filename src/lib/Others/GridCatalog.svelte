<script lang="ts">
    import { characterFormatUpdate, getCharImage, removeChar } from "../../ts/characters";
    import { DataBase, type Database } from "../../ts/storage/database";
    import BarIcon from "../SideBars/BarIcon.svelte";
    import { ArrowLeft, User, Users, Inspect, TrashIcon, Undo2Icon } from "lucide-svelte";
    import { selectedCharID } from "../../ts/stores";
    import TextInput from "../UI/GUI/TextInput.svelte";
    import Button from "../UI/GUI/Button.svelte";
    import { language } from "src/lang";
    import { parseMultilangString } from "src/ts/util";
  import { checkCharOrder } from "src/ts/storage/globalApi";
    export let endGrid = () => {}
    let search = ''
    let selected = 0

    function changeChar(index = -1){
        characterFormatUpdate(index)
        selectedCharID.set(index)
        endGrid()
    }

    function formatChars(search:string, db:Database, trash = false){
        let charas:{
            image:string
            index:number
            type:string,
            name:string
            desc:string
        }[] = []

        for(let i=0;i<db.characters.length;i++){
            const c = db.characters[i]
            if(c.trashTime && !trash){
                continue
            }
            if(!c.trashTime && trash){
                continue
            }
            if(c.name.replace(/ /g,"").toLocaleLowerCase().includes(search.toLocaleLowerCase().replace(/ /g,""))){
                charas.push({
                    image: c.image,
                    index: i,
                    type: c.type,
                    name: c.name,
                    desc: c.creatorNotes ?? 'No description'
                })
            }
        }
        return charas
    }
</script>

<div class="h-full w-full flex justify-center">
    <div class="h-full p-6 bg-darkbg max-w-full w-2xl flex flex-col overflow-y-auto">
        <h1 class="text-textcolor text-2xl font-bold mt-2 flex items-center mx-4 mb-2">
            <button class="mr-2 hover:text-textcolor text-textcolor2" on:click={() => {
                endGrid()
            }}><ArrowLeft /></button>
            <span>Catalog</span>
        </h1>
        <div class="mx-4 mb-6 flex flex-col">
            <TextInput placeholder="Search" bind:value={search} size="lg" autocomplete="off"/>
            <div class="flex flex-wrap gap-2 mt-2">
                <Button selected={selected === 0} size="sm" on:click={() => {selected = 0}}>
                    {language.grid}
                </Button>
                <Button selected={selected === 1} size="sm" on:click={() => {selected = 1}}>
                    {language.list}
                </Button>
                <Button selected={selected === 2} size="sm" on:click={() => {selected = 2}}>
                    {language.trash}
                </Button>
            </div>
        </div>
        {#if selected === 0}
            <div class="w-full flex justify-center">
                <div class="flex flex-wrap gap-2 w-full justify-center">
                    {#each formatChars(search, $DataBase) as char}
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
        {:else if selected === 1}
            {#each formatChars(search, $DataBase) as char}
                <div class="flex p-2 border border-darkborderc rounded-md mb-2">
                    <BarIcon onClick={() => {changeChar(char.index)}} additionalStyle={getCharImage(char.image, 'css')}></BarIcon>
                    <div class="flex-1 flex flex-col ml-2">
                        <h4 class="text-textcolor font-bold text-lg mb-1">{char.name || "Unnamed"}</h4>
                        <span class="text-textcolor2">{parseMultilangString(char.desc)['en'] || parseMultilangString(char.desc)['xx'] || 'No description'}</span>
                        <div class="flex gap-2 justify-end">
                            <button class="hover:text-textcolor text-textcolor2" on:click={() => {
                                changeChar(char.index)
                            }}>
                                <Inspect />
                            </button>
                            <button class="hover:text-textcolor text-textcolor2" on:click={() => {
                                removeChar(char.index, char.name)
                            }}>
                                <TrashIcon />
                            </button>
                        </div>
                    </div>
                </div>
            {/each}
        {:else if selected === 2}
            <span class="text-textcolor2 text-sm mb-2">{language.trashDesc}</span>
            {#each formatChars(search, $DataBase, true) as char}
                <div class="flex p-2 border border-darkborderc rounded-md mb-2">
                    <BarIcon onClick={() => {changeChar(char.index)}} additionalStyle={getCharImage(char.image, 'css')}></BarIcon>
                    <div class="flex-1 flex flex-col ml-2">
                        <h4 class="text-textcolor font-bold text-lg mb-1">{char.name || "Unnamed"}</h4>
                        <span class="text-textcolor2">{parseMultilangString(char.desc)['en'] || parseMultilangString(char.desc)['xx'] || 'No description'}</span>
                        <div class="flex gap-2 justify-end">
                            <button class="hover:text-textcolor text-textcolor2" on:click={() => {
                                $DataBase.characters[char.index].trashTime = undefined
                                checkCharOrder()
                            }}>
                                <Undo2Icon />
                            </button>
                            <button class="hover:text-textcolor text-textcolor2" on:click={() => {
                                removeChar(char.index, char.name, 'permanent')
                            }}>
                                <TrashIcon />
                            </button>
                        </div>
                    </div>
                </div>
            {/each}
        {/if}
    </div>
</div>