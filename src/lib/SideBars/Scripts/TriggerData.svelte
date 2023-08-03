<script lang="ts">
    import { PlusIcon, XIcon } from "lucide-svelte";
    import { language } from "src/lang";
    import { alertConfirm } from "src/ts/alert";
    import type { triggerscript } from "src/ts/storage/database";
    import Check from "../../UI/GUI/CheckInput.svelte";
    import TextInput from "../../UI/GUI/TextInput.svelte";
    import SelectInput from "../../UI/GUI/SelectInput.svelte";
    import OptionInput from "../../UI/GUI/OptionInput.svelte";
  import NumberInput from "src/lib/UI/GUI/NumberInput.svelte";
  import TextAreaInput from "src/lib/UI/GUI/TextAreaInput.svelte";

    export let value:triggerscript
    export let onRemove: () => void = () => {}
    export let onClose: () => void = () => {}
    export let onOpen: () => void = () => {}

    export let idx:number
    let open = false
</script>

<div class="w-full flex flex-col pt-2 mt-2 border-t border-t-selected first:pt-0 first:mt-0 first:border-0" data-risu-idx={idx}>
    <div class="flex items-center transition-colors w-full ">
        <button class="endflex valuer border-borderc" on:click={() => {
            open = !open
            if(open){
                onOpen()
            }
            else{
                onClose()
            }
        }}>
            <span>{value.comment.length === 0 ? 'Unnamed Trigger' : value.comment}</span>
        </button>
        <button class="valuer" on:click={async () => {
            const d = await alertConfirm(language.removeConfirm + value.comment)
            if(d){
                if(!open){
                    onClose()
                }
                onRemove()
            }
        }}>
            <XIcon />
        </button>
    </div>
    {#if open}
        <div class="seperator p-2">
            <span class="text-textcolor mt-6">{language.name}</span>
            <TextInput size="sm" bind:value={value.comment} />
            <span class="text-textcolor mt-4">{language.type}</span>
            <SelectInput bind:value={value.type}>
                <OptionInput value="start">{language.triggerStart}</OptionInput>
                <OptionInput value="output">{language.triggerOutput}</OptionInput>
                <OptionInput value="input">{language.triggerInput}</OptionInput>
                <OptionInput value="manual">{language.triggerManual}</OptionInput>
            </SelectInput>
            
            <span class="text-textcolor mt-4">Conditions
                <button aria-labelledby="Add Conditions" class="float-right text-textcolor2 hover:text-green-500" on:click={() => {
                    value.conditions.push({
                        type: 'exists',
                        value: '',
                        type2: 'loose',
                        depth: 3
                    })
                    value.conditions = value.conditions

                }}><PlusIcon size={18} /></button>
            </span>
            <div class="flex flex-col px-2 py-4 border border-selected rounded-md">
                {#if value.conditions.length === 0}
                    <span class="text-textcolor2 text-sm">{language.always}</span>
                {/if}
                {#each value.conditions as cond,i}
                    {#if i > 0}
                        <hr class="border-selected my-4" />
                    {/if}
                    <span class="text-textcolor2 text-sm">{language.type}
                        <button aria-labelledby="Add Conditions" class="float-right text-textcolor2 hover:text-green-500" on:click={() => {
                            value.conditions.splice(i, 1)
                            value.conditions = value.conditions
        
                        }}><XIcon size={18} /></button>

                    </span>
                    <SelectInput bind:value={cond.type} size="sm" on:change={() => {
                        if(cond.type === 'exists'){
                            cond = {
                                type: 'exists',
                                value: '',
                                type2: 'loose',
                                depth: 3
                            }
                        }
                        if(cond.type === 'var'){
                            cond = {
                                type: 'var',
                                var: '',
                                value: '',
                                operator: '='
                            }
                        }
                        if(cond.type === 'chatindex'){
                            cond = {
                                type: 'chatindex',
                                value: '',
                                operator: '='
                            }
                        }

                    }}>
                        <OptionInput value="exists">{language.triggerCondExists}</OptionInput>
                        <OptionInput value="var">{language.triggerCondVar}</OptionInput>
                        <OptionInput value="chatindex">{language.ifChatIndex}</OptionInput>
                    </SelectInput>

                    {#if cond.type === 'exists'}
                        <SelectInput bind:value={cond.type2} size="sm">
                            <OptionInput value="loose">{language.triggerMatchLoose}</OptionInput>
                            <OptionInput value="strict">{language.triggerMatchStrict}</OptionInput>
                            <OptionInput value="regex">{language.triggerMatchRegex}</OptionInput>
                        </SelectInput>
                        <span  class="text-textcolor2 text-sm">{language.value}</span>
                        <TextInput size="sm" bind:value={cond.value} />

                        <span  class="text-textcolor2 text-sm">{language.searchDepth}</span>
                        <NumberInput size="sm" bind:value={cond.depth} />
                    {/if}
                    {#if cond.type === 'var' || cond.type === 'chatindex'}
                        {#if cond.type === 'var'}
                            <span class="text-textcolor2 text-sm">{language.varableName}</span>
                            <TextInput size="sm" bind:value={cond.var} />
                        {/if}
                        <span  class="text-textcolor2 text-sm">{language.value}</span>
                        <SelectInput bind:value={cond.operator} size="sm">
                            <OptionInput value="=">{language.equal}</OptionInput>
                            <OptionInput value="!=">{language.notEqual}</OptionInput>
                            <OptionInput value=">">{language.greater}</OptionInput>
                            <OptionInput value="<">{language.less}</OptionInput>
                            <OptionInput value=">=">{language.greaterEqual}</OptionInput>
                            <OptionInput value="<=">{language.lessEqual}</OptionInput>
                            <OptionInput value="null">{language.isNull}</OptionInput>

                        </SelectInput>
                        {#if cond.operator !== 'null'}
                            <TextInput size="sm" bind:value={cond.value} />
                        {/if}
                    {/if}
                {/each}
            </div>

            <span class="text-textcolor mt-4">Effects
                <button aria-labelledby="Add Effects" class="float-right text-textcolor2 hover:text-green-500" on:click={() => {
                    if(value.type === 'start'){
                        value.effect.push({
                            type: 'systemprompt',
                            value: '',
                            location: 'historyend'
                        })
                    }
                    else{
                        value.effect.push({
                            type: 'setvar',
                            var: '',
                            value: '',
                            operator: '='
                        })
                    }
                    value.effect = value.effect

                }}><PlusIcon size={18} /></button>
            </span>

            <div class="flex flex-col px-2 py-4 border border-selected rounded-md">
                {#if value.effect.length === 0}
                    <span class="text-textcolor2 text-sm">{language.noEffect}</span>
                {/if}
                {#each value.effect as effect,i}
                    {#if i > 0}
                        <hr class="border-selected my-4" />
                    {/if}
                    <span class="text-textcolor2 text-sm">{language.type}
                        <button aria-labelledby="Add Conditions" class="float-right text-textcolor2 hover:text-green-500" on:click={() => {
                            value.effect.splice(i, 1)
                            value.effect = value.effect
        
                        }}><XIcon size={18} /></button>

                    </span>
                    <SelectInput bind:value={effect.type} size="sm" on:change={() => {
                        if(effect.type === 'systemprompt'){
                            effect = {
                                type: 'systemprompt',
                                value: '',
                                location: 'historyend'
                            }
                        }
                        if(effect.type === 'setvar'){
                            effect = {
                                type: 'setvar',
                                var: '',
                                value: '',
                                operator: '='
                            }
                        }
                        if(effect.type === 'impersonate'){
                            effect = {
                                type: 'impersonate',
                                role: 'char',
                                value: ''
                            }
                        }
                    }}>
                        {#if effect.type === 'systemprompt' || value.type === 'start'}
                            <OptionInput value="systemprompt">{language.triggerEffSysPrompt}</OptionInput>
                        {/if}
                        <OptionInput value="setvar">{language.triggerEffSetVar}</OptionInput>
                        <OptionInput value="impersonate">{language.triggerEffImperson}</OptionInput>
                    </SelectInput>
                    {#if effect.type === 'systemprompt'}
                        {#if value.type !== 'start'}
                            <span class="text-red-400 text-sm">{language.invaildTriggerEffect}</span>
                        {/if}
                        <span class="text-textcolor2 text-sm">{language.location}</span>
                        <SelectInput bind:value={effect.location} size="sm">
                            <OptionInput value="start">{language.promptstart}</OptionInput>
                            <OptionInput value="historyend">{language.historyend}</OptionInput>
                            <OptionInput value="promptend">{language.promptend}</OptionInput>
                        </SelectInput>
                        <span class="text-textcolor2 text-sm">{language.value}</span>
                        <TextAreaInput size="sm" bind:value={effect.value} />
                    {/if}
                    {#if effect.type === 'setvar'}
                        <span class="text-textcolor2 text-sm">{language.varableName}</span>
                        <TextInput size="sm" bind:value={effect.var} />
                        <span class="text-textcolor2 text-sm">{language.operator}</span>
                        <SelectInput bind:value={effect.operator} size="sm">
                            <OptionInput value="=">{language.TriggerSetToVar}</OptionInput>
                            <OptionInput value="+=">{language.TriggerAddToVar}</OptionInput>
                            <OptionInput value="-=">{language.TriggerSubToVar}</OptionInput>
                            <OptionInput value="*=">{language.TriggerMulToVar}</OptionInput>
                            <OptionInput value="/=">{language.TriggerDivToVar}</OptionInput>
                        </SelectInput>
                        <span class="text-textcolor2 text-sm">{language.value}</span>
                        <TextInput size="sm" bind:value={effect.value} />
                    {/if}
                    {#if effect.type === 'impersonate'}
                        <span class="text-textcolor2 text-sm">{language.role}</span>
                        <SelectInput bind:value={effect.role} size="sm">
                            <OptionInput value="user">{language.user}</OptionInput>
                            <OptionInput value="char">{language.character}</OptionInput>
                        </SelectInput>
                        <span class="text-textcolor2 text-sm">{language.value}</span>
                        <TextAreaInput size="sm" bind:value={effect.value} />
                    {/if}
                {/each}
            </div>
       </div>
    {/if}
</div>

<style>
    .valuer:hover{
        color: rgba(16, 185, 129, 1);
        cursor: pointer;
    }

    .endflex{
        display: flex;
        flex-grow: 1;
        cursor: pointer;
    }

    .seperator{
        border: none;
        outline: 0;
        width: 100%;
        display: flex;
        flex-direction: column;
        margin-bottom: 0.5rem;
    }
    
</style>