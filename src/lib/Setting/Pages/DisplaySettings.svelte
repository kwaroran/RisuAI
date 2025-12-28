<script lang="ts">
    import { language } from "src/lang";
    import { saveImage } from "src/ts/storage/database.svelte";
    import { DBState } from 'src/ts/stores.svelte';
    import { changeFullscreen, selectSingleFile } from "src/ts/util";
    import Check from "src/lib/UI/GUI/CheckInput.svelte";
    import Help from "src/lib/Others/Help.svelte";
    import SliderInput from "src/lib/UI/GUI/SliderInput.svelte";
    import SelectInput from "src/lib/UI/GUI/SelectInput.svelte";
    import OptionInput from "src/lib/UI/GUI/OptionInput.svelte";
    import { updateAnimationSpeed } from "src/ts/gui/animation";
    import { changeColorScheme, changeColorSchemeType, colorSchemeList, exportColorScheme, importColorScheme, updateColorScheme, updateTextThemeAndCSS } from "src/ts/gui/colorscheme";
    import { DownloadIcon, HardDriveUploadIcon } from "@lucide/svelte";
    import { guiSizeText, updateGuisize } from "src/ts/gui/guisize";
    import TextInput from "src/lib/UI/GUI/TextInput.svelte";
    import ColorInput from "src/lib/UI/GUI/ColorInput.svelte";
  import TextAreaInput from "src/lib/UI/GUI/TextAreaInput.svelte";
  import Button from "src/lib/UI/GUI/Button.svelte";
  import { CustomGUISettingMenuStore } from "src/ts/stores.svelte";
  import { alertError } from "src/ts/alert";

    const onSchemeInputChange = (e:Event) => {
        changeColorScheme((e.target as HTMLInputElement).value)
    }

    let submenu = $state(DBState.db.useLegacyGUI ? -1 : 0)
</script>

<h2 class="mb-2 text-2xl font-bold mt-2">{language.display}</h2>

