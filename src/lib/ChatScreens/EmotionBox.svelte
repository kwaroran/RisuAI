<script>
    import { DBState } from '../../ts/storage/database.svelte';
    import { CharEmotion } from '../../ts/stores';
    import { getEmotion } from '../../ts/util';
</script>

{#await getEmotion(DBState.db,$CharEmotion, 'contain') then images}
    {#each images as image, i}
    <div style={image + `width:${(100 / images.length)}%;bottom:0;left:${100 / images.length * i}%`} class="h-full bg-center absolute"></div>

    {/each}
{/await}

<style>
    .h-full {
        height: 100%;
    }
    .bg-center {
        background-position: center;
    }
</style>