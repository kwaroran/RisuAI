<script lang="ts">
    import { XIcon } from "lucide-svelte";
    import { language } from "../../lang";

    import { DBState } from 'src/ts/stores.svelte';
    import { changeUserPersona } from "src/ts/persona";
    import { getPersonaIndexObject } from "src/ts/util";


    interface Props {
        close?: any;
    }

    let { close = () => {} }: Props = $props();

    // personaOrder 순서대로 페르소나를 정렬한 배열 생성
    let orderedPersonas = $derived.by(() => {
        const idObject = getPersonaIndexObject()
        const result: Array<{type: 'persona', index: number, name: string, note: string, isInFolder?: boolean} | {type: 'folder', name: string}> = []

        for (const item of DBState.db.personaOrder) {
            if (typeof item === 'string') {
                // 일반 페르소나
                const index = idObject[item] ?? -1
                if (index !== -1) {
                    const persona = DBState.db.personas[index]
                    result.push({
                        type: 'persona',
                        index,
                        name: persona.name,
                        note: persona.note || ''
                    })
                }
            } else {
                // 폴더 - 폴더 이름 먼저 추가
                result.push({
                    type: 'folder',
                    name: item.name
                })
                // 폴더 안의 페르소나들 추가
                for (const personaId of item.data) {
                    const index = idObject[personaId] ?? -1
                    if (index !== -1) {
                        const persona = DBState.db.personas[index]
                        result.push({
                            type: 'persona',
                            index,
                            name: persona.name,
                            note: persona.note || '',
                            isInFolder: true
                        })
                    }
                }
            }
        }

        return result
    })

</script>

<div class="absolute w-full h-full z-40 bg-black bg-opacity-50 flex justify-center items-center">
    <div class="bg-darkbg p-4 break-any rounded-md flex flex-col max-w-3xl w-96 max-h-full overflow-y-auto">
        <div class="flex items-center text-textcolor mb-4">
            <h2 class="mt-0 mb-0 font-bold">{language.persona}</h2>
            <div class="flex-grow flex justify-end">
                <button class="text-textcolor2 hover:text-green-500 mr-2 cursor-pointer items-center" onclick={close}>
                    <XIcon size={24}/>
                </button>
            </div>
        </div>
        {#each orderedPersonas as item}
            {#if item.type === 'folder'}
                <!-- 폴더 헤더 (클릭 불가) -->
                <div class="flex items-center text-textcolor2 border-t-1 border-solid border-0 border-darkborderc p-2 pt-3 pb-1">
                    <span class="text-sm font-bold opacity-75">
                        {item.name}
                    </span>
                </div>
            {:else}
                <!-- 페르소나 버튼 (클릭 가능) -->
                <button onclick={() => {
                    changeUserPersona(item.index)
                    close()
                }} class="flex items-center text-textcolor border-t-1 border-solid border-0 border-darkborderc p-2 cursor-pointer" class:bg-selected={item.index === DBState.db.selectedPersona}>
                    <span class="overflow-x-auto whitespace-nowrap w-full text-left">
                        {#if item.isInFolder}
                            <span class="opacity-50 mr-1">└</span>
                        {/if}
                        <span class="font-medium">{item.name}</span>
                        {#if item.note}
                            <span class="opacity-75"> / {item.note}</span>
                        {/if}
                    </span>
                </button>
            {/if}
        {/each}
    </div>
</div>

<style>
    .break-any{
        word-break: normal;
        overflow-wrap: anywhere;
    }
</style>