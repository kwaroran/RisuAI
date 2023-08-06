<script lang="ts">
    import { getCustomBackground, getEmotion } from "../../ts/util";
    import { DataBase } from "../../ts/storage/database";
    import { CharEmotion, CurrentCharacter, selectedCharID } from "../../ts/stores";
    import ResizeBox from './ResizeBox.svelte'
    import DefaultChatScreen from "./DefaultChatScreen.svelte";
    import defaultWallpaper from '../../etc/bg.jpg'
    import ChatList from "../Others/ChatList.svelte";
    import TransitionImage from "./TransitionImage.svelte";
  import BackgroundDom from "./BackgroundDom.svelte";
  import SideBarArrow from "../UI/GUI/SideBarArrow.svelte";
    let openChatList = false

    const wallPaper = `background: url(${defaultWallpaper})`
    const externalStyles = 
            ("background: " + ($DataBase.textScreenColor ? ($DataBase.textScreenColor + '80') : "rgba(0,0,0,0.8)") + ';\n')
        +   ($DataBase.textBorder ? "text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;" : '')
        +   ($DataBase.textScreenRounded ? "border-radius: 2rem; padding: 1rem;" : '')
        +   ($DataBase.textScreenBorder ? `border: 0.3rem solid ${$DataBase.textScreenBorder};` : '')
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
    <div class="flex-grow h-full min-w-0 relative justify-center flex">
        <SideBarArrow />
        <BackgroundDom />
        <div style={bgImg} class="h-full w-full" class:max-w-6xl={$DataBase.classicMaxWidth}>
            {#if $selectedCharID >= 0}
                {#if $CurrentCharacter.viewScreen !== 'none'}
                    <ResizeBox />
                {/if}
            {/if}
            <DefaultChatScreen customStyle={bgImg.length > 2 ? `${externalStyles}`: ''} bind:openChatList/>
        </div>
    </div>
{:else if $DataBase.theme === 'waifu'}
    <div class="flex-grow h-full flex justify-center relative" style="{bgImg.length < 4 ? wallPaper : bgImg}">
        <SideBarArrow />
        <BackgroundDom />
        {#if $selectedCharID >= 0}
            {#if $CurrentCharacter.viewScreen !== 'none'}
                <div class="h-full mr-10 flex justify-end halfw" style:width="{42 * ($DataBase.waifuWidth2 / 100)}rem">
                    <TransitionImage classType="waifu" src={getEmotion($DataBase, $CharEmotion, 'plain')}/>
                </div>
            {/if}
        {/if}
        <div class="h-full w-2xl" style:width="{42 * ($DataBase.waifuWidth / 100)}rem" class:halfwp={$selectedCharID >= 0 && $CurrentCharacter.viewScreen !== 'none'}>
            <DefaultChatScreen customStyle={`${externalStyles}backdrop-filter: blur(4px);`} bind:openChatList/>
        </div>
    </div>
{:else if $DataBase.theme === 'waifuMobile'}
    <div class="flex-grow h-full relative" style={bgImg.length < 4 ? wallPaper : bgImg}>
        <SideBarArrow />
        <BackgroundDom />
        <div class="w-full absolute z-10 bottom-0 left-0"
            class:per33={$selectedCharID >= 0 && $CurrentCharacter.viewScreen !== 'none'}
            class:h-full={!($selectedCharID >= 0 && $CurrentCharacter.viewScreen !== 'none')}
        >
            <DefaultChatScreen customStyle={`${externalStyles}backdrop-filter: blur(4px);`} bind:openChatList/>
        </div>
        {#if $selectedCharID >= 0}
            {#if $CurrentCharacter.viewScreen !== 'none'}
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
    .per33{
        height: 33.333333%;
    }
</style>