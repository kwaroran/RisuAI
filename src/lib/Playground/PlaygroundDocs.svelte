<script lang="ts">
    import { defaultCBSRegisterArg, registerCBS } from "src/ts/cbs";
    import TextInput from "../UI/GUI/TextInput.svelte";
    import { parseMarkdownSafe } from "src/ts/parser.svelte";


    let doc: {
        name: string;
        description: string;
        alias: string[]
    }[] = $state([])
    let searchTerm = $state("");

    registerCBS({
        ...defaultCBSRegisterArg,
        registerFunction: (arg) => {
            if(arg.internalOnly){
                return
            }
            doc.push({
                name: arg.name,
                description: arg.description,
                alias: arg.alias || []
            });
        }
    })

    let searchedDoc = $derived(doc.filter(item => {
        return item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.alias.some(alias => alias.toLowerCase().includes(searchTerm.toLowerCase()));
    }))
</script>

<h2 class="text-4xl text-textcolor my-6 font-black relative">CBS Docs Beta</h2>
<div class="max-w-4xl w-full p-6">
    <div class="mb-8 w-full">
        <TextInput
            placeholder="Search documentation..."
            className="w-full"
            fullwidth
            bind:value={searchTerm}
        />
    </div>
    
    <div class="grid gap-6">
        {#each searchedDoc as item, index}
            <div class="rounded-lg border border-darkborderc p-6">
                <div class="flex items-start justify-between mb-4">
                    <h3 class="text-xl font-semibold text-textcolor">{item.name}</h3>
                </div>
                
                <div class="text-textcolor2 mb-4 leading-relaxed">{@html parseMarkdownSafe(item.description, {
                    forbidTags: ['mark']
                })}</div>
                
                {#if item.alias.length > 0}
                    <div class="flex flex-wrap gap-2">
                        <span class="text-sm text-textcolor2 mr-2">Aliases:</span>
                        {#each item.alias as alias}
                            <span class="bg-darkbg text-textcolor2 text-xs px-2 py-1 rounded-full">{alias}</span>
                        {/each}
                    </div>
                {/if}
            </div>
        {/each}
    </div>
    
    {#if !doc || doc.length === 0}
        <div class="text-center py-12">
            <div class="text-gray-400 text-6xl mb-4">📚</div>
            <h3 class="text-xl text-gray-600 mb-2">No documentation found</h3>
            <p class="text-gray-500">Documentation will appear here when available.</p>
        </div>
    {/if}
</div>