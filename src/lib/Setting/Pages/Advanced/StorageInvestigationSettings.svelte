<script lang="ts">
    import { Capacitor } from "@capacitor/core";
    import { capStorageInvestigation } from "src/ts/storage/mobileStorage";
    import { language } from "src/lang";
    import Button from "src/lib/UI/GUI/Button.svelte";

    let estaStorage:{
        key:string,
        size:string,
    }[] = $state([])
</script>

{#if Capacitor.isNativePlatform()}
    <Button
        className="mt-4"
        onclick={async () => {
            estaStorage = await capStorageInvestigation()
        }}
    >
        Investigate Storage
    </Button>

    {#if estaStorage.length > 0}
        <div class="mt-4 flex flex-col w-full p-2">
            {#each estaStorage as item}
                <div class="flex p-2 rounded-md items-center justify-between">
                    <span class="text-textcolor">{item.key}</span>
                    <span class="text-textcolor ml-2">{item.size}</span>
                </div>
            {/each}
        </div>
    {/if}
{/if}