{#if submenu !== -1}
    <div class="flex w-full rounded-md border border-darkborderc mb-4 overflow-x-auto h-16 min-h-16 overflow-y-clip">
        <button onclick={() => {
            submenu = 0
        }} class="p-2 flex-1 border-r border-darkborderc" class:bg-darkbutton={submenu === 0}>
            <span>{language.theme}</span>
        </button>
        <button onclick={() => {
            submenu = 1
        }} class="p2 flex-1 border-r border-darkborderc" class:bg-darkbutton={submenu === 1}>
            <span>{language.sizeAndSpeed}</span>
        </button>
        <button onclick={() => {
            submenu = 2
        }} class="p-2 flex-1 border-r border-darkborderc" class:bg-darkbutton={submenu === 2}>
            <span>{language.others}</span>
        </button>
    </div>
{/if}

{#if submenu === 0 || submenu === -1}
    <span class="text-textcolor mt-4">{language.theme}</span>
    <SelectInput className="mt-2" bind:value={DBState.db.theme}>
        <OptionInput value="" >Standard Risu</OptionInput>
        <OptionInput value="waifu" >Waifulike</OptionInput>
        <!-- <OptionInput value="waifuMobile" >WaifuCut</OptionInput> -->
        <OptionInput value="mobilechat" >Mobile Chat</OptionInput>
        <OptionInput value="cardboard" >CardBoard</OptionInput>

        <OptionInput value="customHTML" >Custom HTML</OptionInput>
    </SelectInput>

    {#if DBState.db.theme === "custom"}
        <Button className="mt-2" onclick={() => {
            CustomGUISettingMenuStore.set(true)
        }}>{language.defineCustomGUI}</Button>
    {/if}


    {#if DBState.db.theme === 'customHTML'}
        <span class="text-textcolor mt-4">{language.chatHTML} <Help key="chatHTML"/></span>
        <TextAreaInput bind:value={DBState.db.guiHTML} />
    {/if}


    {#if DBState.db.theme === "waifu"}
        <span class="text-textcolor mt-4">{language.waifuWidth}</span>
        <SliderInput min={50} max={200} bind:value={DBState.db.waifuWidth} />
        <span class="text-textcolor2 text-sm">{(DBState.db.waifuWidth)}%</span>

        <span class="text-textcolor mt-4">{language.waifuWidth2}</span>
        <SliderInput min={20} max={150} bind:value={DBState.db.waifuWidth2} />
        <span class="text-textcolor2 text-sm">{(DBState.db.waifuWidth2)}%</span>
    {/if}

    <span class="text-textcolor mt-4">{language.colorScheme}</span>
    <SelectInput className="mt-2" value={DBState.db.colorSchemeName} onchange={onSchemeInputChange}>
        {#each colorSchemeList as scheme}
            <OptionInput value={scheme} >{scheme}</OptionInput>
        {/each}
        <OptionInput value="custom" >Custom</OptionInput>
    </SelectInput>

    {#if DBState.db.colorSchemeName === "custom"}
    <div class="border border-darkborderc p-2 m-2 rounded-md">
        <SelectInput className="mt-2" value={DBState.db.colorScheme.type} onchange={(e) => {
            changeColorSchemeType((e.target as HTMLInputElement).value as 'light'|'dark')
        }}>
            <OptionInput value="light">Light</OptionInput>
            <OptionInput value="dark">Dark</OptionInput>
        </SelectInput>
        <div class="flex items-center mt-2">
            <ColorInput bind:value={DBState.db.colorScheme.bgcolor} oninput={updateColorScheme} />
            <span class="ml-2">Background</span>
        </div>
        <div class="flex items-center mt-2">
            <ColorInput bind:value={DBState.db.colorScheme.darkbg} oninput={updateColorScheme} />
            <span class="ml-2">Dark Background</span>
        </div>
        <div class="flex items-center mt-2">
            <ColorInput bind:value={DBState.db.colorScheme.borderc} oninput={updateColorScheme} />
            <span class="ml-2">Color 1</span>
        </div>
        <div class="flex items-center mt-2">
            <ColorInput bind:value={DBState.db.colorScheme.selected} oninput={updateColorScheme} />
            <span class="ml-2">Color 2</span>
        </div>
        <div class="flex items-center mt-2">
            <ColorInput bind:value={DBState.db.colorScheme.draculared} oninput={updateColorScheme} />
            <span class="ml-2">Color 3</span>
        </div>
        <div class="flex items-center mt-2">
            <ColorInput bind:value={DBState.db.colorScheme.darkBorderc} oninput={updateColorScheme} />
            <span class="ml-2">Color 4</span>
        </div>
        <div class="flex items-center mt-2">
            <ColorInput bind:value={DBState.db.colorScheme.darkbutton} oninput={updateColorScheme} />
            <span class="ml-2">Color 5</span>
        </div>
        <div class="flex items-center mt-2">
            <ColorInput bind:value={DBState.db.colorScheme.textcolor} oninput={updateColorScheme} />
            <span class="ml-2">Text Color</span>
        </div>
        <div class="flex items-center mt-2">
            <ColorInput bind:value={DBState.db.colorScheme.textcolor2} oninput={updateColorScheme} />
            <span class="ml-2">Text Color 2</span>
        </div>
        <div class="grow flex justify-end">
            <button class="text-textcolor2 hover:text-green-500 mr-2 cursor-pointer" onclick={async (e) => {
                exportColorScheme()
            }}>
                <DownloadIcon size={18}/>
            </button>
            <button class="text-textcolor2 hover:text-green-500 cursor-pointer" onclick={async (e) => {
                importColorScheme()
            }}>
                <HardDriveUploadIcon size={18}/>
            </button>
        </div>
    </div>
    {/if}

    <span class="text-textcolor mt-4">{language.textColor}</span>
    <SelectInput className="mt-2" bind:value={DBState.db.textTheme} onchange={updateTextThemeAndCSS}>
        <OptionInput value="standard" >{language.classicRisu}</OptionInput>
        <OptionInput value="highcontrast" >{language.highcontrast}</OptionInput>
        <OptionInput value="custom" >Custom</OptionInput>
    </SelectInput>

    {#if DBState.db.textTheme === "custom"}
        <div class="flex items-center mt-2">
            <ColorInput bind:value={DBState.db.customTextTheme.FontColorStandard} oninput={updateTextThemeAndCSS} />
            <span class="ml-2">Normal Text</span>
        </div>
        <div class="flex items-center mt-2">
            <ColorInput bind:value={DBState.db.customTextTheme.FontColorItalic} oninput={updateTextThemeAndCSS} />
            <span class="ml-2">Italic Text</span>
        </div>
        <div class="flex items-center mt-2">
            <ColorInput bind:value={DBState.db.customTextTheme.FontColorBold} oninput={updateTextThemeAndCSS} />
            <span class="ml-2">Bold Text</span>
        </div>
        <div class="flex items-center mt-2">
            <ColorInput bind:value={DBState.db.customTextTheme.FontColorItalicBold} oninput={updateTextThemeAndCSS} />
            <span class="ml-2">Italic Bold Text</span>
        </div>
        <div class="flex items-center mt-2">
            <ColorInput nullable bind:value={DBState.db.customTextTheme.FontColorQuote1} oninput={updateTextThemeAndCSS} />
            <span class="ml-2">Single Quote Text</span>
        </div>
        <div class="flex items-center mt-2">
            <ColorInput nullable bind:value={DBState.db.customTextTheme.FontColorQuote2} oninput={updateTextThemeAndCSS} />
            <span class="ml-2">Double Quote Text</span>
        </div>
    {/if}

    <span class="text-textcolor mt-4">{language.font}</span>
    <SelectInput className="mt-2" bind:value={DBState.db.font} onchange={updateTextThemeAndCSS}>
        <OptionInput value="default" >Default</OptionInput>
        <OptionInput value="timesnewroman" >Times New Roman</OptionInput>
        <OptionInput value="custom" >Custom</OptionInput>
    </SelectInput>

    {#if DBState.db.font === "custom"}
        <TextInput bind:value={DBState.db.customFont} onchange={updateTextThemeAndCSS} />
    {/if}

{/if}

{#if submenu === 1 || submenu === -1}

    <span class="text-textcolor mt-4">{language.UISize}</span>
    <SliderInput  min={50} max={200} bind:value={DBState.db.zoomsize} marginBottom/>

    <span class="text-textcolor">{language.lineHeight}</span>
    <SliderInput  min={0.5} max={3} step={0.05} fixed={2} bind:value={DBState.db.lineHeight} marginBottom/>

    <span class="text-textcolor">{language.iconSize}</span>
    <SliderInput min={50} max={200} bind:value={DBState.db.iconsize} marginBottom/>

    <span class="text-textcolor">{language.textAreaSize}</span>
    <SliderInput min={-5} max={5} bind:value={DBState.db.textAreaSize} onchange={updateGuisize} customText={guiSizeText(DBState.db.textAreaSize)} marginBottom/>

    <span class="text-textcolor">{language.textAreaTextSize}</span>
    <SliderInput min={0} max={3} bind:value={DBState.db.textAreaTextSize} onchange={updateGuisize} customText={guiSizeText(DBState.db.textAreaTextSize)} marginBottom/>

    <span class="text-textcolor">{language.sideBarSize}</span>
    <SliderInput min={0} max={3} bind:value={DBState.db.sideBarSize} onchange={updateGuisize} customText={guiSizeText(DBState.db.sideBarSize)} marginBottom/>

    <span class="text-textcolor">{language.assetWidth}</span>
    <SliderInput min={-1} max={40} step={1} bind:value={DBState.db.assetWidth} customText={
        (DBState.db.assetWidth === -1) ? "Unlimited" : 
        (DBState.db.assetWidth === 0) ? "Hidden" : (`${(DBState.db.assetWidth).toFixed(1)} rem`)
    } marginBottom />

    <span class="text-textcolor">{language.animationSpeed}</span>
    <SliderInput min={0} max={1} step={0.05} fixed={2} bind:value={DBState.db.animationSpeed} onchange={updateAnimationSpeed} marginBottom />

    {#if DBState.db.showMemoryLimit}
        <span class="text-textcolor">{language.memoryLimitThickness}</span>
        <SliderInput min={1} max={500} step={1} bind:value={DBState.db.memoryLimitThickness} marginBottom />
    {/if}

    <span class="text-textcolor">{language.settingsCloseButtonSize} <Help key="settingsCloseButtonSize"/></span>
    <SliderInput min={16} max={48} step={1} bind:value={DBState.db.settingsCloseButtonSize} marginBottom />

{/if}

{#if submenu === 2 || submenu === -1}

    <div class="flex items-center mt-2">
        <Check bind:check={DBState.db.fullScreen} onChange={changeFullscreen} name={language.fullscreen}/>
    </div>

    <div class="flex items-center mt-2">
        <Check bind:check={DBState.db.showMemoryLimit} name={language.showMemoryLimit}/>
    </div>

    <div class="flex items-center mt-2">
        <Check bind:check={DBState.db.showFirstMessagePages} name={language.showFirstMessagePages}/>
    </div>

    <div class="flex items-center mt-2">
        <Check bind:check={DBState.db.hideRealm} name={language.hideRealm}/>
    </div>

    <div class="flex items-center mt-2">
        <Check bind:check={DBState.db.showFolderName} name={language.showFolderNameInIcon}/>
    </div>

    <div class="flex items-center mt-2">
        <Check check={DBState.db.customBackground !== ''} onChange={async (check) => {
            if(check){
                DBState.db.customBackground = '-'
                const d = await selectSingleFile(['png', 'webp', 'gif'])
                if(!d){
                    DBState.db.customBackground = ''
                    return
                }
                const img = await saveImage(d.data)
                DBState.db.customBackground = img
            }
            else{
                DBState.db.customBackground = ''
            }
        }} name={language.useCustomBackground}></Check>
    </div>

    <div class="flex items-center mt-2">
        <Check bind:check={DBState.db.playMessage} name={language.playMessage}/>
        <span> <Help key="msgSound" name={language.playMessage}/></span>
    </div>

    <div class="flex items-center mt-2">
        <Check bind:check={DBState.db.playMessageOnTranslateEnd } name={language.playMessageOnTranslateEnd}/>
    </div>

    <div class="flex items-center mt-2">
        <Check bind:check={DBState.db.roundIcons} name={language.roundIcons}/>
    </div>

    {#if DBState.db.textScreenColor}
        <div class="flex items-center mt-2">
            <Check check={true} onChange={() => {
                DBState.db.textScreenColor = null
            }} name={language.textBackgrounds} hiddenName/>
            <input type="color" class="style2 text-sm mr-2" bind:value={DBState.db.textScreenColor} >
            <span>{language.textBackgrounds}</span>
        </div>
    {:else}
        <div class="flex items-center mt-2">
            <Check check={false} onChange={() => {
                DBState.db.textScreenColor = "#121212"
            }} name={language.textBackgrounds}/>
        </div>


    {/if}

    <div class="flex items-center mt-2">
        <Check bind:check={DBState.db.textBorder} name={language.textBorder}/>
    </div>


    <div class="flex items-center mt-2">
        <Check bind:check={DBState.db.textScreenRounded} name={language.textScreenRound}/>
    </div>

    <div class="flex items-center mt-2">
        <Check bind:check={DBState.db.showSavingIcon} name={language.showSavingIcon}/>
    </div>

    <div class="flex items-center mt-2">
        <Check bind:check={DBState.db.showPromptComparison} name={language.showPromptComparison}/>
    </div>

    {#if DBState.db.textScreenBorder}
        <div class="flex items-center mt-2">
            <Check check={true} onChange={() => {
                DBState.db.textScreenBorder = null
            }} name={language.textScreenBorder} hiddenName/>
            <input type="color" class="style2 text-sm mr-2" bind:value={DBState.db.textScreenBorder} >
            <span>{language.textScreenBorder}</span>
        </div>
    {:else}
        <div class="flex items-center mt-2">
            <Check check={false} onChange={() => {
                DBState.db.textScreenBorder = "#121212"
            }} name={language.textScreenBorder}/>
        </div>
    {/if}

    <div class="flex items-center mt-2">
        <Check bind:check={DBState.db.useChatCopy} name={language.useChatCopy}/>
    </div>

    <!-- <div class="flex items-center mt-2">
        <Check bind:check={DBState.db.logShare} name={language.logShare}/>
    </div> -->

    <div class="flex items-center mt-2">
        <Check bind:check={DBState.db.useAdditionalAssetsPreview} name={language.useAdditionalAssetsPreview}/>
    </div>

    <div class="flex items-center mt-2">
        <Check bind:check={DBState.db.useLegacyGUI} name={language.useLegacyGUI}/>
    </div>

    <div class="flex items-center mt-2">
        <Check bind:check={DBState.db.hideApiKey} name={language.hideApiKeys}/>
    </div>

    <div class="flex items-center mt-2">
        <Check bind:check={DBState.db.unformatQuotes} name={language.unformatQuotes}/>
    </div>

    <div class="flex items-center mt-2">
        <Check bind:check={DBState.db.customQuotes} name={language.customQuotes}/>
    </div>

    {#if DBState.db.customQuotes}
        <span class="text-textcolor mt-4">{language.leadingDoubleQuote}</span>
        <TextInput bind:value={DBState.db.customQuotesData[0]} />

        <span class="text-textcolor mt-4">{language.trailingDoubleQuote}</span>
        <TextInput bind:value={DBState.db.customQuotesData[1]} />

        <span class="text-textcolor mt-4">{language.leadingSingleQuote}</span>
        <TextInput bind:value={DBState.db.customQuotesData[2]} />

        <span class="text-textcolor mt-4">{language.trailingSingleQuote}</span>
        <TextInput bind:value={DBState.db.customQuotesData[3]} />
    {/if}

    <div class="flex items-center mt-2">
        <Check bind:check={DBState.db.betaMobileGUI} name={language.betaMobileGUI}/>
        <Help key="betaMobileGUI"/>
    </div>

    <div class="flex items-center mt-2">
        <Check bind:check={DBState.db.menuSideBar} name={language.menuSideBar}/>
    </div>

    <div class="flex items-center mt-2">
        <Check bind:check={DBState.db.notification} name={language.notification} onChange={async (e) => {
            let hasPermission = {state: 'denied'}
            try {
                hasPermission = await navigator.permissions.query({name: 'notifications'})                
            } catch (error) {
                //for browsers that do not support permissions api
            }
            if(!DBState.db.notification){
                return
            }
            if(hasPermission.state === 'denied'){
                const permission = await Notification.requestPermission()
                if(permission === 'denied'){
                    alertError(language.permissionDenied)
                    DBState.db.notification = false
                }
            }
        }}/>
    </div>

    {#if DBState.db.showUnrecommended}
        <div class="flex items-center mt-2">
            <Check bind:check={DBState.db.useChatSticker} name={language.useChatSticker}/>
            <Help key="unrecommended" name={language.useChatSticker} unrecommended/>
        </div>

        <div class="flex items-center mt-2">
            <Check bind:check={DBState.db.useAdvancedEditor} name={language.useAdvancedEditor}/>
            <Help key="unrecommended" unrecommended/>
        </div>    
    {/if}

    <span class="text-textcolor mt-4">{language.customCSS}<Help key="customCSS" /></span>
    <TextAreaInput bind:value={DBState.db.customCSS} onInput={() => {
        updateTextThemeAndCSS()
    }} />

{/if}