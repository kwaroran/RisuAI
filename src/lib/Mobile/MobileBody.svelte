<script lang="ts">
    import { CurrentCharacter, MobileGUIStack, MobileSideBar, selectedCharID } from "src/ts/stores";
    import Settings from "../Setting/Settings.svelte";
    import RealmMain from "../UI/Realm/RealmMain.svelte";
    import MobileCharacters from "./MobileCharacters.svelte";
    import ChatScreen from "../ChatScreens/ChatScreen.svelte";
    import CharConfig from "../SideBars/CharConfig.svelte";
    import { WrenchIcon } from "lucide-svelte";
    import { language } from "src/lang";
  import SideChatList from "../SideBars/SideChatList.svelte";
  import DevTool from "../SideBars/DevTool.svelte";
    let sbt = 0
</script>

{#if $MobileSideBar}
<div class="w-full px-2 py-1 text-textcolor2 border-b border-b-darkborderc bg-darkbg flex justify-start items-center gap-2">
    <button class="flex-1 border-r border-r-darkborderc" class:text-textcolor={sbt === 0} on:click={() => {
        sbt = 0
    }}>
        {language.Chat}
    </button>
    <button class="flex-1 border-r border-r-darkborderc" class:text-textcolor={sbt === 1} on:click={() => {
        sbt = 1
    }}>
        {language.character}
    </button>
    <button class:text-textcolor={sbt === 2} on:click={() => {
        sbt = 2
    }}>
        <WrenchIcon size={18} />
    </button>
</div>
{/if}
<div class="w-full flex-1 overflow-y-auto">
    {#if $MobileSideBar}
        <div class="w-full flex flex-col p-2 mt-2 h-full">
            {#if sbt === 0}
                <SideChatList bind:chara={$CurrentCharacter} />
            {:else if sbt === 1}
                <CharConfig />
            {:else if sbt === 2}
                <DevTool />
            {/if}
        </div>
    {:else if $selectedCharID !== -1}
        <ChatScreen />
    {:else if $MobileGUIStack === 0}
        <RealmMain />
    {:else if $MobileGUIStack === 1}
        <MobileCharacters />
    {:else if $MobileGUIStack === 3}
        <Settings />
    {/if}
</div>