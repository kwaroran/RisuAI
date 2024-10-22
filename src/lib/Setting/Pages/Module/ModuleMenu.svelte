<script type="ts" lang="ts">
    import { language } from "src/lang";
    import TextInput from "src/lib/UI/GUI/TextInput.svelte";
    import LoreBookData from "src/lib/SideBars/LoreBook/LoreBookData.svelte";
    import type { RisuModule } from "src/ts/process/modules";
    import { DownloadIcon, FolderUpIcon, PlusIcon, TrashIcon } from "lucide-svelte";
    import { alertConfirm } from "src/ts/alert";
    import RegexList from "src/lib/SideBars/Scripts/RegexList.svelte";
    import TriggerList from "src/lib/SideBars/Scripts/TriggerList.svelte";
    import Check from "src/lib/UI/GUI/CheckInput.svelte";
    import Help from "src/lib/Others/Help.svelte";
    import TextAreaInput from "src/lib/UI/GUI/TextAreaInput.svelte";
    import Button from "src/lib/UI/GUI/Button.svelte";
    import { getFileSrc, openURL, saveAsset } from "src/ts/storage/globalApi";
    import { hubURL } from "src/ts/characterCards";
    import { exportRegex, importRegex } from "src/ts/process/scripts";
    import { selectMultipleFile } from "src/ts/util";
    import { DataBase } from 'src/ts/storage/database';

    let submenu = 0
    export let currentModule:RisuModule
    let assetFileExtensions:string[] = []
    let assetFilePath:string[] = []

    $: {
        if($DataBase.useAdditionalAssetsPreview){
            if(currentModule?.assets){
                for(let i = 0; i < currentModule.assets.length; i++){
                    if(currentModule.assets[i].length > 2 && currentModule.assets[i][2]) {
                        assetFileExtensions[i] = currentModule.assets[i][2]
                    } else 
                        assetFileExtensions[i] = currentModule.assets[i][1].split('.').pop()
                        getFileSrc(currentModule.assets[i][1]).then((filePath) => {
                        assetFilePath[i] = filePath
                    })
                }
            }
        }
    }

    function addLorebook(){
        if(Array.isArray(currentModule.lorebook)){
            currentModule.lorebook.push({
                key: '',
                comment: `New Lore`,
                content: '',
                mode: 'normal',
                insertorder: 100,
                alwaysActive: false,
                secondkey: "",
                selective: false
            })

            currentModule.lorebook = currentModule.lorebook
        }
    }

    function addRegex(){
        if(Array.isArray(currentModule.regex)){
            currentModule.regex.push({
                comment: "",
                in: "",
                out: "",
                type: "editinput"
            })

            currentModule.regex = currentModule.regex
        }
    }

    function addTrigger(){
        if(Array.isArray(currentModule.trigger)){
            currentModule.trigger.push({
                conditions: [],
                type: 'start',
                comment: '',
                effect: []
            })

            currentModule.trigger = currentModule.trigger
        }
    }
</script>

<div class="flex w-full rounded-md border border-darkborderc mb-4 overflow-x-auto h-16 min-h-16 overflow-y-clip">
    <button on:click={() => {
        submenu = 0
    }} class="p-2 flex-1 border-r border-darkborderc" class:bg-darkbutton={submenu === 0}>
        <span>{language.basicInfo}</span>
    </button>
    <button on:click={() => {
        currentModule.lorebook ??= []
        submenu = 1
    }} class="p2 flex-1 border-r border-darkborderc" class:bg-darkbutton={submenu === 1}>
        <span>{language.loreBook}</span>
    </button>
    <button on:click={() => {
        currentModule.regex ??= []
        submenu = 2
    }} class="p-2 flex-1 border-r border-darkborderc" class:bg-darkbutton={submenu === 2}>
        <span>{language.regexScript}</span>
    </button>
    <button on:click={() => {
        currentModule.trigger ??= []
        submenu = 3
    }} class="p-2 flex-1 border-r border-darkborderc" class:bg-darkbutton={submenu === 3}>
        <span>{language.triggerScript}</span>
    </button>
    <button on:click={() => {
        currentModule.backgroundEmbedding ??= ''
        submenu = 4
    }} class="p-2 flex-1 border-r border-darkborderc" class:bg-darkbutton={submenu === 4}>
        <span>{language.backgroundHTML}</span>
    </button>
    <button on:click={() => {
        currentModule.assets ??= []
        submenu = 5
    }} class="p-2 flex-1" class:bg-darkbutton={submenu === 5}>
        <span>{language.additionalAssets}</span>
    </button>
</div>

