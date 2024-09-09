<script lang="ts">

  import { SettingsIcon, GlobeIcon, HomeIcon, MessageSquare } from "lucide-svelte";
  import { language } from "src/lang";
  import { MobileGUIStack, selectedCharID } from "src/ts/stores";

</script>
{#if $selectedCharID === -1}

    <div class="w-full p-4 text-lg border-t border-t-darkborderc bg-darkbg flex items-center justify-center text-textcolor2">
        <button class="flex justify-center items-center flex-col gap-2 w-20" class:text-textcolor={$MobileGUIStack === 0} on:click={() => {
            MobileGUIStack.set(0)
        }}>
            <GlobeIcon size={24} />
            <span class="text-xs">RisuRealm</span>
        </button>
        <button class="flex justify-center items-center flex-col gap-2 w-20" class:text-textcolor={$MobileGUIStack === 1} on:click={() => {
            MobileGUIStack.set(1)
        }}>
            <HomeIcon size={24} />
            <span class="text-xs">{language.character}</span>
        </button>
        <button class="flex justify-center items-center flex-col gap-2 w-20" class:text-textcolor={$MobileGUIStack === 3} on:click={() => {
            MobileGUIStack.set(3)
        }}>
            <SettingsIcon size={24} />
            <span class="text-xs">{language.settings}</span>
        </button>
    </div>

{/if}