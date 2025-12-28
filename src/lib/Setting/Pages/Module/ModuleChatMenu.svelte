<script lang="ts">
    import { CheckCircle2Icon, Waypoints, XIcon } from "@lucide/svelte";
    import { language } from "src/lang";
    import Button from "src/lib/UI/GUI/Button.svelte";
    import TextInput from "src/lib/UI/GUI/TextInput.svelte";
    import type { RisuModule } from "src/ts/process/modules";
    
    import { DBState, ReloadGUIPointer } from 'src/ts/stores.svelte';
    import { selectedCharID } from "src/ts/stores.svelte";
    import { SettingsMenuIndex, settingsOpen } from "src/ts/stores.svelte";

    interface Props {
        close?: any;
        alertMode?: boolean;
    }

    let { close = (i:string) => {}, alertMode = false }: Props = $props();
    let moduleSearch = $state('')

    function sortModules(modules:RisuModule[], search:string){
        const db = DBState.db
        return modules.filter((v) => {
            if(search === '') return true
            return v.name.toLowerCase().includes(search.toLowerCase())
        
        }).sort((a, b) => {
            let score = a.name.toLowerCase().localeCompare(b.name.toLowerCase())
            return score
        })
    }

</script>


<div class="absolute w-full h-full z-40 bg-black/50 flex justify-center items-center">
    <div class="bg-darkbg p-4 break-any rounded-md flex flex-col max-w-3xl w-full max-h-full overflow-y-auto">
        <div class="flex items-center text-textcolor">
            <h2 class="mt-0 mb-0 text-lg">{language.modules}</h2>
            <div class="grow flex justify-end">
                <button class="text-textcolor2 hover:text-green-500 mr-2 cursor-pointer items-center" onclick={() => {
                    close('')
                }}>
                    <XIcon size={24}/>
                </button>
            </div>
        </div>

        <span class="text-sm text-textcolor2">{language.chatModulesInfo}</span>

        <TextInput className="mt-4" placeholder={language.search} bind:value={moduleSearch} />

        <div class="contain w-full max-w-full mt-4 flex flex-col border-selected border-1 rounded-md">
            {#if DBState.db.modules.length === 0}
                <div class="text-textcolor2 p-3">{language.noModules}</div>
            {:else}
                {#each sortModules(DBState.db.modules, moduleSearch) as rmodule, i}
                    {#if i !== 0}
                        <div class="border-t-1 border-selected"></div>
                    {/if}
                    <div class="pl-3 py-3 text-left flex items-center">
                        {#if rmodule.mcp}
                            <Waypoints size={18} class="mr-2" />
                        {/if}
                        {#if !alertMode && DBState.db.enabledModules.includes(rmodule.id)}
                            <span class="text-textcolor2">{rmodule.name}</span>
                        {:else}
                            <span class="">{rmodule.name}</span>
                        {/if}
                        <div class="grow flex justify-end">

                            {#if alertMode}
                                <button class={"text-textcolor2 mr-2 cursor-pointer hover:text-blue-500 transition-colors"} onclick={async (e) => {
                                    e.stopPropagation()

                                    close(rmodule.id)
                                }}>
                                    <CheckCircle2Icon size={18}/>
                                </button>
                            {:else if DBState.db.enabledModules.includes(rmodule.id)}
                                <button class="mr-2 text-textcolor2 cursor-not-allowed"aria-labelledby="disabled">
                                </button>
                            {:else}
                                <button class={(DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].modules.includes(rmodule.id)) ?
                                        "mr-2 cursor-pointer text-blue-500" :
                                        (DBState.db.characters[$selectedCharID]?.modules?.includes(rmodule.id)) ?
                                        "mr-2 cursor-pointer text-violet-500" :
                                        "text-textcolor2 hover:text-blue-400 mr-2 cursor-pointer"
                                } onclick={async (e) => {
                                    e.stopPropagation()
                                    if(DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].modules.includes(rmodule.id)){
                                        DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].modules.splice(DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].modules.indexOf(rmodule.id), 1)

                                    }
                                    else{
                                        DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].modules.push(rmodule.id)
                                    }
                                    DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].modules = DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].modules
                                    $ReloadGUIPointer += 1
                                }}
                                oncontextmenu={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    if(!DBState.db.characters[$selectedCharID].modules){
                                        DBState.db.characters[$selectedCharID].modules = []
                                    }
                                    if(DBState.db.characters[$selectedCharID].modules.includes(rmodule.id)){
                                        DBState.db.characters[$selectedCharID].modules.splice(DBState.db.characters[$selectedCharID].modules.indexOf(rmodule.id), 1)
                                    }
                                    else{
                                        DBState.db.characters[$selectedCharID].modules.push(rmodule.id)
                                    }
                                    $ReloadGUIPointer += 1
                                }}>

                                    <CheckCircle2Icon size={18}/>
                                </button>
                            {/if}
                        </div>
                    </div>
                {/each}
            {/if}
        </div>
        <div>
            <Button className="mt-4 grow-0" size="sm" onclick={() => {
                $SettingsMenuIndex = 14
                $settingsOpen = true
                close('')
            }}>{language.edit}</Button>
        </div>
    </div>
</div>

<style>
    .break-any{
        word-break: normal;
        overflow-wrap: anywhere;
    }
</style>