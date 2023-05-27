<script lang="ts">
    import { language } from "src/lang";
    import { DataBase, saveImage, updateTextTheme } from "src/ts/storage/database";
    import { changeFullscreen, selectSingleFile, sleep } from "src/ts/util";
    import Check from "src/lib/Others/Check.svelte";
    import Help from "src/lib/Others/Help.svelte";
</script>

<h2 class="mb-2 text-2xl font-bold mt-2">{language.display}</h2>

<span class="text-neutral-200 mt-4">{language.theme}</span>
<select class="bg-transparent input-text mt-2 text-gray-200 appearance-none text-sm" bind:value={$DataBase.theme}>
    <option value="" class="bg-darkbg appearance-none">Standard Risu</option>
    <option value="waifu" class="bg-darkbg appearance-none">Waifulike</option>
    <option value="waifuMobile" class="bg-darkbg appearance-none">WaifuCut</option>
    <!-- <option value="free" class="bg-darkbg appearance-none">Freestyle</option> -->
</select>


{#if $DataBase.theme === "waifu"}
    <span class="text-neutral-200 mt-4">{language.waifuWidth}</span>
    <input class="text-neutral-200 text-sm p-2 bg-transparent input-text focus:bg-selected" type="range" min="50" max="200" bind:value={$DataBase.waifuWidth}>
    <span class="text-gray-400text-sm">{($DataBase.waifuWidth)}%</span>

    <span class="text-neutral-200 mt-4">{language.waifuWidth2}</span>
    <input class="text-neutral-200 text-sm p-2 bg-transparent input-text focus:bg-selected" type="range" min="20" max="150" bind:value={$DataBase.waifuWidth2}>
    <span class="text-gray-400text-sm">{($DataBase.waifuWidth2)}%</span>
{/if}

<span class="text-neutral-200 mt-4">{language.textColor}</span>
<select class="bg-transparent input-text mt-2 text-gray-200 appearance-none" bind:value={$DataBase.textTheme} on:change={updateTextTheme}>
    <option value="standard" class="bg-darkbg appearance-none">{language.classicRisu}</option>
    <option value="highcontrast" class="bg-darkbg appearance-none">{language.highcontrast}</option>
    <option value="custom" class="bg-darkbg appearance-none">Custom</option>
</select>

{#if $DataBase.textTheme === "custom"}
    <div class="flex items-center mt-2">
        <input type="color" class="style2 text-sm" bind:value={$DataBase.customTextTheme.FontColorStandard} on:change={updateTextTheme}>
        <span class="ml-2">Normal Text</span>
    </div>
    <div class="flex items-center mt-2">
        <input type="color" class="style2 text-sm" bind:value={$DataBase.customTextTheme.FontColorItalic} on:change={updateTextTheme}>
        <span class="ml-2">Italic Text</span>
    </div>
    <div class="flex items-center mt-2">
        <input type="color" class="style2 text-sm" bind:value={$DataBase.customTextTheme.FontColorBold} on:change={updateTextTheme}>
        <span class="ml-2">Bold Text</span>
    </div>
    <div class="flex items-center mt-2">
        <input type="color" class="style2 text-sm" bind:value={$DataBase.customTextTheme.FontColorItalicBold} on:change={updateTextTheme}>
        <span class="ml-2">Italic Bold Text</span>
    </div>
{/if}

<span class="text-neutral-200">{language.UISize}</span>
<input class="text-neutral-200 p-2 bg-transparent input-text focus:bg-selected" type="range" min="50" max="200" bind:value={$DataBase.zoomsize}>
<span class="text-gray-400 mb-6 text-sm">{($DataBase.zoomsize)}%</span>

<span class="text-neutral-200">{language.iconSize}</span>
<input class="text-neutral-200 p-2 bg-transparent input-text focus:bg-selected" type="range" min="50" max="200" bind:value={$DataBase.iconsize}>
<span class="text-gray-400 mb-6 text-sm">{($DataBase.iconsize)}%</span>

<div class="flex items-center mt-2">
    <Check bind:check={$DataBase.fullScreen} onChange={changeFullscreen}/>
    <span>{language.fullscreen}</span>
</div>

<div class="flex items-center mt-2">
    <Check bind:check={$DataBase.showMemoryLimit}/>
    <span>{language.showMemoryLimit}</span>
</div>

<div class="flex items-center mt-2">
    <Check check={$DataBase.customBackground !== ''} onChange={async (check) => {
        if(check){
            $DataBase.customBackground = '-'
            const d = await selectSingleFile(['png', 'webp', 'gif'])
            if(!d){
                $DataBase.customBackground = ''
                return
            }
            const img = await saveImage(d.data)
            $DataBase.customBackground = img
        }
        else{
            $DataBase.customBackground = ''
        }
    }}></Check>
    <span>{language.useCustomBackground}</span>
</div>

<div class="flex items-center mt-2">
    <Check bind:check={$DataBase.playMessage}/>
    <span>{language.playMessage} <Help key="msgSound"/></span>
</div>

<div class="flex items-center mt-2">
    <Check bind:check={$DataBase.roundIcons}/>
    <span>{language.roundIcons}</span>
</div>

{#if $DataBase.textScreenColor}
    <div class="flex items-center mt-2">
        <Check check={true} onChange={() => {
            $DataBase.textScreenColor = null
        }}/>
        <input type="color" class="style2 text-sm mr-2" bind:value={$DataBase.textScreenColor} >
        <span>{language.textBackgrounds}</span>
    </div>
{:else}
    <div class="flex items-center mt-2">
        <Check check={false} onChange={() => {
            $DataBase.textScreenColor = "#121212"
        }}/>
        <span>{language.textBackgrounds}</span>
    </div>


{/if}

<div class="flex items-center mt-2">
    <Check bind:check={$DataBase.textBorder}/>
    <span>{language.textBorder}</span>
</div>


<div class="flex items-center mt-2">
    <Check bind:check={$DataBase.textScreenRounded}/>
    <span>{language.textScreenRound}</span>
</div>

{#if $DataBase.textScreenBorder}
    <div class="flex items-center mt-2">
        <Check check={true} onChange={() => {
            $DataBase.textScreenBorder = null
        }}/>
        <input type="color" class="style2 text-sm mr-2" bind:value={$DataBase.textScreenBorder} >
        <span>{language.textScreenBorder}</span>
    </div>
{:else}
    <div class="flex items-center mt-2">
        <Check check={false} onChange={() => {
            $DataBase.textScreenBorder = "#121212"
        }}/>
        <span>{language.textScreenBorder}</span>
    </div>

{/if}