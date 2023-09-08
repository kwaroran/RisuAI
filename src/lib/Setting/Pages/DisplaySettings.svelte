<script lang="ts">
    import { language } from "src/lang";
    import { DataBase, saveImage } from "src/ts/storage/database";
    import { changeFullscreen, selectSingleFile, sleep } from "src/ts/util";
    import Check from "src/lib/UI/GUI/CheckInput.svelte";
    import Help from "src/lib/Others/Help.svelte";
    import SliderInput from "src/lib/UI/GUI/SliderInput.svelte";
    import SelectInput from "src/lib/UI/GUI/SelectInput.svelte";
    import OptionInput from "src/lib/UI/GUI/OptionInput.svelte";
    import { updateAnimationSpeed } from "src/ts/gui/animation";
    import { changeColorScheme, colorSchemeList, updateTextTheme } from "src/ts/gui/colorscheme";

    const onSchemeInputChange = (e:Event) => {
        changeColorScheme((e.target as HTMLInputElement).value)
    }
</script>

<h2 class="mb-2 text-2xl font-bold mt-2">{language.display}</h2>

<span class="text-textcolor mt-4">{language.theme}</span>
<SelectInput className="mt-2" bind:value={$DataBase.theme}>
    <OptionInput value="" >Standard Risu</OptionInput>
    <OptionInput value="waifu" >Waifulike</OptionInput>
    <OptionInput value="waifuMobile" >WaifuCut</OptionInput>
</SelectInput>


{#if $DataBase.theme === "waifu"}
    <span class="text-textcolor mt-4">{language.waifuWidth}</span>
    <SliderInput min={50} max={200} bind:value={$DataBase.waifuWidth} />
    <span class="text-textcolor2 text-sm">{($DataBase.waifuWidth)}%</span>

    <span class="text-textcolor mt-4">{language.waifuWidth2}</span>
    <SliderInput min={20} max={150} bind:value={$DataBase.waifuWidth2} />
    <span class="text-textcolor2 text-sm">{($DataBase.waifuWidth2)}%</span>
{/if}

<span class="text-textcolor mt-4">{language.colorScheme}</span>
<SelectInput className="mt-2" value={$DataBase.colorSchemeName} on:change={onSchemeInputChange}>
    {#each colorSchemeList as scheme}
        <OptionInput value={scheme} >{scheme}</OptionInput>
    {/each}
</SelectInput>

<span class="text-textcolor mt-4">{language.textColor}</span>
<SelectInput className="mt-2" bind:value={$DataBase.textTheme} on:change={updateTextTheme}>
    <OptionInput value="standard" >{language.classicRisu}</OptionInput>
    <OptionInput value="highcontrast" >{language.highcontrast}</OptionInput>
    <OptionInput value="custom" >Custom</OptionInput>
</SelectInput>

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

<span class="text-textcolor">{language.UISize}</span>
<SliderInput  min={50} max={200} bind:value={$DataBase.zoomsize} />
<span class="text-textcolor2 mb-6 text-sm">{($DataBase.zoomsize)}%</span>

<span class="text-textcolor">{language.iconSize}</span>
<SliderInput min={50} max={200} bind:value={$DataBase.iconsize} />
<span class="text-textcolor2 mb-6 text-sm">{($DataBase.iconsize)}%</span>


<span class="text-textcolor">{language.assetWidth}</span>
<SliderInput min={-1} max={40} step={1} bind:value={$DataBase.assetWidth} />
<span class="text-textcolor2 mb-6 text-sm">{
    ($DataBase.assetWidth === -1) ? "Unlimited" : 
    ($DataBase.assetWidth === 0) ? "Hidden" : (`${($DataBase.assetWidth).toFixed(1)} rem`)}</span>


<span class="text-textcolor">{language.animationSpeed}</span>
<SliderInput min={0} max={1} step={0.05} bind:value={$DataBase.animationSpeed} on:change={updateAnimationSpeed} />
<span class="text-textcolor2 mb-6 text-sm">{(`${($DataBase.animationSpeed).toFixed(2)}s`)}</span>

<div class="flex items-center mt-2">
    <Check bind:check={$DataBase.fullScreen} onChange={changeFullscreen} name={language.fullscreen}/>
</div>

<div class="flex items-center mt-2">
    <Check bind:check={$DataBase.showMemoryLimit} name={language.showMemoryLimit}/>
</div>

<div class="flex items-center mt-2">
    <Check bind:check={$DataBase.hideRealm} name={language.hideRealm}/>
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
    }} name={language.useCustomBackground}></Check>
</div>

<div class="flex items-center mt-2">
    <Check bind:check={$DataBase.playMessage} name={language.playMessage}/>
    <span> <Help key="msgSound" name={language.playMessage}/></span>
</div>

<div class="flex items-center mt-2">
    <Check bind:check={$DataBase.roundIcons} name={language.roundIcons}/>
</div>

{#if $DataBase.textScreenColor}
    <div class="flex items-center mt-2">
        <Check check={true} onChange={() => {
            $DataBase.textScreenColor = null
        }} name={language.textBackgrounds} hiddenName/>
        <input type="color" class="style2 text-sm mr-2" bind:value={$DataBase.textScreenColor} >
        <span>{language.textBackgrounds}</span>
    </div>
{:else}
    <div class="flex items-center mt-2">
        <Check check={false} onChange={() => {
            $DataBase.textScreenColor = "#121212"
        }} name={language.textBackgrounds}/>
    </div>


{/if}

<div class="flex items-center mt-2">
    <Check bind:check={$DataBase.textBorder} name={language.textBorder}/>
</div>


<div class="flex items-center mt-2">
    <Check bind:check={$DataBase.textScreenRounded} name={language.textScreenRound}/>
</div>

{#if $DataBase.textScreenBorder}
    <div class="flex items-center mt-2">
        <Check check={true} onChange={() => {
            $DataBase.textScreenBorder = null
        }} name={language.textScreenBorder} hiddenName/>
        <input type="color" class="style2 text-sm mr-2" bind:value={$DataBase.textScreenBorder} >
        <span>{language.textScreenBorder}</span>
    </div>
{:else}
    <div class="flex items-center mt-2">
        <Check check={false} onChange={() => {
            $DataBase.textScreenBorder = "#121212"
        }} name={language.textScreenBorder}/>
    </div>
{/if}

<div class="flex items-center mt-2">
    <Check bind:check={$DataBase.useChatCopy} name={language.useChatCopy}/>
</div>

<div class="flex items-center mt-2">
    <Check bind:check={$DataBase.useAdditionalAssetsPreview} name={language.useAdditionalAssetsPreview}/>
</div>

{#if $DataBase.useExperimental}
    <div class="flex items-center mt-2">
        <Check bind:check={$DataBase.useChatSticker} name={language.useChatSticker}/>
        <Help key="experimental" name={language.useChatSticker}/>
    </div>
{/if}
