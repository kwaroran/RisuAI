<script lang="ts">
    import { CharEmotion, SizeStore, selectedCharID, settingsOpen, sideBarStore } from "../../ts/stores";
    import { DataBase } from "../../ts/database";
    import BarIcon from "./BarIcon.svelte";
    import { Plus, User, X, Settings, Users, Edit3Icon, ArrowUp, ArrowDown, ListIcon, LayoutGridIcon, PlusIcon} from 'lucide-svelte'
    import { characterFormatUpdate, createNewCharacter, createNewGroup, getCharImage, importCharacter } from "../../ts/characters";
    import SettingsDom from './Settings.svelte'
    import CharConfig from "./CharConfig.svelte";
    import { language } from "../../lang";
    import Botpreset from "../Others/botpreset.svelte";
    import { onDestroy } from "svelte";
    import {isEqual} from 'lodash'
    let openPresetList =false
    let sideBarMode = 0
    let editMode = false
    let menuMode = 0
    export let openGrid = () => {}


    function createScratch(){
        reseter();
        const cid = createNewCharacter()
        selectedCharID.set(cid)
    }
    function createGroup(){
        reseter();
        const cid = createNewGroup()
        selectedCharID.set(cid)
    }
    async function createImport(){
        reseter();
        const cid = await importCharacter()
        if(cid){
            selectedCharID.set(cid)
        }
    }

    function changeChar(index:number){
        reseter();
        characterFormatUpdate(index)
        selectedCharID.set(index)
    }

    function reseter(){
        menuMode = 0;
        sideBarMode = 0;
        editMode = false
        settingsOpen.set(false)
        CharEmotion.set({})
    }

    let charImages:string[] = []

    const unsub = DataBase.subscribe((db) => {
        let newCharImages:string[] = []
        for(const cha of db.characters){
            newCharImages.push(cha.image ?? '')
        }
        if(!isEqual(charImages, newCharImages)){
            charImages = newCharImages
        }
    })


    onDestroy(unsub)

</script>
<div class="w-20 flex flex-col bg-bgcolor text-white items-center overflow-y-scroll h-full shadow-lg min-w-20 overflow-x-hidden"
    class:editMode={editMode}>
    <button class="bg-gray-500 w-14 min-w-14 flex justify-center h-8 items-center rounded-b-md cursor-pointer hover:bg-green-500 transition-colors absolute top-0" on:click={() => {
        menuMode = 1 - menuMode
    }}><ListIcon/></button>
    <div class="w-14 min-w-14 h-8 min-h-8 bg-transparent"></div>
    {#if menuMode === 0}
    {#each charImages as charimg, i}
        <div class="flex items-center">
            {#if charimg !== ''}
                <BarIcon onClick={() => {changeChar(i)}} additionalStyle={getCharImage($DataBase.characters[i].image, 'css')}>
                </BarIcon>
            {:else}
                <BarIcon onClick={() => {changeChar(i)}} additionalStyle={i === $selectedCharID ? 'background:#44475a' : ''}>

                </BarIcon>
            {/if}
            {#if editMode}
                <div class="flex flex-col mt-2">
                    <button on:click={() => {
                        let chars = $DataBase.characters
                        if(chars[i-1]){
                            const currentchar = chars[i]
                            chars[i] = chars[i-1]
                            chars[i-1] = currentchar
                            $DataBase.characters = chars
                        }
                    }}>
                        <ArrowUp size={20}/>
                    </button>
                    <button on:click={() => {
                        let chars = $DataBase.characters
                        if(chars[i+1]){
                            const currentchar = chars[i]
                            chars[i] = chars[i+1]
                            chars[i+1] = currentchar
                            $DataBase.characters = chars
                        }
                    }}>
                        <ArrowDown size={22}/>
                    </button>
                </div>
            {/if}
        </div>
    {/each}
    <BarIcon onClick={() => {
        if(sideBarMode === 1){
            reseter();
            sideBarMode = 0
        }
        else{
            reseter();
            sideBarMode = 1
        }
    }}><PlusIcon/></BarIcon>
    {:else}
        <BarIcon onClick={() => {
            if($settingsOpen){
                reseter();
                settingsOpen.set(false)
            }
            else{
                reseter();
                settingsOpen.set(true)
            }
        }}><Settings/></BarIcon>
        <BarIcon onClick={() => {
            reseter();
            openGrid()
        }}><LayoutGridIcon/></BarIcon>
    {/if}
</div>
<div class="w-96 p-6 flex flex-col bg-darkbg text-gray-200 overflow-y-auto overflow-x-hidden setting-area" class:flex-grow={($SizeStore.w <= 1000)} class:minw96={($SizeStore.w > 1000)}>
    <button class="flex w-full justify-end text-gray-200" on:click={() => {sideBarStore.set(false)}}>
        <button class="p-0 bg-transparent border-none text-gray-200"><X/></button>
    </button>
    {#if sideBarMode === 0}
        {#if $selectedCharID < 0 || $settingsOpen}
            <SettingsDom bind:openPresetList/>
        {:else}
            <CharConfig />
        {/if}
    {:else if sideBarMode === 1}
        <h2 class="title font-bold text-xl mt-2">Create</h2>
        <button
            on:click={createScratch}
            class="drop-shadow-lg p-5 border-borderc border-solid mt-2 flex justify-center items-center ml-2 mr-2 border-1 hover:bg-selected text-lg">
            {language.createfromScratch}
        </button>
        <button
            on:click={createImport}
            class="drop-shadow-lg p-5 border-borderc border-solid mt-2 flex justify-center items-center ml-2 mr-2 border-1 hover:bg-selected text-lg">
            {language.importCharacter}
        </button>
        <button
            on:click={createGroup}
            class="drop-shadow-lg p-3 border-borderc border-solid mt-2 flex justify-center items-center ml-2 mr-2 border-1 hover:bg-selected">
            {language.createGroup}
        </button>
        <h2 class="title font-bold text-xl mt-4">Edit</h2>
        <button
            on:click={() => {editMode = !editMode;$selectedCharID = -1}}
            class="drop-shadow-lg p-3 border-borderc border-solid mt-2 flex justify-center items-center ml-2 mr-2 border-1 hover:bg-selected">
            {language.editOrder}
        </button>
    {/if}
</div>

<style>
    .minw96 {
        min-width: 24rem; /* 384px */
    }
    .title{
        margin-bottom: 0.5rem;
    }
    .editMode{
        min-width: 6rem;
    }
</style>

{#if openPresetList}
    <Botpreset close={() => {openPresetList = false}}/>
{/if}