<script>
    import { ActivityIcon, Bot, CodeIcon, FolderIcon, LayoutDashboardIcon, MonitorIcon, PlusIcon, TrashIcon, UserIcon } from "lucide-svelte";
    import { tokenize } from "../../ts/tokenizer";
    import { DataBase, saveImage, updateTextTheme } from "../../ts/database";
    import DropList from "./DropList.svelte";
    import { changeLanguage, language } from "../../lang";
    import { getCharImage, selectUserImg } from "../../ts/characters";
    import { changeFullscreen, selectSingleFile, sleep } from "../../ts/util";
    import { customProviderStore, getCurrentPluginMax, importPlugin } from "../../ts/process/plugins";
    import { alertConfirm, alertMd } from "../../ts/alert";
    import Check from "../Others/Check.svelte";
    import { getRequestLog, isTauri } from "../../ts/globalApi";
    import { checkDriver } from "../../ts/drive/drive";
    import Help from "../Others/Help.svelte";
    let subMenu = -1
    let subSubMenu = 0
    export let openPresetList =false

    let tokens = {
        mainPrompt: 0,
        jailbreak: 0,
        globalNote: 0
    }

    let lasttokens = {
        mainPrompt: '',
        jailbreak: '',
        globalNote: ''
    }

    async function loadTokenize(){
        if(lasttokens.mainPrompt !== $DataBase.mainPrompt){
            lasttokens.mainPrompt = $DataBase.mainPrompt
            tokens.mainPrompt = await tokenize($DataBase.mainPrompt)
        }
        tokens.mainPrompt = await tokenize($DataBase.mainPrompt)
        tokens.jailbreak = await tokenize($DataBase.jailbreak)
        tokens.globalNote = await tokenize($DataBase.globalNote)
    }
    
    $: loadTokenize()
</script>

<div class="flex gap-2 mb-2">
    <button class={subMenu === -1 ? 'text-gray-200' : 'text-gray-500 cursor-pointer'} on:click={() => {subMenu = -1}}>
        <UserIcon />
    </button>
    <button class={subMenu === 0 ? 'text-gray-200' : 'text-gray-500 cursor-pointer'} on:click={() => {subMenu = 0}}>
        <Bot />
    </button>
    <button class={subMenu === 3 ? 'text-gray-200' : 'text-gray-500 cursor-pointer'} on:click={() => {subMenu = 3}}>
        <MonitorIcon />
    </button>
    <button class={subMenu === 2 ? 'text-gray-200' : 'text-gray-500 cursor-pointer'} on:click={() => {subMenu = 2}}>
        <CodeIcon />
    </button>
    <button class={subMenu === 4 ? 'text-gray-200' : 'text-gray-500 cursor-pointer'} on:click={() => {subMenu = 4}}>
        <FolderIcon />
    </button>
    <button class={subMenu === 1 ? 'text-gray-200' : 'text-gray-500 cursor-pointer'} on:click={() => {subMenu = 1}}>
        <ActivityIcon />
    </button>
</div>

