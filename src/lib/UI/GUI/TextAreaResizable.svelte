<script>
    import { onMount } from 'svelte';
    import { DataBase } from "../../../ts/storage/database";

    let textarea;
    let previousScrollHeight = 0;
    export let value = ''

    function resize() {
        textarea.style.height = '0px'; // Reset the textarea height
        textarea.style.height = `calc(${textarea.scrollHeight}px + 1rem)`; // Set the new height
    }

    function handleInput() {
        if (textarea.scrollHeight !== previousScrollHeight) {
            previousScrollHeight = textarea.scrollHeight;
            resize();
        }
    }

    onMount(() => {
        resize();
    });
</script>

<style>
    textarea {
        overflow: hidden;
        resize: none;
        box-sizing: border-box;
        background: transparent;
        color: var(--risu-theme-textcolor);
        border: 1px solid rgba(98, 114, 164, 0.5);
        max-width: calc(95% - 2rem);
        padding: 1rem;
    }
</style>
  
<textarea
    bind:this={textarea}
    on:input={handleInput}
    bind:value={value}
    style:font-size="{0.875 * ($DataBase.zoomsize / 100)}rem"
    style:line-height="{1.25 * ($DataBase.zoomsize / 100)}rem"
/>