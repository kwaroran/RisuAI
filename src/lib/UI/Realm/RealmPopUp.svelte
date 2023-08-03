<script lang="ts">
    import { BookIcon, FlagIcon, ImageIcon, PaperclipIcon, SmileIcon, TrashIcon } from "lucide-svelte";
    import { language } from "src/lang";
    import { alertConfirm, alertInput, alertNormal } from "src/ts/alert";
    import { hubURL, type hubType, downloadRisuHub } from "src/ts/characterCards";
    import { parseMarkdownSafe } from "src/ts/parser";
    import { DataBase } from "src/ts/storage/database";
    import RealmLicense from "./RealmLicense.svelte";
  import { characterFormatUpdate } from "src/ts/characters";

    export let openedData:hubType

</script>


<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="top-0 left-0 z-50 fixed w-full h-full bg-black bg-opacity-50 flex justify-center items-center text-textcolor" on:click={() => {
    openedData = null
}}>
    <div class="p-6 max-w-full bg-darkbg rounded-md flex flex-col gap-4 w-2xl overflow-y-auto">
        <div class="w-full flex flex-col">
            <h1 class="text-2xl font-bold max-w-full overflow-hidden whitespace-nowrap text-ellipsis">{openedData.name}</h1>
            {#if openedData.authorname}
                <span class="text-borderc">Made by {openedData.authorname}</span>
            {/if}
            <div class="flex justify-start gap-4 mt-4">
                <img class="h-36 w-36 rounded-md object-top object-cover" alt={openedData.name} src={`${hubURL}/resource/` + openedData.img}>
                <span class="text-textcolor2 break-words text-base chattext prose prose-invert">
                    {@html parseMarkdownSafe(openedData.desc)}
                </span>
            </div>
            <RealmLicense license={openedData.license}/>

            <div class="flex justify-start gap-2  mt-2">
                {#each openedData.tags as tag, i}
                    <div class="text-xs p-1 text-blue-400">{tag}</div>
                {/each}
            </div>
            <div class="flex flex-wrap w-full flex-row gap-1 mt-2">
                <span class="text-textcolor2">
                    {language.popularityLevel.replace('{}', openedData.download.toString())}
                </span>
                <div class="border-l-selected border-l ml-1 mr-1"></div>
                {#if openedData.hasEmotion}
                    <button class="text-textcolor2 hover:text-green-500 transition-colors" on:click|stopPropagation={() => {alertNormal("This character includes emotion images")}}><SmileIcon /></button>
                {/if}
                {#if openedData.hasAsset}
                    <button class="text-textcolor2 hover:text-green-500 transition-colors" on:click|stopPropagation={() => {alertNormal("This character includes additional Assets")}}><ImageIcon /></button>
                {/if}
                {#if openedData.hasLore}
                    <button class="text-textcolor2 hover:text-green-500 transition-colors" on:click|stopPropagation={() => {alertNormal("This character includes lorebook")}}><BookIcon /></button>
                {/if}
            </div>

        </div>
        <div class="flex flex-row-reverse gap-2">
            <button class="text-textcolor2 hover:text-red-500" on:click|stopPropagation={async () => {
                const conf = await alertConfirm('Report this character?')
                if(conf){
                    const report = await alertInput('Write a report text that would be sent to the admin')
                    const da = await fetch(hubURL + '/hub/report', {
                        method: "POST",
                        body: JSON.stringify({
                            id: openedData.id,
                            report: report
                        })
                    })
                    alertNormal(await da.text())
                }
            }}>
                <FlagIcon />
            </button>
            {#if ($DataBase.account?.token?.split('-') ?? [])[1] === openedData.creator}
                <button class="text-textcolor2 hover:text-red-500" on:click|stopPropagation={async () => {
                    const conf = await alertConfirm('Do you want to remove this character from Realm?')
                    if(conf){
                        const da = await fetch(hubURL + '/hub/remove', {
                            method: "POST",
                            body: JSON.stringify({
                                id: openedData.id,
                                token: $DataBase.account?.token
                            })
                        })
                        alertNormal(await da.text())
                    }
                }}>
                    <TrashIcon />
                </button>
            {/if}
            <button class="text-textcolor2 hover:text-green-500" on:click|stopPropagation={async () => {
                await navigator.clipboard.writeText(`https://risuai.xyz/?realm=${openedData.id}`)
                alertNormal("Copied to clipboard")
            }}>
                <PaperclipIcon />
            </button>
            <button class="bg-selected hover:ring flex-grow p-2 font-bold rounded-md mr-2" on:click={() => {
                downloadRisuHub(openedData.id)
                openedData = null
            }}>
                Download
            </button>
            
        </div>
    </div>
</div>