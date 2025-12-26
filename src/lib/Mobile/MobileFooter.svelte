<script lang="ts">

  import { SettingsIcon, GlobeIcon, HomeIcon, Volume2Icon, CurlyBraces, ActivityIcon, BookIcon, SmileIcon, UserIcon } from "@lucide/svelte";
  import { language } from "src/lang";
  import { CharConfigSubMenu, MobileGUIStack, MobileSideBar, selectedCharID } from "src/ts/stores.svelte";

</script>
{#if $selectedCharID === -1}

    <div class="w-full p-4 text-lg border-t border-t-darkborderc bg-darkbg flex items-center justify-center text-textcolor2">
        <button class="flex justify-center items-center flex-col gap-2 w-20" class:text-textcolor={$MobileGUIStack === 0} onclick={() => {
            MobileGUIStack.set(0)
        }}>
            <GlobeIcon size={24} />
            <span class="text-xs">RisuRealm</span>
        </button>
        <button class="flex justify-center items-center flex-col gap-2 w-20" class:text-textcolor={$MobileGUIStack === 1} onclick={() => {
            MobileGUIStack.set(1)
        }}>
            <HomeIcon size={24} />
            <span class="text-xs">{language.character}</span>
        </button>
        <button class="flex justify-center items-center flex-col gap-2 w-20" class:text-textcolor={$MobileGUIStack === 2} onclick={() => {
            MobileGUIStack.set(2)
        }}>
            <SettingsIcon size={24} />
            <span class="text-xs">{language.settings}</span>
        </button>
    </div>

{/if}

{#if $selectedCharID !== -1 && $MobileSideBar === 2}
    <div class="w-full p-4 text-lg border-t border-t-darkborderc bg-darkbg flex items-center justify-center text-textcolor2 truncate">
        <button class="flex justify-center items-center flex-col gap-2 w-16 max-w-16" class:text-textcolor={$CharConfigSubMenu === 0} onclick={() => {
            CharConfigSubMenu.set(0)
        }}>
            <UserIcon size={24} />
            <span class="text-xs truncate max-w-16">{language.basicInfo}</span>
        </button>
        <button class="flex justify-center items-center flex-col gap-2 w-16 max-w-16" class:text-textcolor={$CharConfigSubMenu === 1} onclick={() => {
            CharConfigSubMenu.set(1)
        }}>
            <SmileIcon size={24} />
            <span class="text-xs truncate max-w-16">{language.characterDisplay}</span>
        </button>
        <button class="flex justify-center items-center flex-col gap-2 w-16 max-w-16" class:text-textcolor={$CharConfigSubMenu === 3} onclick={() => {
            CharConfigSubMenu.set(3)
        }}>
            <BookIcon size={24} />
            <span class="text-xs truncate max-w-16">{language.loreBook}</span>
        </button>
        <button class="flex justify-center items-center flex-col gap-2 w-16 max-w-16" class:text-textcolor={$CharConfigSubMenu === 5} onclick={() => {
            CharConfigSubMenu.set(5)
        }}>
            <Volume2Icon size={24} />
            <span class="text-xs truncate max-w-16">TTS</span>
        </button>
        <button class="flex justify-center items-center flex-col gap-2 w-16 max-w-16" class:text-textcolor={$CharConfigSubMenu === 4} onclick={() => {
            CharConfigSubMenu.set(4)
        }}>
            <CurlyBraces size={24} />
            <span class="text-xs truncate max-w-16">{language.scripts}</span>
        </button>
        <button class="flex justify-center items-center flex-col gap-2 w-16 max-w-16" class:text-textcolor={$CharConfigSubMenu === 2} onclick={() => {
            CharConfigSubMenu.set(2)
        }}>
            <ActivityIcon size={24} />
            <span class="text-xs truncate max-w-16">{language.advanced}</span>
        </button>
    </div>
{/if}