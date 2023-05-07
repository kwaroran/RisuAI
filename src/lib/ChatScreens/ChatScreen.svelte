<script lang="ts">
    import { getCustomBackground, getEmotion } from "../../ts/util";
    import { DataBase } from "../../ts/database";
    import { CharEmotion, SizeStore, selectedCharID, sideBarStore } from "../../ts/stores";
    import ResizeBox from './ResizeBox.svelte'
    import DefaultChatScreen from "./DefaultChatScreen.svelte";
    import defaultWallpaper from '../../etc/bg.jpg'
    import ChatList from "../Others/ChatList.svelte";
    import TransitionImage from "./TransitionImage.svelte";
    let openChatList = false

    const wallPaper = `background: url(${defaultWallpaper})`
    let bgImg= ''
    let lastBg = ''

    $: (async () =>{
        if($DataBase.customBackground !== lastBg){
            lastBg = $DataBase.customBackground
            bgImg = await getCustomBackground($DataBase.customBackground)
        }
    })()
</script>
{#if $DataBase.theme === ''}
    <div class="flex-grow h-full" style={bgImg}>
        {#if $selectedCharID >= 0}
            {#if $DataBase.characters[$selectedCharID].viewScreen !== 'none'}
                <ResizeBox />
            {/if}
        {/if}
        <DefaultChatScreen customStyle={bgImg.length > 2 ? 'background: rgba(0,0,0,0.8)': ''} bind:openChatList/>
    </div>
{:else if $DataBase.theme === 'waifu'}
    <div class="flex-grow h-full flex justify-center" style="max-width:calc({$sideBarStore ? $SizeStore.w - 400 : $SizeStore.w}px);{bgImg.length < 4 ? wallPaper : bgImg}">
        {#if $selectedCharID >= 0}
            {#if $DataBase.characters[$selectedCharID].viewScreen !== 'none'}
                <div class="h-full mr-10 flex justify-end halfw" style:width="{42 * ($DataBase.waifuWidth2 / 100)}rem">
                    <TransitionImage classType="waifu" src={getEmotion($DataBase, $CharEmotion, 'plain')}/>
                </div>
            {/if}
        {/if}
        <div class="h-full w-2xl" style:width="{42 * ($DataBase.waifuWidth / 100)}rem" class:halfwp={$selectedCharID >= 0 && $DataBase.characters[$selectedCharID].viewScreen !== 'none'}>
            <DefaultChatScreen customStyle={'background: rgba(0,0,0,0.8);backdrop-filter: blur(4px);'} bind:openChatList/>
        </div>
    </div>
{:else if $DataBase.theme === 'waifuMobile'}
    <div class="flex-grow h-full relative" style={bgImg.length < 4 ? wallPaper : bgImg}>
        <div class="w-full h-1/3 absolute z-10 bottom-0 left-0">
            <DefaultChatScreen customStyle={'background: rgba(0,0,0,0.8);backdrop-filter: blur(4px);'} bind:openChatList/>
        </div>
        {#if $selectedCharID >= 0}
            {#if $DataBase.characters[$selectedCharID].viewScreen !== 'none'}
                <div class="h-full w-full absolute bottom-0 left-0 max-w-full">
                    <TransitionImage classType="mobile" src={getEmotion($DataBase, $CharEmotion, 'plain')}/>
                </div>
            {/if}
        {/if}
    </div>
{/if}
{#if openChatList}
    <ChatList close={() => {openChatList = false}}/>
{/if}

<style>
    .halfw{
        max-width: calc(50% - 5rem);
    }
    .halfwp{
        max-width: calc(50% - 5rem);
    }
</style>