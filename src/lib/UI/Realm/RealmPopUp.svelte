<script lang="ts">
    import { BookIcon, FlagIcon, ImageIcon, PaperclipIcon, SmileIcon, TrashIcon } from "@lucide/svelte";
    import { language } from "src/lang";
    import { alertConfirm, alertInput, alertNormal } from "src/ts/alert";
    import { hubURL, type hubType, downloadRisuHub, getRealmInfo } from "src/ts/characterCards";
    
    import { DBState } from 'src/ts/stores.svelte';
    import RealmLicense from "./RealmLicense.svelte";
    import MultiLangDisplay from "../GUI/MultiLangDisplay.svelte";
    import { tooltip } from "src/ts/gui/tooltip";

    interface Props {
        openedData: hubType;
    }

    let { openedData = $bindable() }: Props = $props();

</script>


<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="top-0 left-0 z-50 fixed w-full h-full bg-black/50 flex justify-center items-center text-textcolor" role="button" tabindex="0" onclick={() => {
    openedData = null
}}>
    <div class="p-6 max-w-full bg-darkbg rounded-md flex flex-col gap-4 w-2xl overflow-y-auto max-h-full">
        <div class="w-full flex flex-col">
            <h1 class="text-2xl font-bold max-w-full overflow-hidden whitespace-nowrap text-ellipsis">{openedData.name}</h1>
            {#if openedData.authorname}
                <span class="text-borderc">Made by {openedData.authorname}</span>
            {/if}
            {#if openedData.original}
                <button class="text-blue-400 text-start" onclick={() => {
                    const original = openedData.original
                    openedData = null
                    getRealmInfo(original)
                }}>Forked</button>
            {/if}
            <div class="flex justify-start gap-4 mt-4">
                <img class="h-36 w-36 rounded-md object-top object-cover" alt={openedData.name} src={`${hubURL}/resource/` + openedData.img}>
                <MultiLangDisplay value={openedData.desc} markdown={true} />
            </div>
            <RealmLicense license={openedData.license}/>

            <div class="flex justify-start gap-2  mt-2">
                {#each openedData.tags as tag, i}
                    <div class="text-xs p-1 text-blue-400">{tag}</div>
                {/each}
            </div>
            <div class="flex flex-wrap w-full flex-row gap-1 mt-2">
                <span class="text-textcolor2" use:tooltip={language.popularityLevelDesc}>
                    {language.popularityLevel.replace('{}', openedData.download.toString())}
                </span>
                
                <div class="border-l-selected border-l ml-1 mr-1"></div>
                {#if openedData.hasEmotion}
                    <button class="text-textcolor2 hover:text-green-500 transition-colors" onclick={((e) => {
                        alertNormal("This character includes emotion images")
                    })}><SmileIcon /></button>
                {/if}
                {#if openedData.hasAsset}
                    <button class="text-textcolor2 hover:text-green-500 transition-colors" onclick={((e) => {
                        alertNormal("This character includes additional Assets")
                    })}><ImageIcon /></button>
                {/if}
                {#if openedData.hasLore}
                    <button class="text-textcolor2 hover:text-green-500 transition-colors" onclick={((e) => {
                        alertNormal("This character includes lorebook")
                    })}><BookIcon /></button>
                {/if}
            </div>

        </div>

        <div class="flex flex-row-reverse gap-2">
            <button class="text-textcolor2 hover:text-red-500" onclick={(async (e) => {
                e.stopPropagation()
                const conf = await alertConfirm('Report this character?')
                if(conf){
                    const report = await alertInput('Write a report text that would be sent to the admin (for copywrite issues, use email)')
                    const da = await fetch(hubURL + '/hub/report', {
                        method: "POST",
                        body: JSON.stringify({
                            id: openedData.id,
                            report: report
                        })
                    })
                    alertNormal(await da.text())
                }
            })}>
                <FlagIcon />
            </button>
            {#if (DBState.db.account?.token?.split('-') ?? [])[1] === openedData.creator}
                <button class="text-textcolor2 hover:text-red-500" onclick={(async (e) => {
                    e.stopPropagation()
                    const conf = await alertConfirm('Do you want to remove this character from Realm?')
                    if(conf){
                        const da = await fetch(hubURL + '/hub/remove', {
                            method: "POST",
                            body: JSON.stringify({
                                id: openedData.id,
                                token: DBState.db.account?.token
                            })
                        })
                        alertNormal(await da.text())
                    }
                })}>
                    <TrashIcon />
                </button>
            {/if}
            <button class="text-textcolor2 hover:text-green-500" onclick={(async (e) => {
                e.stopPropagation()
                await navigator.clipboard.writeText(`https://realm.risuai.net/character/${openedData.id}`)
                alertNormal(language.clipboardSuccess)
            })}>
                <PaperclipIcon />
            </button>
            <button class="bg-selected hover:ring-3 grow p-2 font-bold rounded-md mr-2" onclick={() => {
                downloadRisuHub(openedData.id)
                openedData = null
            }}>
                Chat
            </button>
            
        </div>
    </div>
</div>