<script lang="ts">
    import { CheckCircle2Icon, Globe, XIcon } from "lucide-svelte";
    import { language } from "src/lang";
    import Button from "src/lib/UI/GUI/Button.svelte";
    import TextInput from "src/lib/UI/GUI/TextInput.svelte";
    import type { RisuModule } from "src/ts/process/modules";
    import { DataBase } from "src/ts/storage/database";
    import { CurrentChat } from "src/ts/stores";
    import { SettingsMenuIndex, settingsOpen } from "src/ts/stores";
    export let close = (i:string) => {}
    export let alertMode = false
    let moduleSearch = ''

    function sortModules(modules:RisuModule[], search:string){
        const db = $DataBase
        return modules.filter((v) => {
            if(search === '') return true
            return v.name.toLowerCase().includes(search.toLowerCase())
        
        }).sort((a, b) => {
            let score = a.name.toLowerCase().localeCompare(b.name.toLowerCase())

            if(!alertMode){
                if(db.enabledModules.includes(a.id)){
                    score += 1000
                }
                if(db.enabledModules.includes(b.id)){
                    score -= 1000
                }
            }

            return score
        })
    }

</script>


<div class="absolute w-full h-full z-40 bg-black bg-opacity-50 flex justify-center items-center">
    <div class="bg-darkbg p-4 break-any rounded-md flex flex-col max-w-3xl w-full max-h-full overflow-y-auto">
        <div class="flex items-center text-textcolor">
            <h2 class="mt-0 mb-0 text-lg">{language.modules}</h2>
            <div class="flex-grow flex justify-end">
                <button class="text-textcolor2 hover:text-green-500 mr-2 cursor-pointer items-center" on:click={() => {
                    close('')
                }}>
                    <XIcon size={24}/>
                </button>
            </div>
        </div>

        <span class="text-sm text-textcolor2">{language.chatModulesInfo}</span>

        <TextInput className="mt-4" placeholder={language.search} bind:value={moduleSearch} />

        <div class="contain w-full max-w-full mt-4 flex flex-col border-selected border-1 rounded-md">
            {#if $DataBase.modules.length === 0}
                <div class="text-textcolor2 p-3">{language.noModules}</div>
            {:else}
                {#each sortModules($DataBase.modules, moduleSearch) as rmodule, i}
                    {#if i !== 0}
                        <div class="border-t-1 border-selected"></div>
                    {/if}
                    <div class="pl-3 py-3 text-left flex">
                        {#if $DataBase.enabledModules.includes(rmodule.id)}
                            <span class="text-textcolor2">{rmodule.name}</span>
                        {:else}
                            <span class="">{rmodule.name}</span>
                        {/if}
                        <div class="flex-grow flex justify-end">
                            {#if $DataBase.enabledModules.includes(rmodule.id) && !alertMode}
                                <button class="mr-2 text-textcolor2 cursor-not-allowed">
                                </button>
                            {:else}
                                <button class={(!$CurrentChat.modules.includes(rmodule.id) && !alertMode) ?
                                        "text-textcolor2 hover:text-green-500 mr-2 cursor-pointer" :
                                        "mr-2 cursor-pointer text-blue-500"
                                } on:click={async (e) => {
                                    e.stopPropagation()

                                    if(alertMode){
                                        close(rmodule.id)
                                        return
                                    }

                                    if($CurrentChat.modules.includes(rmodule.id)){
                                        $CurrentChat.modules.splice($CurrentChat.modules.indexOf(rmodule.id), 1)
                                    }
                                    else{
                                        $CurrentChat.modules.push(rmodule.id)
                                    }
                                    $CurrentChat.modules = $CurrentChat.modules
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
            <Button className="mt-4 flex-grow-0" size="sm" on:click={() => {
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