<input 
    class={"border border-darkborderc focus:border-borderc rounded-md shadow-sm bg-transparent numinput focus:ring-borderc focus:ring-2 focus:outline-none transition-colors duration-200" + ((className) ? (' ' + className) : '')} 
    class:text-sm={size === 'sm'}
    class:text-md={size === 'md'}
    class:text-lg={size === 'lg'}
    class:text-textcolor={!disabled}
    class:text-textcolor2={disabled}
    class:px-4={size === 'md' && padding}
    class:py-2={size === 'md' && padding}
    class:px-2={size === 'sm' && padding}
    class:py-1={size === 'sm' && padding}
    class:px-6={size === 'lg' && padding}
    class:py-3={size === 'lg' && padding}
    class:mb-4={marginBottom}
    class:w-full={fullwidth}
    class:h-full={fullh}
    type="number"
    min={min}
    max={max}
    id={id}
    disabled={disabled}
    bind:value={displayValue}
    onchange={onChange}
    oninput={handleInput}
    onkeydown={handleKeyDown}
/>

<script lang="ts">
    interface Props {
        min?: number;
        max?: number;
        size?: 'sm'|'md'|'lg';
        value: number;
        id?: string;
        padding?: boolean;
        marginBottom?: boolean;
        fullwidth?: boolean;
        fullh?: boolean;
        onChange?: (event: Event & {
            currentTarget: EventTarget & HTMLInputElement;
        }) => any;
        className?: string;
        disabled?: boolean;
    }

    let {
        min = undefined,
        max = undefined,
        size = 'sm',
        value = $bindable(),
        id = undefined,
        padding = true,
        marginBottom = false,
        fullwidth = false,
        fullh = false,
        onChange = () => {},
        className = '',
        disabled = false
    }: Props = $props();

    let displayValue = $state<string | number>(value.toString());
    
    // Sync displayValue with value changes from parent
    $effect(() => {
        displayValue = value.toString();
    });

    const handleKeyDown = (e: KeyboardEvent) => {
        const input = e.currentTarget as HTMLInputElement;
        const currentValue = input.value;
        
        // If current value is "0" and user types a non-zero digit, replace the 0
        if (currentValue === "0" && /^[1-9]$/.test(e.key)) {
            // Let the default behavior happen, just prevent duplicate handling
        }
        // If current value is "0" and user types ".", allow it to become "0."
        else if (currentValue === "0" && e.key === ".") {
            // Let the default behavior happen
        }
        // If current value is "0" and user types "-", replace with "-"
        else if (currentValue === "0" && e.key === "-") {
            e.preventDefault();
            // Clear the input first, then set to "-"
            input.value = "-";
            displayValue = "-";
        }
    };

    const handleInput = (e: Event) => {
        const input = e.currentTarget as HTMLInputElement;
        const inputValue = input.value;
        
        // Handle empty input
        if (inputValue === "") {
            value = 0;
            return;
        }
        
        // Handle incomplete inputs that should not update the bound value yet
        const isIncomplete = inputValue === "-" || 
                            inputValue === "." || 
                            inputValue === "-." ||
                            /^-?\d*\.$/.test(inputValue);
        
        if (isIncomplete) {
            // Don't update the bound value, just keep the display
            return;
        }
        
        // Try to parse the complete input
        const parsed = parseFloat(inputValue);
        if (!isNaN(parsed)) {
            value = parsed;
        } else {
            // If parsing fails, revert to the previous valid value
            displayValue = value.toString();
            input.value = value.toString();
        }
    };
</script>

<style>
    .numinput::-webkit-outer-spin-button,
    .numinput::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }

    /* Firefox */
    .numinput {
        -moz-appearance: textfield;
        appearance: textfield;
    }
</style>