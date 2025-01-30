<script lang="ts">
    import { onMount } from "svelte";

    export let className: string = "";
    onMount(() => {
        if(!import.meta.env.VITE_AD_CLIENT){
            return
        }
        //@ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({});
    });
</script>

{#if !import.meta.env.VITE_AD_CLIENT}
    <div
        class={className}
    >
        <ins
            class="adsbygoogle"
            style="display:block"
            data-ad-client={import.meta.env.VITE_AD_CLIENT}
            data-ad-slot={import.meta.env.VITE_AD_SLOT}
            data-ad-format="auto"
            data-full-width-responsive="true"
        ></ins>
    </div>
{/if}