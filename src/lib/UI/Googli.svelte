<script lang="ts">
    import { onMount } from "svelte";

    interface Props {
        className?: string;
    } 

    let { className = $bindable() }:Props = $props();

    onMount(() => {
        if(!import.meta.env.VITE_AD_CLIENT){
            return
        }
        try{
            //@ts-expect-error adsbygoogle is injected by Google AdSense script, not defined in Window interface
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        }catch{}
    });
</script>

{#if import.meta.env.VITE_AD_CLIENT}
    {#if import.meta.env.VITE_AD_CLIENT === 'TEST'}
        <div
            class={className}
        >
            <div
                class="bg-slate-500"
                style={window.innerWidth > 728 ? "display:block !important;width:728px;height:90px" : "display:block !important;width:300px;height:100px"}
            >TEST</div>
        </div>
    {:else}
        <div
            class={className}
        >
            <ins
                class="adsbygoogle"
                style={window.innerWidth > 728 ? "display:block !important;width:728px;height:90px" : "display:block !important;width:300px;height:100px"}
                data-ad-client={window.innerWidth > 728 ? import.meta.env.VITE_AD_CLIENT : import.meta.env.VITE_AD_CLIENT_MOBILE}
                data-ad-slot={window.innerWidth > 728 ? import.meta.env.VITE_AD_SLOT : import.meta.env.VITE_AD_SLOT_MOBILE}
            ></ins>
        </div>
    {/if}
{/if}