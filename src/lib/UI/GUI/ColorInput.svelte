<script lang="ts">
    import ColorPicker from 'svelte-awesome-color-picker';
    import { onMount, tick } from 'svelte';

    interface Props {
        value?: string | null;
        nullable?: boolean;
        oninput?: () => void;
    }

    let { value = $bindable('#000000'), nullable = false, oninput }: Props = $props();
    let acceptsInput = false;

    onMount(() => {
        tick().then(() => {
            acceptsInput = true;
        });
    });

    const handleInput = () => {
        if (!acceptsInput) return;
        oninput?.();
    };
</script>

<div class="cl rounded-full bg-white">
    <ColorPicker
        label=""
        bind:hex={value}
        nullable={nullable}
        onInput={handleInput}
    />
</div>

<style>
    .cl{
        --cp-bg-color: var(--risu-theme-bgcolor);
        --cp-border-color: var(--risu-theme-darkborderc);
        --cp-text-color: var(--risu-theme-textcolor);
        --cp-input-color: #555;
        --cp-button-hover-color: #777;
    }
</style>
