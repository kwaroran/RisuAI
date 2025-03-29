<script lang="ts">
    import CheckInput from "./CheckInput.svelte";
    import NumberInput from "./NumberInput.svelte";
    import TextInput from "./TextInput.svelte";
    interface Props {
        value: string|number|boolean;
        numberMode?: boolean;
        boolMode?: boolean;
        marginBottom?: boolean;
    }

    let {
        value = $bindable(),
        numberMode = false,
        boolMode = false,
        marginBottom = false
    }: Props = $props();
    const valToggle = () => {
            value = !value
    }
</script>

<div class="flex items-center justify-center" class:mb-4={marginBottom}>
    <div 
        class="flex justify-center items-center border-darkborderc rounded-l-md rounded-t-md rounded-b-md border h-full"
        tabindex="0"
        role="checkbox"
        aria-checked={!(value === null || value === undefined)}
        aria-label="Toggle custom value"
        onkeydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if(value === null || value === undefined){
                    if(numberMode){
                        value = 0
                    }
                    else if(boolMode){
                        value = false
                    }
                    else{
                        value = ""
                    }
                }
                else{
                    value = null
                }
            }
        }}
    >
        <CheckInput hiddenName check={!(value === null || value === undefined)} onChange={() => {
            if(value === null || value === undefined){
                if(numberMode){
                    value = 0
                }
                else if(boolMode){
                    value = false
                }
                else{
                    value = ""
                }
            }
            else{
                value = null
            }
        }} />
    </div>

    {#if (value === null || value === undefined)}
        <TextInput value={"Using default"}  className="flex-1" disabled/>
    {:else if typeof(value) === 'string'}
        <TextInput bind:value={value}  className="flex-1"/>
    {:else if typeof(value) === 'number'}
        <NumberInput bind:value={value}  className="flex-1"/>
    {:else if typeof(value) === 'boolean'}
        <button 
            class="px-2 py-2 border border-darkborderc flex-1" 
            class:text-textcolor2={!value} 
            onclick={valToggle}
            role="radio"
            aria-checked={value}
            aria-label="Set value to true"
            tabindex="0"
            onkeydown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (!value) valToggle();
                }
            }}
        >True</button>
        <button 
            class="px-2 py-2 border border-darkborderc flex-1" 
            class:text-textcolor2={value} 
            onclick={valToggle}
            role="radio"
            aria-checked={!value}
            aria-label="Set value to false"
            tabindex="0"
            onkeydown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (value) valToggle();
                }
            }}
        >False</button>
    {:else}
        <TextInput value={"Using default"}  className="flex-1" disabled/>
    {/if}
</div>