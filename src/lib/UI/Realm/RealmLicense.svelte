<script lang="ts">
    import { CCLicenseData } from "src/ts/creation/license";
    import { tooltip } from "src/ts/gui/tooltip";
    import { openURL } from "src/ts/storage/globalApi";

    export let license = ""
</script>

{#if Object.keys(CCLicenseData).includes(license)}
    <div class="w-full flex flex-row">
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div class="flex flex-wrap flex-row gap-1 mt-2 items-center cursor-pointer" use:tooltip={CCLicenseData[license][1] + ". The License only applys to the text."} on:click|stopPropagation={() => {
            openURL(`https://creativecommons.org/licenses/${CCLicenseData[license][0]}/4.0/`)
        }}>
            <img alt="creative commons" class="cc" src="https://i.creativecommons.org/l/{CCLicenseData[license][0]}/4.0/88x31.png" />
            <span class="text-textcolor2">
                Licensed with {CCLicenseData[license][2]}
            </span>
    
        </div>
    </div>
{/if}


<style>
    .cc{
        width: 88px;
        height: 31px;
        border-width: 0;
    }
</style>