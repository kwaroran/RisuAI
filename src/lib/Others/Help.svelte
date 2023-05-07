

<button class="relative help inline-block cursor-default hover:text-green-500" on:click={() => {
    alertMd(language.help[key])
}}>
    {#if key === "experimental"}
        <FlaskConicalIcon size={14} />
    {:else}
        <HelpCircleIcon size={14} />
    {/if}
</button>

<script lang="ts">
    import { FlaskConicalIcon, HelpCircleIcon } from "lucide-svelte";
    import { language } from "src/lang";
    import { alertMd } from "src/ts/alert";

    export let key: (keyof (typeof language.help))
</script>