{#if submenu === 0}
    <span>{language.name}</span>
    <TextInput bind:value={currentModule.name} className="mt-1"/>
    <span class="mt-4">{language.description}</span>
    <TextInput bind:value={currentModule.description} className="mt-1" size="sm"/>
    <span class="mt-4">{language.namespace} <Help key="namespace" /></span>
    <TextInput bind:value={currentModule.namespace} className="mt-1" size="sm"/>
    <div class="flex items-center mt-4">
        <Check bind:check={currentModule.hideIcon} name={language.hideChatIcon}/>
    </div>
{/if}
{#if submenu === 1 && (Array.isArray(currentModule.lorebook))}
    <div class="border border-selected p-2 flex flex-col rounded-md mt-2">
        {#each currentModule.lorebook as lore, i}
            <LoreBookData bind:value={currentModule.lorebook[i]} idx={i} onRemove={() => {
                currentModule.lorebook.splice(i, 1)
                currentModule.lorebook = currentModule.lorebook
            }}/>
        {/each}
    </div>
    <button on:click={() => {addLorebook()}} class="hover:text-textcolor cursor-pointer">
        <PlusIcon />
    </button>
{/if}

{#if submenu === 2 && (Array.isArray(currentModule.regex))}
    <RegexList bind:value={currentModule.regex}/>
    <div class="text-textcolor2 mt-2 flex gap-2">
        <button class="font-medium cursor-pointer hover:text-green-500" on:click={() => {
            addRegex()
        }}><PlusIcon /></button>
        <button class="font-medium cursor-pointer hover:text-green-500" on:click={() => {
            exportRegex(currentModule.regex)
        }}><DownloadIcon /></button>
        <button class="font-medium cursor-pointer hover:text-green-500" on:click={async () => {
            currentModule.regex = await importRegex(currentModule.regex)
        }}><FolderUpIcon /></button>
    </div>
{/if}

{#if submenu === 4 && typeof(currentModule.backgroundEmbedding) === 'string'}
    <TextAreaInput bind:value={currentModule.backgroundEmbedding} className="mt-2" placeholder={language.backgroundHTML} size="sm"/>
{/if}

{#if submenu === 5 && (Array.isArray(currentModule.assets))}
    <div class="w-full max-w-full border border-selected rounded-md p-2">
        <table class="contain w-full max-w-full tabler mt-2">
            <tbody>
            <tr>
                <th class="font-medium">{language.value}</th>
                <th class="font-medium cursor-pointer w-10">
                    <button class="hover:text-green-500" on:click={async () => {
                        const da = await selectMultipleFile(['png', 'webp', 'mp4', 'mp3', 'gif', 'jpeg', 'jpg', 'ttf', 'otf', 'css', 'webm', 'woff', 'woff2', 'svg', 'avif'])
                        currentModule.assets = currentModule.assets ?? []
                        if(!da){
                            return
                        }
                        for(const f of da){
                            const img = f.data
                            const name = f.name
                            const extension = name.split('.').pop().toLowerCase()
                            const imgp = await saveAsset(img,'', extension)
                            currentModule.assets.push([name, imgp, extension])
                            currentModule.assets = currentModule.assets
                        }
                    }}>
                        <PlusIcon />
                    </button>
                </th>
            </tr>
            {#if (!currentModule.assets) || currentModule.assets.length === 0}
                <tr>
                    <div class="text-textcolor2"> No Assets</div>
                </tr>
            {:else}
                {#each currentModule.assets as assets, i}
                    <tr>
                        <td class="font-medium truncate">
                            {#if assetFilePath[i] && $DataBase.useAdditionalAssetsPreview}
                                {#if assetFileExtensions[i] === 'mp4'}
                                <!-- svelte-ignore a11y-media-has-caption -->
                                    <video controls class="mt-2 px-2 w-full m-1 rounded-md"><source src={assetFilePath[i]} type="video/mp4"></video>
                                {:else if assetFileExtensions[i] === 'mp3'}
                                    <audio controls class="mt-2 px-2 w-full h-16 m-1 rounded-md" loop><source src={assetFilePath[i]} type="audio/mpeg"></audio>
                                {:else}
                                    <img src={assetFilePath[i]} class="w-16 h-16 m-1 rounded-md" alt={assets[0]}/>
                                {/if}
                            {/if}
                            <TextInput fullwidth size="sm" marginBottom bind:value={currentModule.assets[i][0]} placeholder="..." />
                        </td>
                        
                        <th class="font-medium cursor-pointer w-10">
                            <button class="hover:text-green-500" on:click={() => {
                                let additionalAssets = currentModule.assets
                                additionalAssets.splice(i, 1)
                                currentModule.assets = additionalAssets
                            }}>
                                <TrashIcon />
                            </button>
                        </th>
                    </tr>
                {/each}
            {/if}
            </tbody>
        </table>
    </div>
{/if}

{#if submenu === 3 && (Array.isArray(currentModule.trigger))}
    <TriggerList bind:value={currentModule.trigger} lowLevelAble={currentModule.lowLevelAccess} />

    <div class="flex items-center mt-4">
        <Check bind:check={currentModule.lowLevelAccess} name={language.lowLevelAccess}/>
        <span> <Help key="lowLevelAccess" name={language.lowLevelAccess}/></span>
    </div>
{/if}