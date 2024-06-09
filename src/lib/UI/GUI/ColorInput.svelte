<script lang="ts">
    import ColorPicker from 'svelte-awesome-color-picker';
    export let value = '#000000';
</script>

<div class="cl rounded-full bg-white">
    <ColorPicker
        label="" bind:hex={value} on:input
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