{#if subMenu === -1}
    <h2 class="mb-2 text-2xl font-bold mt-2">{language.userSetting}</h2>
    <span class="text-neutral-200 mt-2 mb-2">{language.userIcon}</span>
    <button on:click={() => {selectUserImg()}}>
        {#if $DataBase.userIcon === ''}
            <div class="rounded-md h-32 w-32 shadow-lg bg-gray-500 cursor-pointer hover:text-green-500" />
        {:else}
            {#await getCharImage($DataBase.userIcon, 'css')}
                <div class="rounded-md h-32 w-32 shadow-lg bg-gray-500 cursor-pointer hover:text-green-500" />
            {:then im} 
                <div class="rounded-md h-32 w-32 shadow-lg bg-gray-500 cursor-pointer hover:text-green-500" style={im} />                
            {/await}
        {/if}
    </button>
    <span class="text-neutral-200 mt-4">{language.username}</span>
    <input class="text-neutral-200 mt-2 mb-4 p-2 bg-transparent input-text focus:bg-selected" placeholder="User" bind:value={$DataBase.username}>
    
{:else if subMenu === 0 && subSubMenu === 0}
    <h2 class="mb-2 text-2xl font-bold mt-2">{language.botSettings}</h2>
    <div class="flex w-full mb-2">
        <button on:click={() => {
            subSubMenu = 0
        }} class="flex-1 border-solid border-borderc border-1 p-2 flex justify-center cursor-pointer" class:bg-selected={subSubMenu === 0}>
            <span>{language.Chat}</span>
        </button>
        <button on:click={() => {
            subSubMenu = 1
        }} class="flex-1 border-solid border-borderc border-1 border-l-transparent p-2 flex justify-center cursor-pointer">
            <span>{language.others}</span>
        </button>
    </div>
    <span class="text-neutral-200 mt-4">{language.model} <Help key="model"/></span>
    <select class="bg-transparent input-text mt-2 mb-2 text-gray-200 appearance-none text-sm" bind:value={$DataBase.aiModel}>
        <option value="gpt35" class="bg-darkbg appearance-none">OpenAI GPT-3.5</option>
        <option value="gpt4" class="bg-darkbg appearance-none">OpenAI GPT-4</option>
        <option value="textgen_webui" class="bg-darkbg appearance-none">Text Generation WebUI</option>
        {#if $DataBase.plugins.length > 0}
            <option value="custom" class="bg-darkbg appearance-none">Plugin</option>
        {/if}
    </select>

    <span class="text-neutral-200 mt-2">{language.submodel} <Help key="submodel"/></span>
    <select class="bg-transparent input-text mt-2 mb-4 text-gray-200 appearance-none text-sm" bind:value={$DataBase.subModel}>
        <option value="gpt35" class="bg-darkbg appearance-none">OpenAI GPT-3.5</option>
        <option value="gpt4" class="bg-darkbg appearance-none">OpenAI GPT-4</option>
        <option value="textgen_webui" class="bg-darkbg appearance-none">Text Generation WebUI</option>
        {#if $customProviderStore.length > 0}
            <option value="custom" class="bg-darkbg appearance-none">Plugin</option>
        {/if}
    </select>

    {#if $DataBase.aiModel === 'gpt35' || $DataBase.aiModel === 'gpt4' || $DataBase.subModel === 'gpt4' || $DataBase.subModel === 'gpt35'}
        <span class="text-neutral-200">OpenAI {language.apiKey} <Help key="oaiapikey"/></span>
        <input class="text-neutral-200 mb-4 p-2 bg-transparent input-text focus:bg-selected text-sm" placeholder="sk-XXXXXXXXXXXXXXXXXXXX" bind:value={$DataBase.openAIKey}>
    {/if}
    {#if $DataBase.aiModel === 'custom'}
        <span class="text-neutral-200 mt-2">{language.plugin}</span>
        <select class="bg-transparent input-text mt-2 mb-4 text-gray-200 appearance-none text-sm" bind:value={$DataBase.currentPluginProvider}>
            <option value="" class="bg-darkbg appearance-none">None</option>
            {#each $customProviderStore as plugin}
                <option value={plugin} class="bg-darkbg appearance-none">{plugin}</option>
            {/each}
        </select>
    {/if}
    {#if $DataBase.aiModel === 'textgen_webui' || $DataBase.subModel === 'textgen_webui'}
        <span class="text-neutral-200">TextGen {language.providerURL} <Help key="oogaboogaURL"/></span>
        <input class="text-neutral-200 mb-4 p-2 bg-transparent input-text focus:bg-selected" placeholder="https://..." bind:value={$DataBase.textgenWebUIURL}>
        <span class="text-draculared text-xs mb-2">You must use WebUI without agpl license or use unmodified version with agpl license to observe the contents of the agpl license.</span>
        <span class="text-draculared text-xs mb-2">You must use textgen webui with --no-stream and without --cai-chat or --chat</span>
        {#if !isTauri}
            <span class="text-draculared text-xs mb-2">You are using web version. you must use ngrok or other tunnels to use your local webui.</span>
        {/if}
    {/if}
    <span class="text-neutral-200">{language.mainPrompt} <Help key="mainprompt"/></span>
    <textarea class="bg-transparent input-text mt-2 mb-2 text-gray-200 resize-none h-20 focus:bg-selected text-xs" autocomplete="off" bind:value={$DataBase.mainPrompt}></textarea>
    <span class="text-gray-400 mb-6 text-sm">{tokens.mainPrompt} {language.tokens}</span>
    <span class="text-neutral-200">{language.jailbreakPrompt} <Help key="jailbreak"/></span>
    <textarea class="bg-transparent input-text mt-2 mb-2 text-gray-200 resize-none h-20 focus:bg-selected text-xs" autocomplete="off" bind:value={$DataBase.jailbreak}></textarea>
    <span class="text-gray-400 mb-6 text-sm">{tokens.jailbreak} {language.tokens}</span>
    <span class="text-neutral-200">{language.globalNote} <Help key="globalNote"/></span>
    <textarea class="bg-transparent input-text mt-2 mb-2 text-gray-200 resize-none h-20 focus:bg-selected text-xs" autocomplete="off" bind:value={$DataBase.globalNote}></textarea>
    <span class="text-gray-400 mb-6 text-sm">{tokens.globalNote} {language.tokens}</span>
    <span class="text-neutral-200">{language.maxContextSize}</span>
    {#if $DataBase.aiModel === 'gpt35'}
        <input class="text-neutral-200 mb-4 text-sm p-2 bg-transparent input-text focus:bg-selected" type="number" min={0} max="4000" bind:value={$DataBase.maxContext}>
    {:else if $DataBase.aiModel === 'gpt4' || $DataBase.aiModel === 'textgen_webui'}
        <input class="text-neutral-200 mb-4 text-sm p-2 bg-transparent input-text focus:bg-selected" type="number" min={0} max="8000" bind:value={$DataBase.maxContext}>
    {:else if $DataBase.aiModel === 'custom'}
        <input class="text-neutral-200 mb-4 text-sm p-2 bg-transparent input-text focus:bg-selected" type="number" min={0} max={getCurrentPluginMax($DataBase.currentPluginProvider)} bind:value={$DataBase.maxContext}>
    {/if}
    <span class="text-neutral-200">{language.maxResponseSize}</span>
    <input class="text-neutral-200 mb-4 p-2 bg-transparent input-text focus:bg-selected text-sm" type="number" min={0} max="2048" bind:value={$DataBase.maxResponse}>
    <span class="text-neutral-200">{language.temperature} <Help key="tempature"/></span>
    <input class="text-neutral-200 p-2 bg-transparent input-text focus:bg-selected" type="range" min="0" max="200" bind:value={$DataBase.temperature}>
    <span class="text-gray-400 mb-6 text-sm">{($DataBase.temperature / 100).toFixed(2)}</span>
    <span class="text-neutral-200">{language.frequencyPenalty} <Help key="frequencyPenalty"/></span>
    <input class="text-neutral-200 p-2 bg-transparent input-text focus:bg-selected" type="range" min="0" max="100" bind:value={$DataBase.frequencyPenalty}>
    <span class="text-gray-400 mb-6 text-sm">{($DataBase.frequencyPenalty / 100).toFixed(2)}</span>
    <span class="text-neutral-200">{language.presensePenalty} <Help key="presensePenalty"/></span>
    <input class="text-neutral-200 p-2 bg-transparent input-text focus:bg-selected" type="range" min="0" max="100" bind:value={$DataBase.PresensePenalty}>
    <span class="text-gray-400 mb-6 text-sm">{($DataBase.PresensePenalty / 100).toFixed(2)}</span>

    <span class="text-neutral-200 mt-2">{language.forceReplaceUrl} <Help key="forceUrl"/></span>
    <input class="text-neutral-200 p-2 bg-transparent input-text focus:bg-selected text-sm"bind:value={$DataBase.forceReplaceUrl} placeholder="Leave blank to not replace url">
    <span class="text-neutral-200 mt-2">{language.submodel} {language.forceReplaceUrl} <Help key="forceUrl"/></span>
    <input class="text-neutral-200 p-2 bg-transparent input-text focus:bg-selected text-sm"bind:value={$DataBase.forceReplaceUrl2} placeholder="Leave blank to not replace url">



    <details class="mt-4">
        <summary class="mb-2">{language.advancedSettings}</summary>
        <span class="text-neutral-200 mb-2 mt-4">{language.formatingOrder} <Help key="formatOrder"/></span>
        <DropList bind:list={$DataBase.formatingOrder} />
        <span class="text-neutral-200 mt-2">Bias <Help key="bias"/></span>
        <table class="contain w-full max-w-full tabler mt-2">
            <tr>
                <th class="font-medium w-1/2">Bias</th>
                <th class="font-medium w-1/3">{language.value}</th>
                <th class="font-medium cursor-pointer hover:text-green-500" on:click={() => {
                        let bia = $DataBase.bias
                        bia.push(['', 0])
                        $DataBase.bias = bia
                }}><PlusIcon /></th>
            </tr>
            {#if $DataBase.bias.length === 0}
                <tr>
                    <div class="text-gray-500">{language.noBias}</div>
                </tr>
            {/if}
            {#each $DataBase.bias as bias, i}
                <tr>
                    <td class="font-medium truncate w-1/2">
                        <input class="text-neutral-200 mt-2 mb-4 p-2 bg-transparent input-text focus:bg-selected" bind:value={$DataBase.bias[i][0]} placeholder="string">
                    </td>
                    <td class="font-medium truncate w-1/3">
                        <input class="text-neutral-200 mt-2 mb-4 w-full p-2 bg-transparent input-text focus:bg-selected" bind:value={$DataBase.bias[i][1]} type="number" max="100" min="-100">
                    </td>
                    <button class="font-medium flex justify-center items-center h-full cursor-pointer hover:text-green-500" on:click={() => {
                        let bia = $DataBase.bias
                        bia.splice(i, 1)
                        $DataBase.bias = bia
                    }}><TrashIcon /></button>
                </tr>
            {/each}
        </table>
    
        <div class="flex items-center mt-4">
            <Check bind:check={$DataBase.promptPreprocess}/>
            <span>{language.promptPreprocess}</span>
        </div>
    </details>

    <button on:click={() => {openPresetList = true}} class="mt-4 drop-shadow-lg p-3 border-borderc border-solid flex justify-center items-center ml-2 mr-2 border-1 hover:bg-selected">{language.presets}</button>


{:else if subMenu === 0 && subSubMenu === 1}
    <h2 class="mb-2 text-2xl font-bold mt-2">{language.botSettings}</h2>
    <div class="flex w-full mb-2">
        <button on:click={() => {
            subSubMenu = 0
        }} class="flex-1 border-solid border-borderc border-1 p-2 flex justify-center cursor-pointer">
            <span>{language.Chat}</span>
        </button>
        <button on:click={() => {
            subSubMenu = 1
        }} class="flex-1 border-solid border-borderc border-1 border-l-transparent p-2 flex justify-center cursor-pointer" class:bg-selected={subSubMenu === 1}>
            <span>{language.others}</span>
        </button>
    </div>
    <span class="text-neutral-200 mt-4 text-lg font-bold">{language.imageGeneration}</span>

    <span class="text-neutral-200 mt-2">{language.provider} <Help key="sdProvider"/></span>
    <select class="bg-transparent input-text mt-2 mb-4 text-gray-200 appearance-none text-sm" bind:value={$DataBase.sdProvider}>
        <option value="" class="bg-darkbg appearance-none">None</option>
        <option value="webui" class="bg-darkbg appearance-none">Stable Diffusion WebUI</option>
        <!-- TODO -->
        <!-- <option value="runpod" class="bg-darkbg appearance-none">Runpod Serverless</option> -->
    </select>
    
    {#if $DataBase.sdProvider === 'webui'}
    <span class="text-draculared text-xs mb-2">You must use WebUI with --api flag</span>
        <span class="text-draculared text-xs mb-2">You must use WebUI without agpl license or use unmodified version with agpl license to observe the contents of the agpl license.</span>
        {#if !isTauri}
            <span class="text-draculared text-xs mb-2">You are using web version. you must use ngrok or other tunnels to use your local webui.</span>
        {/if}
        <span class="text-neutral-200 mt-2">WebUI {language.providerURL}</span>
        <input class="text-neutral-200 mb-4 p-2 bg-transparent input-text focus:bg-selected text-sm" placeholder="https://..." bind:value={$DataBase.webUiUrl}>
        <span class="text-neutral-200">Steps</span>
        <input class="text-neutral-200 mb-4 p-2 bg-transparent input-text focus:bg-selected text-sm" type="number" min={0} max="100" bind:value={$DataBase.sdSteps}>
        
        <span class="text-neutral-200">CFG Scale</span>
        <input class="text-neutral-200 mb-4 p-2 bg-transparent input-text focus:bg-selected text-sm" type="number" min={0} max="20" bind:value={$DataBase.sdCFG}>

        <span class="text-neutral-200">Width</span>
        <input class="text-neutral-200 mb-4 p-2 bg-transparent input-text focus:bg-selected text-sm" type="number" min={0} max="2048" bind:value={$DataBase.sdConfig.width}>
        <span class="text-neutral-200">Height</span>
        <input class="text-neutral-200 mb-4 p-2 bg-transparent input-text focus:bg-selected text-sm" type="number" min={0} max="2048" bind:value={$DataBase.sdConfig.height}>
        <span class="text-neutral-200">Sampler</span>
        <input class="text-neutral-200 mb-4 p-2 bg-transparent input-text focus:bg-selected text-sm" bind:value={$DataBase.sdConfig.sampler_name}>
        
        <div class="flex items-center mt-2">
            <Check bind:check={$DataBase.sdConfig.enable_hr}/>
            <span>Enable Hires</span>
        </div>
        {#if $DataBase.sdConfig.enable_hr === true}
            <span class="text-neutral-200">denoising_strength</span>
            <input class="text-neutral-200 mb-4 p-2 bg-transparent input-text focus:bg-selected text-sm" type="number" min={0} max="10" bind:value={$DataBase.sdConfig.denoising_strength}>
            <span class="text-neutral-200">hr_scale</span>
            <input class="text-neutral-200 mb-4 p-2 bg-transparent input-text focus:bg-selected text-sm" type="number" min={0} max="10" bind:value={$DataBase.sdConfig.hr_scale}>
            <span class="text-neutral-200">Upscaler</span>
            <input class="text-neutral-200 mb-4 p-2 bg-transparent input-text focus:bg-selected text-sm" bind:value={$DataBase.sdConfig.hr_upscaler}>
        {/if}
    {/if}


    <span class="text-neutral-200 mt-4 text-lg font-bold">TTS</span>
    <span class="text-neutral-200 mt-2">ElevenLabs API key</span>
    <input class="text-neutral-200 mb-4 p-2 bg-transparent input-text focus:bg-selected text-sm" bind:value={$DataBase.elevenLabKey}>

    
{:else if subMenu == 3}
    <h2 class="mb-2 text-2xl font-bold mt-2">{language.display}</h2>
    <span class="text-neutral-200 mt-4">{language.UiLanguage}</span>
    <select class="bg-transparent input-text mt-2 text-gray-200 appearance-none text-sm" bind:value={$DataBase.language} on:change={async () => {
        await sleep(10)
        changeLanguage($DataBase.language)
        subMenu = -1
    }}>
        <option value="en" class="bg-darkbg appearance-none">English</option>
        <option value="ko" class="bg-darkbg appearance-none">한국어</option>
    </select>

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


    <span class="text-neutral-200 mt-4">{language.translator}</span>
    <select class="bg-transparent input-text mt-2 mb-4 text-gray-200 appearance-none text-sm" bind:value={$DataBase.translator}>
        <option value="" class="bg-darkbg appearance-none">{language.disabled}</option>
        <option value="ko" class="bg-darkbg appearance-none">한국어</option>
    </select>
    <span class="text-neutral-200">{language.UISize}</span>
    <input class="text-neutral-200 p-2 bg-transparent input-text focus:bg-selected" type="range" min="50" max="200" bind:value={$DataBase.zoomsize}>
    <span class="text-gray-400 mb-6 text-sm">{($DataBase.zoomsize)}%</span>

    <span class="text-neutral-200">{language.iconSize}</span>
    <input class="text-neutral-200 p-2 bg-transparent input-text focus:bg-selected" type="range" min="50" max="200" bind:value={$DataBase.iconsize}>
    <span class="text-gray-400 mb-6 text-sm">{($DataBase.iconsize)}%</span>

    <div class="flex items-center mt-2">
        <Check bind:check={$DataBase.autoTranslate} />
        <span>{language.autoTranslation}</span>
    </div>
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
        <Check bind:check={$DataBase.swipe}/>
        <span>{language.SwipeRegenerate}</span>
    </div>

    <div class="flex items-center mt-2">
        <Check bind:check={$DataBase.roundIcons}/>
        <span>{language.roundIcons}</span>
    </div>

    <div class="flex items-center mt-2">
        <Check bind:check={$DataBase.instantRemove}/>
        <span>{language.instantRemove}</span>
    </div>

{:else if subMenu === 2}
    <h2 class="mb-2 text-2xl font-bold mt-2">{language.plugin}</h2>
    <span class="text-draculared text-xs mb-4">{language.pluginWarn}</span>


    <div class="border-solid border-borderc p-2 flex flex-col border-1">
        {#if $DataBase.plugins.length === 0}
            <span class="text-gray-500">No Plugins</span>
        {:else}
            {#each $DataBase.plugins as plugin, i}
                {#if i !== 0}
                    <div class="border-borderc mt-2 mb-2 w-full border-solid border-b-1 seperator"></div>
                {/if}
                    <div class="flex">
                        <span class="font-bold flex-grow">{plugin.displayName ?? plugin.name}</span>
                        <button class="gray-500 hover:gray-200 cursor-pointer" on:click={async () => {
                            const v = await alertConfirm(language.removeConfirm + (plugin.displayName ?? plugin.name))
                            if(v){
                                if($DataBase.currentPluginProvider === plugin.name){
                                    $DataBase.currentPluginProvider  = ''
                                }
                                let plugins = $DataBase.plugins
                                plugins.splice(i, 1)
                                $DataBase.plugins = plugins
                            }
                        }}>
                            <TrashIcon />
                        </button>
                    </div>
                    {#if Object.keys(plugin.arguments).length > 0}
                        <div class="flex flex-col mt-2 bg-dark-900 bg-opacity-50 p-3">
                            {#each Object.keys(plugin.arguments) as arg}
                                <span>{arg}</span>
                                {#if Array.isArray(plugin.arguments[arg])}
                                    <select class="bg-transparent input-text mt-2 mb-4 text-gray-200 appearance-none" bind:value={$DataBase.plugins[i].realArg[arg]}>
                                        {#each plugin.arguments[arg] as a}
                                            <option value={a} class="bg-darkbg appearance-none">a</option>
                                        {/each}
                                    </select>
                                {:else if plugin.arguments[arg] === 'string'}
                                    <input class="text-neutral-200 p-2 bg-transparent input-text focus:bg-selected" bind:value={$DataBase.plugins[i].realArg[arg]}>
                                {:else if plugin.arguments[arg] === 'int'}
                                    <input class="text-neutral-200 p-2 bg-transparent input-text focus:bg-selected" type="number" bind:value={$DataBase.plugins[i].realArg[arg]}>
                                {/if}
                            {/each}
                        </div>
                    {/if}
            {/each}
        {/if}
    </div>
    <div class="text-gray-500 mt-2 flex">
        <button on:click={() => {
            importPlugin()  
        }} class="hover:text-neutral-200 cursor-pointer">
            <PlusIcon />
        </button>
    </div>
{:else if subMenu === 1}
    <h2 class="text-2xl font-bold mt-2">{language.advancedSettings}</h2>
    <span class="text-draculared text-xs mb-2">{language.advancedSettingsWarn}</span>
    <span class="text-neutral-200 mt-4 mb-2">{language.loreBookDepth}</span>
    <input class="text-neutral-200 mb-4 p-2 bg-transparent input-text focus:bg-selected text-sm" type="number" min={0} max="20" bind:value={$DataBase.loreBookDepth}>
    <span class="text-neutral-200">{language.loreBookToken}</span>
    <input class="text-neutral-200 mb-4 p-2 bg-transparent input-text focus:bg-selected text-sm" type="number" min={0} max="4096" bind:value={$DataBase.loreBookToken}>

    <span class="text-neutral-200">{language.additionalPrompt}</span>
    <input class="text-neutral-200 mb-4 p-2 bg-transparent input-text focus:bg-selected text-sm"bind:value={$DataBase.additionalPrompt}>

    <span class="text-neutral-200">{language.descriptionPrefix}</span>
    <input class="text-neutral-200 mb-4 p-2 bg-transparent input-text focus:bg-selected text-sm"bind:value={$DataBase.descriptionPrefix}>

    <span class="text-neutral-200">{language.emotionPrompt}</span>
    <input class="text-neutral-200 mb-4 p-2 bg-transparent input-text focus:bg-selected text-sm"bind:value={$DataBase.emotionPrompt2} placeholder="Leave it blank to use default">

    <span class="text-neutral-200">{language.SuperMemory} Prompt <Help key="experimental"/></span>
    <input class="text-neutral-200 mb-4 p-2 bg-transparent input-text focus:bg-selected text-sm"bind:value={$DataBase.supaMemoryPrompt} placeholder="Leave it blank to use default">

    <span class="text-neutral-200">{language.requestretrys}</span>
    <input class="text-neutral-200 mb-4 p-2 bg-transparent input-text focus:bg-selected text-sm" type="number" min={0} max="20" bind:value={$DataBase.requestRetrys}>

    <span class="text-neutral-200">Request Method</span>
    <select class="bg-transparent input-text text-gray-200 appearance-none text-sm mb-4" bind:value={$DataBase.requestmet}>
        <option value="normal" class="bg-darkbg appearance-none">Normal</option>
        <option value="proxy" class="bg-darkbg appearance-none">Proxy</option>
        <option value="plain" class="bg-darkbg appearance-none">Plain Fetch</option>
    </select>

    {#if $DataBase.requestmet === 'proxy'}
        <span class="text-neutral-200">Request Proxy URL</span>
        <input class="text-neutral-200 mb-4 p-2 bg-transparent input-text focus:bg-selected text-sm" bind:value={$DataBase.requestproxy}>
    {/if}
    {#if isTauri && $DataBase.requestmet === 'normal'}
        <span class="text-neutral-200">Request Lib</span>
        <select class="bg-transparent input-text text-gray-200 appearance-none text-sm" bind:value={$DataBase.requester}>
            <option value="new" class="bg-darkbg appearance-none">Reqwest</option>
            <option value="old" class="bg-darkbg appearance-none">Tauri</option>
        </select>
    {/if}

    <div class="flex items-center mt-4">
        <Check bind:check={$DataBase.useSayNothing}/>
        <span>{language.sayNothing}</span>
    </div>
    <div class="flex items-center mt-4">
        <Check bind:check={$DataBase.showUnrecommended}/>
        <span>{language.showUnrecommended}</span>
    </div>
    <div class="flex items-center mt-4">
        <Check bind:check={$DataBase.useExperimental}/>
        <span>{language.useExperimental}</span>
    </div>
    <button
        on:click={async () => {
            alertMd(getRequestLog())
        }}
        class="drop-shadow-lg p-3 border-borderc border-solid mt-6 flex justify-center items-center ml-2 mr-2 border-1 hover:bg-selected text-sm">
        {language.ShowLog}
    </button>

{:else if subMenu === 4}
    <h2 class="mb-2 text-2xl font-bold mt-2">{language.files}</h2>

    <button
        on:click={async () => {
            if(await alertConfirm(language.backupConfirm)){
                localStorage.setItem('backup', 'save')
                if(isTauri){
                    checkDriver('savetauri')
                }
                else{
                    checkDriver('save')
                }
            }
        }}
        class="drop-shadow-lg p-3 border-borderc border-solid mt-2 flex justify-center items-center ml-2 mr-2 border-1 hover:bg-selected text-sm">
        {language.savebackup}
    </button>

    <button
        on:click={async () => {
            if((await alertConfirm(language.backupLoadConfirm)) && (await alertConfirm(language.backupLoadConfirm2))){
                localStorage.setItem('backup', 'load')
                if(isTauri){
                    checkDriver('loadtauri')
                }
                else{
                    checkDriver('load')
                }
            }
        }}
        class="drop-shadow-lg p-3 border-borderc border-solid mt-2 flex justify-center items-center ml-2 mr-2 border-1 hover:bg-selected text-sm">
        {language.loadbackup}
    </button>

{/if}

<style>
    .style2 {
        -webkit-appearance: none;
        -moz-appearance: none;
        appearance: none;
        background-color: transparent;
        width: 2rem;
        height: 2rem;
        border: none;
        cursor: pointer;
    }
    .style2::-webkit-color-swatch {
        border-radius: 0.5rem;
        border: 1px solid #6272a4;
    }
    .style2::-moz-color-swatch {
        border-radius: 0.5rem;
        border: 1pxs solid #6272a4;
    }
</style>