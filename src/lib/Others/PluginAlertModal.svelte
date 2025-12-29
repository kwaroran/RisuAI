<script lang="ts">
    import { language } from "src/lang";
    import { pluginAlertModalStore } from "src/ts/stores.svelte";

    

    const reasons:[string,string][] = $derived.by(() => {
        let v = pluginAlertModalStore.errors.map(error => [
            language.pluginRisksInuserFriendly[error.userAlertKey],
            language.pluginRisksInuserFriendlyDesc[error.userAlertKey]
        ] as [string,string])


        //find duplicates and remove them
        v = v.filter(item => {
            const key = item[0]
            const index = v.findIndex(i => i[0] === key)
            return index === v.indexOf(item)
        })
        return v
    })
</script>

{#if pluginAlertModalStore.open}
    <dialog open class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div class="bg-orange-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 class="text-xl font-bold mb-4 text-gray-100">
                {language.pluginRiskDetectedAlert}
            </h2>
            
            <ul class="list-disc list-inside mb-4 space-y-2 text-gray-300">
                {#each reasons as reason}
                    <li>{reason[0]}</li>
                    <ul>
                        <li class="ml-4 text-sm italic">{reason[1]}</li>
                    </ul>
                {/each}
            </ul>
            
            <details class="mb-4 text-gray-200">
                
                <details class="mb-4 text-gray-200">
                    <summary class="cursor-pointer text-gray-200 mb-2">
                        Dev Info
                    </summary>

                    {#each pluginAlertModalStore.errors as error}
                        <p class="text-gray-200">{error.message}</p>
                    {/each}
                    
                </details>

                <button 
                    class="text-gray-200"
                    onclick={() => {
                        pluginAlertModalStore.open = false
                        pluginAlertModalStore.errors = []
                    }}
                >
                    {language.continueAnyway}
                </button>
            </details>
            
            <button 
                class="w-full bg-gray-700 hover:bg-gray-600 text-gray-100 font-semibold py-2 px-4 rounded-sm transition-colors"
                onclick={() => pluginAlertModalStore.open = false}
            >
                {language.doNotInstall}
            </button>
        </div>
    </dialog>
{/if}