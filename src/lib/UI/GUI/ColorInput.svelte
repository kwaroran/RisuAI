<script lang="ts">
    import ColorPicker from 'svelte-awesome-color-picker';
    export let value = '#000000';
    export let nullable = false;
</script>

<div class="cl rounded-full bg-white">
    <ColorPicker
        label="" bind:hex={value} on:input
        nullable={nullable}
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