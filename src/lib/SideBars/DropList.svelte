<script>
  import { ChevronDown, ChevronUp } from "lucide-svelte";
  import { language } from "../../lang";

    export let list = []
</script>

<div class="list flex flex-col bg-bgcolor rounded-md">
    {#each list as n, i}
        <div class="w-full h-10 flex items-center">
            <span class="ml-2 flex-grow">{language.formating[n]}</span>
            <button class="mr-1" on:click={() => {
                if(i !== 0){
                    let tempList = list
                    const temp = tempList[i]
                    tempList[i] = tempList[i-1]
                    tempList[i-1] = temp
                    list = tempList
                }
                else{
                    let tempList = list
                    const temp = tempList[i]
                    tempList[i] = tempList[i+1]
                    tempList[i+1] = temp
                    list = tempList
                }
            }}><ChevronUp /></button>
            <button class="mr-1" on:click={() => {
                if(i !== (list.length - 1)){
                    let tempList = list
                    const temp = tempList[i]
                    tempList[i] = tempList[i+1]
                    tempList[i+1] = temp
                    list = tempList
                }
                else{
                    let tempList = list
                    const temp = tempList[i]
                    tempList[i] = tempList[i-1]
                    tempList[i-1] = temp
                    list = tempList
                }
            }}><ChevronDown /></button>
        </div>
        {#if i !== (list.length - 1)}
            <div class="seperator"></div>
        {/if}
    {/each}
</div>

<style>
    .seperator{
        width: 100%;
        border: none;
        outline: 0;
        border-bottom: 1px solid #6272a4;
    }
</style>