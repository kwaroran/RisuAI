<script lang="ts">
    import { getCustomBackground, getEmotion } from "../../ts/util";
    
    import { DBState } from 'src/ts/stores.svelte';
    import { CharEmotion, ShowVN, selectedCharID } from "../../ts/stores.svelte";
    import ResizeBox from './ResizeBox.svelte'
    import DefaultChatScreen from "./DefaultChatScreen.svelte";
    import defaultWallpaper from '../../etc/bg.jpg'
    import ChatList from "../Others/ChatList.svelte";
    import TransitionImage from "./TransitionImage.svelte";
    import BackgroundDom from "./BackgroundDom.svelte";
    import SideBarArrow from "../UI/GUI/SideBarArrow.svelte";
    import VisualNovelMain from "../VisualNovel/VisualNovelMain.svelte";
    import ModuleChatMenu from "../Setting/Pages/Module/ModuleChatMenu.svelte";
    let openChatList = $state(false)
    let openModuleList = $state(false)

    const wallPaper = `background: url(${defaultWallpaper})`
    const externalStyles = 
            ("background: " + (DBState.db.textScreenColor ? (DBState.db.textScreenColor + '80') : "rgba(0,0,0,0.8)") + ';\n')
        +   (DBState.db.textBorder ? "text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;" : '')
        +   (DBState.db.textScreenRounded ? "border-radius: 2rem; padding: 1rem;" : '')
        +   (DBState.db.textScreenBorder ? `border: 0.3rem solid ${DBState.db.textScreenBorder};` : '')
    let bgImg= $state('')
    let lastBg = $state('')
    $effect.pre(() => {
        (async () =>{
            if(DBState.db.customBackground !== lastBg){
                lastBg = DBState.db.customBackground
                bgImg = await getCustomBackground(DBState.db.customBackground)
            }
        })()
    });
</script>

{#if $ShowVN}
    <div aria-label="Visual Novel Mode">
        <VisualNovelMain />
    </div>
{:else if DBState.db.theme === 'waifu'}
    <div class="flex-grow h-full flex justify-center relative" style="{bgImg.length < 4 ? wallPaper : bgImg}" aria-label="Waifu Chat Interface">
        <SideBarArrow />
        <BackgroundDom />
        {#if $selectedCharID >= 0}
            {#if DBState.db.characters[$selectedCharID].viewScreen !== 'none'}
                <div class="h-full mr-10 flex justify-end halfw" style:width="{42 * (DBState.db.waifuWidth2 / 100)}rem" aria-label="Character Image Container">
                    <TransitionImage classType="waifu" src={getEmotion(DBState.db, $CharEmotion, 'plain')} ariaLabel={`Character ${DBState.db.characters[$selectedCharID]?.name || 'Unknown'} with ${$CharEmotion} emotion`}/>
                </div>
            {/if}
        {/if}
        <div class="h-full w-2xl" style:width="{42 * (DBState.db.waifuWidth / 100)}rem" class:halfwp={$selectedCharID >= 0 && DBState.db.characters[$selectedCharID].viewScreen !== 'none'} aria-label="Chat Content Area">
            <DefaultChatScreen customStyle={`${externalStyles}backdrop-filter: blur(4px);`} bind:openChatList bind:openModuleList ariaLabel="Chat Messages"/>
        </div>
    </div>
{:else if DBState.db.theme === 'waifuMobile'}
    <div class="flex-grow h-full relative" style={bgImg.length < 4 ? wallPaper : bgImg} aria-label="Mobile Waifu Chat Interface">
        <SideBarArrow />
        <BackgroundDom />
        <div class="w-full absolute z-10 bottom-0 left-0"
            class:per33={$selectedCharID >= 0 && DBState.db.characters[$selectedCharID].viewScreen !== 'none'}
            class:h-full={!($selectedCharID >= 0 && DBState.db.characters[$selectedCharID].viewScreen !== 'none')}
            aria-label="Mobile Chat Content Area"
        >
            <DefaultChatScreen customStyle={`${externalStyles}backdrop-filter: blur(4px);`} bind:openChatList bind:openModuleList ariaLabel="Chat Messages"/>
        </div>
        {#if $selectedCharID >= 0}
            {#if DBState.db.characters[$selectedCharID].viewScreen !== 'none'}
                <div class="h-full w-full absolute bottom-0 left-0 max-w-full" aria-label="Mobile Character Image Container">
                    <TransitionImage classType="mobile" src={getEmotion(DBState.db, $CharEmotion, 'plain')} ariaLabel={`Character ${DBState.db.characters[$selectedCharID]?.name || 'Unknown'} with ${$CharEmotion} emotion`}/>
                </div>
            {/if}
        {/if}
    </div>
{:else}
    <div class="flex-grow h-full min-w-0 relative justify-center flex" aria-label="Classic Chat Interface">
        <SideBarArrow />
        <BackgroundDom />
        <div style={bgImg} class="h-full w-full" class:max-w-6xl={DBState.db.classicMaxWidth} aria-label="Classic Chat Content Container">
            {#if $selectedCharID >= 0}
                {#if DBState.db.characters[$selectedCharID].viewScreen !== 'none' && (DBState.db.characters[$selectedCharID].type === 'group' || (!DBState.db.characters[$selectedCharID].inlayViewScreen))}
                    <ResizeBox ariaLabel="Resize Character View"/>
                {/if}
            {/if}
            <DefaultChatScreen customStyle={bgImg.length > 2 ? `${externalStyles}`: ''} bind:openChatList bind:openModuleList ariaLabel="Chat Messages"/>
        </div>
    </div>
{/if}
{#if openChatList}
    <ChatList close={() => {openChatList = false}} ariaLabel="Chat History List"/>
{:else if openModuleList}
    <ModuleChatMenu close={() => {openModuleList = false}} ariaLabel="Module Settings Menu"/>
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