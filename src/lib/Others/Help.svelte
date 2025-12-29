<button title={name+' '+language.showHelp} class="relative help inline-block align-middle cursor-default hover:text-green-500" onclick={() => {
    alertMd(language.help[key])
}}>
    
    {#if key === "experimental"}
        <div class="text-red-500 hover:text-green-500">
            <FlaskConicalIcon size={16} />
        </div>
    {:else if unrecommended}
        <div class="text-red-500 hover:text-green-500">
            <AlertTriangle size={14} />
        </div>
    {:else}
        <HelpCircleIcon size={14} />
    {/if}    
</button>
<script lang="ts">
    import { AlertTriangle, FlaskConicalIcon, HelpCircleIcon } from "@lucide/svelte";
    import { language } from "src/lang";
    import { alertMd } from "src/ts/alert";

    interface Props {
        unrecommended?: boolean;
        key: (keyof (typeof language.help));
        name?: string;
    }

    let { unrecommended = false, key, name = '' }: Props = $props();
</script>