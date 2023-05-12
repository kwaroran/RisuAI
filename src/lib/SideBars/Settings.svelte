<script>
  import {
    ActivityIcon,
    Bot,
    CodeIcon,
    FolderIcon,
    LayoutDashboardIcon,
    MonitorIcon,
    PlusIcon,
    TrashIcon,
    UserIcon,
  } from "lucide-svelte";
  import { tokenize } from "../../ts/tokenizer";
  import { DataBase, saveImage, updateTextTheme } from "../../ts/database";
  import DropList from "./DropList.svelte";
  import { changeLanguage, language } from "../../lang";
  import { getCharImage, selectUserImg } from "../../ts/characters";
  import { changeFullscreen, selectSingleFile, sleep } from "../../ts/util";
  import {
    customProviderStore,
    getCurrentPluginMax,
    importPlugin,
  } from "../../ts/process/plugins";
  import { alertConfirm, alertMd } from "../../ts/alert";
  import Check from "../Others/Check.svelte";
  import { getRequestLog, isTauri } from "../../ts/globalApi";
  import { checkDriver } from "../../ts/drive/drive";
  import Help from "../Others/Help.svelte";
  let subMenu = -1;
  let subSubMenu = 0;
  export let openPresetList = false;

  let tokens = {
    mainPrompt: 0,
    jailbreak: 0,
    globalNote: 0,
  };

  let lasttokens = {
    mainPrompt: "",
    jailbreak: "",
    globalNote: "",
  };

  async function loadTokenize() {
    if (lasttokens.mainPrompt !== $DataBase.mainPrompt) {
      lasttokens.mainPrompt = $DataBase.mainPrompt;
      tokens.mainPrompt = await tokenize($DataBase.mainPrompt);
    }
    tokens.mainPrompt = await tokenize($DataBase.mainPrompt);
    tokens.jailbreak = await tokenize($DataBase.jailbreak);
    tokens.globalNote = await tokenize($DataBase.globalNote);
  }

  $: loadTokenize();
</script>

<div class="mb-2 flex gap-2">
  <button
    class={subMenu === -1 ? "text-gray-200" : "cursor-pointer text-gray-500"}
    on:click={() => {
      subMenu = -1;
    }}
  >
    <UserIcon />
  </button>
  <button
    class={subMenu === 0 ? "text-gray-200" : "cursor-pointer text-gray-500"}
    on:click={() => {
      subMenu = 0;
    }}
  >
    <Bot />
  </button>
  <button
    class={subMenu === 3 ? "text-gray-200" : "cursor-pointer text-gray-500"}
    on:click={() => {
      subMenu = 3;
    }}
  >
    <MonitorIcon />
  </button>
  <button
    class={subMenu === 2 ? "text-gray-200" : "cursor-pointer text-gray-500"}
    on:click={() => {
      subMenu = 2;
    }}
  >
    <CodeIcon />
  </button>
  <button
    class={subMenu === 4 ? "text-gray-200" : "cursor-pointer text-gray-500"}
    on:click={() => {
      subMenu = 4;
    }}
  >
    <FolderIcon />
  </button>
  <button
    class={subMenu === 1 ? "text-gray-200" : "cursor-pointer text-gray-500"}
    on:click={() => {
      subMenu = 1;
    }}
  >
    <ActivityIcon />
  </button>
</div>

{#if subMenu === -1}
  <h2 class="mb-2 mt-2 text-2xl font-bold">{language.userSetting}</h2>
  <span class="mb-2 mt-2 text-neutral-200">{language.userIcon}</span>
  <button
    on:click={() => {
      selectUserImg();
    }}
  >
    {#if $DataBase.userIcon === ""}
      <div
        class="h-32 w-32 cursor-pointer rounded-md bg-gray-500 shadow-lg hover:text-green-500"
      />
    {:else}
      {#await getCharImage($DataBase.userIcon, "css")}
        <div
          class="h-32 w-32 cursor-pointer rounded-md bg-gray-500 shadow-lg hover:text-green-500"
        />
      {:then im}
        <div
          class="h-32 w-32 cursor-pointer rounded-md bg-gray-500 shadow-lg hover:text-green-500"
          style={im}
        />
      {/await}
    {/if}
  </button>
  <span class="mt-4 text-neutral-200">{language.username}</span>
  <input
    class="input-text mb-4 mt-2 bg-transparent p-2 text-neutral-200 focus:bg-selected"
    placeholder="User"
    bind:value={$DataBase.username}
  />
{:else if subMenu === 0 && subSubMenu === 0}
  <h2 class="mb-2 mt-2 text-2xl font-bold">{language.botSettings}</h2>
  <div class="mb-2 flex w-full">
    <button
      on:click={() => {
        subSubMenu = 0;
      }}
      class="flex flex-1 cursor-pointer justify-center border-1 border-solid border-borderc p-2"
      class:bg-selected={subSubMenu === 0}
    >
      <span>{language.Chat}</span>
    </button>
    <button
      on:click={() => {
        subSubMenu = 1;
      }}
      class="flex flex-1 cursor-pointer justify-center border-1 border-solid border-borderc border-l-transparent p-2"
    >
      <span>{language.others}</span>
    </button>
  </div>
  <span class="mt-4 text-neutral-200"
    >{language.model} <Help key="model" /></span
  >
  <select
    class="input-text mb-2 mt-2 appearance-none bg-transparent text-sm text-gray-200"
    bind:value={$DataBase.aiModel}
  >
    <option value="gpt35" class="appearance-none bg-darkbg"
      >OpenAI GPT-3.5</option
    >
    <option value="gpt4" class="appearance-none bg-darkbg">OpenAI GPT-4</option>
    <option value="textgen_webui" class="appearance-none bg-darkbg"
      >Text Generation WebUI</option
    >
    {#if $DataBase.plugins.length > 0}
      <option value="custom" class="appearance-none bg-darkbg">Plugin</option>
    {/if}
  </select>

  <span class="mt-2 text-neutral-200"
    >{language.submodel} <Help key="submodel" /></span
  >
  <select
    class="input-text mb-4 mt-2 appearance-none bg-transparent text-sm text-gray-200"
    bind:value={$DataBase.subModel}
  >
    <option value="gpt35" class="appearance-none bg-darkbg"
      >OpenAI GPT-3.5</option
    >
    <option value="gpt4" class="appearance-none bg-darkbg">OpenAI GPT-4</option>
    <option value="textgen_webui" class="appearance-none bg-darkbg"
      >Text Generation WebUI</option
    >
    {#if $customProviderStore.length > 0}
      <option value="custom" class="appearance-none bg-darkbg">Plugin</option>
    {/if}
  </select>

  {#if $DataBase.aiModel === "gpt35" || $DataBase.aiModel === "gpt4" || $DataBase.subModel === "gpt4" || $DataBase.subModel === "gpt35"}
    <span class="text-neutral-200"
      >OpenAI {language.apiKey} <Help key="oaiapikey" /></span
    >
    <input
      class="input-text mb-4 bg-transparent p-2 text-sm text-neutral-200 focus:bg-selected"
      placeholder="sk-XXXXXXXXXXXXXXXXXXXX"
      bind:value={$DataBase.openAIKey}
    />
  {/if}
  {#if $DataBase.aiModel === "custom"}
    <span class="mt-2 text-neutral-200">{language.plugin}</span>
    <select
      class="input-text mb-4 mt-2 appearance-none bg-transparent text-sm text-gray-200"
      bind:value={$DataBase.currentPluginProvider}
    >
      <option value="" class="appearance-none bg-darkbg">None</option>
      {#each $customProviderStore as plugin}
        <option value={plugin} class="appearance-none bg-darkbg"
          >{plugin}</option
        >
      {/each}
    </select>
  {/if}
  {#if $DataBase.aiModel === "textgen_webui" || $DataBase.subModel === "textgen_webui"}
    <span class="text-neutral-200"
      >TextGen {language.providerURL} <Help key="oogaboogaURL" /></span
    >
    <input
      class="input-text mb-4 bg-transparent p-2 text-neutral-200 focus:bg-selected"
      placeholder="https://..."
      bind:value={$DataBase.textgenWebUIURL}
    />
    <span class="mb-2 text-xs text-draculared"
      >You must use WebUI without agpl license or use unmodified version with
      agpl license to observe the contents of the agpl license.</span
    >
    <span class="mb-2 text-xs text-draculared"
      >You must use textgen webui with --no-stream and without --cai-chat or
      --chat</span
    >
    {#if !isTauri}
      <span class="mb-2 text-xs text-draculared"
        >You are using web version. you must use ngrok or other tunnels to use
        your local webui.</span
      >
    {/if}
  {/if}
  <span class="text-neutral-200"
    >{language.mainPrompt} <Help key="mainprompt" /></span
  >
  <textarea
    class="input-text mb-2 mt-2 h-20 resize-none bg-transparent text-xs text-gray-200 focus:bg-selected"
    autocomplete="off"
    bind:value={$DataBase.mainPrompt}
  />
  <span class="mb-6 text-sm text-gray-400"
    >{tokens.mainPrompt} {language.tokens}</span
  >
  <span class="text-neutral-200"
    >{language.jailbreakPrompt} <Help key="jailbreak" /></span
  >
  <textarea
    class="input-text mb-2 mt-2 h-20 resize-none bg-transparent text-xs text-gray-200 focus:bg-selected"
    autocomplete="off"
    bind:value={$DataBase.jailbreak}
  />
  <span class="mb-6 text-sm text-gray-400"
    >{tokens.jailbreak} {language.tokens}</span
  >
  <span class="text-neutral-200"
    >{language.globalNote} <Help key="globalNote" /></span
  >
  <textarea
    class="input-text mb-2 mt-2 h-20 resize-none bg-transparent text-xs text-gray-200 focus:bg-selected"
    autocomplete="off"
    bind:value={$DataBase.globalNote}
  />
  <span class="mb-6 text-sm text-gray-400"
    >{tokens.globalNote} {language.tokens}</span
  >
  <span class="text-neutral-200">{language.maxContextSize}</span>
  {#if $DataBase.aiModel === "gpt35"}
    <input
      class="input-text mb-4 bg-transparent p-2 text-sm text-neutral-200 focus:bg-selected"
      type="number"
      min={0}
      max="4000"
      bind:value={$DataBase.maxContext}
    />
  {:else if $DataBase.aiModel === "gpt4" || $DataBase.aiModel === "textgen_webui"}
    <input
      class="input-text mb-4 bg-transparent p-2 text-sm text-neutral-200 focus:bg-selected"
      type="number"
      min={0}
      max="8000"
      bind:value={$DataBase.maxContext}
    />
  {:else if $DataBase.aiModel === "custom"}
    <input
      class="input-text mb-4 bg-transparent p-2 text-sm text-neutral-200 focus:bg-selected"
      type="number"
      min={0}
      max={getCurrentPluginMax($DataBase.currentPluginProvider)}
      bind:value={$DataBase.maxContext}
    />
  {/if}
  <span class="text-neutral-200">{language.maxResponseSize}</span>
  <input
    class="input-text mb-4 bg-transparent p-2 text-sm text-neutral-200 focus:bg-selected"
    type="number"
    min={0}
    max="2048"
    bind:value={$DataBase.maxResponse}
  />
  <span class="text-neutral-200"
    >{language.temperature} <Help key="tempature" /></span
  >
  <input
    class="input-text bg-transparent p-2 text-neutral-200 focus:bg-selected"
    type="range"
    min="0"
    max="200"
    bind:value={$DataBase.temperature}
  />
  <span class="mb-6 text-sm text-gray-400"
    >{($DataBase.temperature / 100).toFixed(2)}</span
  >
  <span class="text-neutral-200"
    >{language.frequencyPenalty} <Help key="frequencyPenalty" /></span
  >
  <input
    class="input-text bg-transparent p-2 text-neutral-200 focus:bg-selected"
    type="range"
    min="0"
    max="100"
    bind:value={$DataBase.frequencyPenalty}
  />
  <span class="mb-6 text-sm text-gray-400"
    >{($DataBase.frequencyPenalty / 100).toFixed(2)}</span
  >
  <span class="text-neutral-200"
    >{language.presensePenalty} <Help key="presensePenalty" /></span
  >
  <input
    class="input-text bg-transparent p-2 text-neutral-200 focus:bg-selected"
    type="range"
    min="0"
    max="100"
    bind:value={$DataBase.PresensePenalty}
  />
  <span class="mb-6 text-sm text-gray-400"
    >{($DataBase.PresensePenalty / 100).toFixed(2)}</span
  >

  <span class="mt-2 text-neutral-200"
    >{language.forceReplaceUrl} <Help key="forceUrl" /></span
  >
  <input
    class="input-text bg-transparent p-2 text-sm text-neutral-200 focus:bg-selected"
    bind:value={$DataBase.forceReplaceUrl}
    placeholder="Leave blank to not replace url"
  />
  <span class="mt-2 text-neutral-200"
    >{language.submodel}
    {language.forceReplaceUrl}
    <Help key="forceUrl" /></span
  >
  <input
    class="input-text bg-transparent p-2 text-sm text-neutral-200 focus:bg-selected"
    bind:value={$DataBase.forceReplaceUrl2}
    placeholder="Leave blank to not replace url"
  />

  <details class="mt-4">
    <summary class="mb-2">{language.advancedSettings}</summary>
    <span class="mb-2 mt-4 text-neutral-200"
      >{language.formatingOrder} <Help key="formatOrder" /></span
    >
    <DropList bind:list={$DataBase.formatingOrder} />
    <span class="mt-2 text-neutral-200">Bias <Help key="bias" /></span>
    <table class="contain tabler mt-2 w-full max-w-full">
      <tr>
        <th class="w-1/2 font-medium">Bias</th>
        <th class="w-1/3 font-medium">{language.value}</th>
        <th
          class="cursor-pointer font-medium hover:text-green-500"
          on:click={() => {
            let bia = $DataBase.bias;
            bia.push(["", 0]);
            $DataBase.bias = bia;
          }}><PlusIcon /></th
        >
      </tr>
      {#if $DataBase.bias.length === 0}
        <tr>
          <div class="text-gray-500">{language.noBias}</div>
        </tr>
      {/if}
      {#each $DataBase.bias as bias, i}
        <tr>
          <td class="w-1/2 truncate font-medium">
            <input
              class="input-text mb-4 mt-2 bg-transparent p-2 text-neutral-200 focus:bg-selected"
              bind:value={$DataBase.bias[i][0]}
              placeholder="string"
            />
          </td>
          <td class="w-1/3 truncate font-medium">
            <input
              class="input-text mb-4 mt-2 w-full bg-transparent p-2 text-neutral-200 focus:bg-selected"
              bind:value={$DataBase.bias[i][1]}
              type="number"
              max="100"
              min="-100"
            />
          </td>
          <button
            class="flex h-full cursor-pointer items-center justify-center font-medium hover:text-green-500"
            on:click={() => {
              let bia = $DataBase.bias;
              bia.splice(i, 1);
              $DataBase.bias = bia;
            }}><TrashIcon /></button
          >
        </tr>
      {/each}
    </table>

    <div class="mt-4 flex items-center">
      <Check bind:check={$DataBase.promptPreprocess} />
      <span>{language.promptPreprocess}</span>
    </div>
  </details>

  <button
    on:click={() => {
      openPresetList = true;
    }}
    class="ml-2 mr-2 mt-4 flex items-center justify-center border-1 border-solid border-borderc p-3 drop-shadow-lg hover:bg-selected"
    >{language.presets}</button
  >
{:else if subMenu === 0 && subSubMenu === 1}
  <h2 class="mb-2 mt-2 text-2xl font-bold">{language.botSettings}</h2>
  <div class="mb-2 flex w-full">
    <button
      on:click={() => {
        subSubMenu = 0;
      }}
      class="flex flex-1 cursor-pointer justify-center border-1 border-solid border-borderc p-2"
    >
      <span>{language.Chat}</span>
    </button>
    <button
      on:click={() => {
        subSubMenu = 1;
      }}
      class="flex flex-1 cursor-pointer justify-center border-1 border-solid border-borderc border-l-transparent p-2"
      class:bg-selected={subSubMenu === 1}
    >
      <span>{language.others}</span>
    </button>
  </div>
  <span class="mt-4 text-lg font-bold text-neutral-200"
    >{language.imageGeneration}</span
  >

  <span class="mt-2 text-neutral-200"
    >{language.provider} <Help key="sdProvider" /></span
  >
  <select
    class="input-text mb-4 mt-2 appearance-none bg-transparent text-sm text-gray-200"
    bind:value={$DataBase.sdProvider}
  >
    <option value="" class="appearance-none bg-darkbg">None</option>
    <option value="webui" class="appearance-none bg-darkbg"
      >Stable Diffusion WebUI</option
    >
    <!-- TODO -->
    <!-- <option value="runpod" class="bg-darkbg appearance-none">Runpod Serverless</option> -->
  </select>

  {#if $DataBase.sdProvider === "webui"}
    <span class="mb-2 text-xs text-draculared"
      >You must use WebUI with --api flag</span
    >
    <span class="mb-2 text-xs text-draculared"
      >You must use WebUI without agpl license or use unmodified version with
      agpl license to observe the contents of the agpl license.</span
    >
    {#if !isTauri}
      <span class="mb-2 text-xs text-draculared"
        >You are using web version. you must use ngrok or other tunnels to use
        your local webui.</span
      >
    {/if}
    <span class="mt-2 text-neutral-200">WebUI {language.providerURL}</span>
    <input
      class="input-text mb-4 bg-transparent p-2 text-sm text-neutral-200 focus:bg-selected"
      placeholder="https://..."
      bind:value={$DataBase.webUiUrl}
    />
    <span class="text-neutral-200">Steps</span>
    <input
      class="input-text mb-4 bg-transparent p-2 text-sm text-neutral-200 focus:bg-selected"
      type="number"
      min={0}
      max="100"
      bind:value={$DataBase.sdSteps}
    />

    <span class="text-neutral-200">CFG Scale</span>
    <input
      class="input-text mb-4 bg-transparent p-2 text-sm text-neutral-200 focus:bg-selected"
      type="number"
      min={0}
      max="20"
      bind:value={$DataBase.sdCFG}
    />

    <span class="text-neutral-200">Width</span>
    <input
      class="input-text mb-4 bg-transparent p-2 text-sm text-neutral-200 focus:bg-selected"
      type="number"
      min={0}
      max="2048"
      bind:value={$DataBase.sdConfig.width}
    />
    <span class="text-neutral-200">Height</span>
    <input
      class="input-text mb-4 bg-transparent p-2 text-sm text-neutral-200 focus:bg-selected"
      type="number"
      min={0}
      max="2048"
      bind:value={$DataBase.sdConfig.height}
    />
    <span class="text-neutral-200">Sampler</span>
    <input
      class="input-text mb-4 bg-transparent p-2 text-sm text-neutral-200 focus:bg-selected"
      bind:value={$DataBase.sdConfig.sampler_name}
    />

    <div class="mt-2 flex items-center">
      <Check bind:check={$DataBase.sdConfig.enable_hr} />
      <span>Enable Hires</span>
    </div>
    {#if $DataBase.sdConfig.enable_hr === true}
      <span class="text-neutral-200">denoising_strength</span>
      <input
        class="input-text mb-4 bg-transparent p-2 text-sm text-neutral-200 focus:bg-selected"
        type="number"
        min={0}
        max="10"
        bind:value={$DataBase.sdConfig.denoising_strength}
      />
      <span class="text-neutral-200">hr_scale</span>
      <input
        class="input-text mb-4 bg-transparent p-2 text-sm text-neutral-200 focus:bg-selected"
        type="number"
        min={0}
        max="10"
        bind:value={$DataBase.sdConfig.hr_scale}
      />
      <span class="text-neutral-200">Upscaler</span>
      <input
        class="input-text mb-4 bg-transparent p-2 text-sm text-neutral-200 focus:bg-selected"
        bind:value={$DataBase.sdConfig.hr_upscaler}
      />
    {/if}
  {/if}
{:else if subMenu == 3}
  <h2 class="mb-2 mt-2 text-2xl font-bold">{language.display}</h2>
  <span class="mt-4 text-neutral-200">{language.UiLanguage}</span>
  <select
    class="input-text mt-2 appearance-none bg-transparent text-sm text-gray-200"
    bind:value={$DataBase.language}
    on:change={async () => {
      await sleep(10);
      changeLanguage($DataBase.language);
      subMenu = -1;
    }}
  >
    <option value="en" class="appearance-none bg-darkbg">English</option>
    <option value="ko" class="appearance-none bg-darkbg">한국어</option>
  </select>

  <span class="mt-4 text-neutral-200">{language.theme}</span>
  <select
    class="input-text mt-2 appearance-none bg-transparent text-sm text-gray-200"
    bind:value={$DataBase.theme}
  >
    <option value="" class="appearance-none bg-darkbg">Standard Risu</option>
    <option value="waifu" class="appearance-none bg-darkbg">Waifulike</option>
    <option value="waifuMobile" class="appearance-none bg-darkbg"
      >WaifuCut</option
    >
    <!-- <option value="free" class="bg-darkbg appearance-none">Freestyle</option> -->
  </select>

  {#if $DataBase.theme === "waifu"}
    <span class="mt-4 text-neutral-200">{language.waifuWidth}</span>
    <input
      class="input-text bg-transparent p-2 text-sm text-neutral-200 focus:bg-selected"
      type="range"
      min="50"
      max="200"
      bind:value={$DataBase.waifuWidth}
    />
    <span class="text-gray-400text-sm">{$DataBase.waifuWidth}%</span>

    <span class="mt-4 text-neutral-200">{language.waifuWidth2}</span>
    <input
      class="input-text bg-transparent p-2 text-sm text-neutral-200 focus:bg-selected"
      type="range"
      min="20"
      max="150"
      bind:value={$DataBase.waifuWidth2}
    />
    <span class="text-gray-400text-sm">{$DataBase.waifuWidth2}%</span>
  {/if}

  <span class="mt-4 text-neutral-200">{language.textColor}</span>
  <select
    class="input-text mt-2 appearance-none bg-transparent text-gray-200"
    bind:value={$DataBase.textTheme}
    on:change={updateTextTheme}
  >
    <option value="standard" class="appearance-none bg-darkbg"
      >{language.classicRisu}</option
    >
    <option value="highcontrast" class="appearance-none bg-darkbg"
      >{language.highcontrast}</option
    >
    <option value="custom" class="appearance-none bg-darkbg">Custom</option>
  </select>

  {#if $DataBase.textTheme === "custom"}
    <div class="mt-2 flex items-center">
      <input
        type="color"
        class="style2 text-sm"
        bind:value={$DataBase.customTextTheme.FontColorStandard}
        on:change={updateTextTheme}
      />
      <span class="ml-2">Normal Text</span>
    </div>
    <div class="mt-2 flex items-center">
      <input
        type="color"
        class="style2 text-sm"
        bind:value={$DataBase.customTextTheme.FontColorItalic}
        on:change={updateTextTheme}
      />
      <span class="ml-2">Italic Text</span>
    </div>
    <div class="mt-2 flex items-center">
      <input
        type="color"
        class="style2 text-sm"
        bind:value={$DataBase.customTextTheme.FontColorBold}
        on:change={updateTextTheme}
      />
      <span class="ml-2">Bold Text</span>
    </div>
    <div class="mt-2 flex items-center">
      <input
        type="color"
        class="style2 text-sm"
        bind:value={$DataBase.customTextTheme.FontColorItalicBold}
        on:change={updateTextTheme}
      />
      <span class="ml-2">Italic Bold Text</span>
    </div>
  {/if}

  {#if isTauri}
    <span class="mt-4 text-neutral-200">{language.translator}</span>
    <select
      class="input-text mb-4 mt-2 appearance-none bg-transparent text-sm text-gray-200"
      bind:value={$DataBase.translator}
    >
      <option value="" class="appearance-none bg-darkbg"
        >{language.disabled}</option
      >
      <option value="ko" class="appearance-none bg-darkbg">한국어</option>
    </select>
  {/if}
  <span class="text-neutral-200">{language.UISize}</span>
  <input
    class="input-text bg-transparent p-2 text-neutral-200 focus:bg-selected"
    type="range"
    min="50"
    max="200"
    bind:value={$DataBase.zoomsize}
  />
  <span class="mb-6 text-sm text-gray-400">{$DataBase.zoomsize}%</span>

  <span class="text-neutral-200">{language.iconSize}</span>
  <input
    class="input-text bg-transparent p-2 text-neutral-200 focus:bg-selected"
    type="range"
    min="50"
    max="200"
    bind:value={$DataBase.iconsize}
  />
  <span class="mb-6 text-sm text-gray-400">{$DataBase.iconsize}%</span>

  {#if isTauri}
    <div class="mt-2 flex items-center">
      <Check bind:check={$DataBase.autoTranslate} />
      <span>{language.autoTranslation}</span>
    </div>
  {/if}
  <div class="mt-2 flex items-center">
    <Check bind:check={$DataBase.fullScreen} onChange={changeFullscreen} />
    <span>{language.fullscreen}</span>
  </div>

  <div class="mt-2 flex items-center">
    <Check
      check={$DataBase.customBackground !== ""}
      onChange={async (check) => {
        if (check) {
          $DataBase.customBackground = "-";
          const d = await selectSingleFile(["png", "webp", "gif"]);
          if (!d) {
            $DataBase.customBackground = "";
            return;
          }
          const img = await saveImage(d.data);
          $DataBase.customBackground = img;
        } else {
          $DataBase.customBackground = "";
        }
      }}
    />
    <span>{language.useCustomBackground}</span>
  </div>

  <div class="mt-2 flex items-center">
    <Check bind:check={$DataBase.playMessage} />
    <span>{language.playMessage} <Help key="msgSound" /></span>
  </div>

  <div class="mt-2 flex items-center">
    <Check bind:check={$DataBase.swipe} />
    <span>{language.SwipeRegenerate}</span>
  </div>

  <div class="mt-2 flex items-center">
    <Check bind:check={$DataBase.instantRemove} />
    <span>{language.instantRemove}</span>
  </div>
{:else if subMenu === 2}
  <h2 class="mb-2 mt-2 text-2xl font-bold">{language.plugin}</h2>
  <span class="mb-4 text-xs text-draculared">{language.pluginWarn}</span>

  <div class="flex flex-col border-1 border-solid border-borderc p-2">
    {#if $DataBase.plugins.length === 0}
      <span class="text-gray-500">No Plugins</span>
    {:else}
      {#each $DataBase.plugins as plugin, i}
        {#if i !== 0}
          <div
            class="seperator mb-2 mt-2 w-full border-b-1 border-solid border-borderc"
          />
        {/if}
        <div class="flex">
          <span class="flex-grow font-bold"
            >{plugin.displayName ?? plugin.name}</span
          >
          <button
            class="gray-500 hover:gray-200 cursor-pointer"
            on:click={async () => {
              const v = await alertConfirm(
                language.removeConfirm + (plugin.displayName ?? plugin.name)
              );
              if (v) {
                if ($DataBase.currentPluginProvider === plugin.name) {
                  $DataBase.currentPluginProvider = "";
                }
                let plugins = $DataBase.plugins;
                plugins.splice(i, 1);
                $DataBase.plugins = plugins;
              }
            }}
          >
            <TrashIcon />
          </button>
        </div>
        {#if Object.keys(plugin.arguments).length > 0}
          <div class="bg-dark-900 mt-2 flex flex-col bg-opacity-50 p-3">
            {#each Object.keys(plugin.arguments) as arg}
              <span>{arg}</span>
              {#if Array.isArray(plugin.arguments[arg])}
                <select
                  class="input-text mb-4 mt-2 appearance-none bg-transparent text-gray-200"
                  bind:value={$DataBase.plugins[i].realArg[arg]}
                >
                  {#each plugin.arguments[arg] as a}
                    <option value={a} class="appearance-none bg-darkbg"
                      >a</option
                    >
                  {/each}
                </select>
              {:else if plugin.arguments[arg] === "string"}
                <input
                  class="input-text bg-transparent p-2 text-neutral-200 focus:bg-selected"
                  bind:value={$DataBase.plugins[i].realArg[arg]}
                />
              {:else if plugin.arguments[arg] === "int"}
                <input
                  class="input-text bg-transparent p-2 text-neutral-200 focus:bg-selected"
                  type="number"
                  bind:value={$DataBase.plugins[i].realArg[arg]}
                />
              {/if}
            {/each}
          </div>
        {/if}
      {/each}
    {/if}
  </div>
  <div class="mt-2 flex text-gray-500">
    <button
      on:click={() => {
        importPlugin();
      }}
      class="cursor-pointer hover:text-neutral-200"
    >
      <PlusIcon />
    </button>
  </div>
{:else if subMenu === 1}
  <h2 class="mt-2 text-2xl font-bold">{language.advancedSettings}</h2>
  <span class="mb-2 text-xs text-draculared"
    >{language.advancedSettingsWarn}</span
  >
  <span class="mb-2 mt-4 text-neutral-200">{language.loreBookDepth}</span>
  <input
    class="input-text mb-4 bg-transparent p-2 text-sm text-neutral-200 focus:bg-selected"
    type="number"
    min={0}
    max="20"
    bind:value={$DataBase.loreBookDepth}
  />
  <span class="text-neutral-200">{language.loreBookToken}</span>
  <input
    class="input-text mb-4 bg-transparent p-2 text-sm text-neutral-200 focus:bg-selected"
    type="number"
    min={0}
    max="4096"
    bind:value={$DataBase.loreBookToken}
  />

  <span class="text-neutral-200">{language.additionalPrompt}</span>
  <input
    class="input-text mb-4 bg-transparent p-2 text-sm text-neutral-200 focus:bg-selected"
    bind:value={$DataBase.additionalPrompt}
  />

  <span class="text-neutral-200">{language.descriptionPrefix}</span>
  <input
    class="input-text mb-4 bg-transparent p-2 text-sm text-neutral-200 focus:bg-selected"
    bind:value={$DataBase.descriptionPrefix}
  />

  <span class="text-neutral-200">{language.emotionPrompt}</span>
  <input
    class="input-text mb-4 bg-transparent p-2 text-sm text-neutral-200 focus:bg-selected"
    bind:value={$DataBase.emotionPrompt2}
    placeholder="Leave it blank to use default"
  />

  <span class="text-neutral-200">{language.requestretrys}</span>
  <input
    class="input-text mb-4 bg-transparent p-2 text-sm text-neutral-200 focus:bg-selected"
    type="number"
    min={0}
    max="20"
    bind:value={$DataBase.requestRetrys}
  />

  <span class="text-neutral-200">Request Method</span>
  <select
    class="input-text mb-4 appearance-none bg-transparent text-sm text-gray-200"
    bind:value={$DataBase.requestmet}
  >
    <option value="normal" class="appearance-none bg-darkbg">Normal</option>
    <option value="proxy" class="appearance-none bg-darkbg">Proxy</option>
    <option value="plain" class="appearance-none bg-darkbg">Plain Fetch</option>
  </select>

  {#if $DataBase.requestmet === "proxy"}
    <span class="text-neutral-200">Request Proxy URL</span>
    <input
      class="input-text mb-4 bg-transparent p-2 text-sm text-neutral-200 focus:bg-selected"
      bind:value={$DataBase.requestproxy}
    />
  {/if}
  {#if isTauri && $DataBase.requestmet === "normal"}
    <span class="text-neutral-200">Request Lib</span>
    <select
      class="input-text appearance-none bg-transparent text-sm text-gray-200"
      bind:value={$DataBase.requester}
    >
      <option value="new" class="appearance-none bg-darkbg">Reqwest</option>
      <option value="old" class="appearance-none bg-darkbg">Tauri</option>
    </select>
  {/if}

  <div class="mt-4 flex items-center">
    <Check bind:check={$DataBase.useSayNothing} />
    <span>{language.sayNothing}</span>
  </div>
  <div class="mt-4 flex items-center">
    <Check bind:check={$DataBase.showUnrecommended} />
    <span>{language.showUnrecommended}</span>
  </div>
  <button
    on:click={async () => {
      alertMd(getRequestLog());
    }}
    class="ml-2 mr-2 mt-6 flex items-center justify-center border-1 border-solid border-borderc p-3 text-sm drop-shadow-lg hover:bg-selected"
  >
    {language.ShowLog}
  </button>
{:else if subMenu === 4}
  <h2 class="mb-2 mt-2 text-2xl font-bold">{language.files}</h2>

  <button
    on:click={async () => {
      if (await alertConfirm(language.backupConfirm)) {
        localStorage.setItem("backup", "save");
        if (isTauri) {
          checkDriver("savetauri");
        } else {
          checkDriver("save");
        }
      }
    }}
    class="ml-2 mr-2 mt-2 flex items-center justify-center border-1 border-solid border-borderc p-3 text-sm drop-shadow-lg hover:bg-selected"
  >
    {language.savebackup}
  </button>

  <button
    on:click={async () => {
      if (
        (await alertConfirm(language.backupLoadConfirm)) &&
        (await alertConfirm(language.backupLoadConfirm2))
      ) {
        localStorage.setItem("backup", "load");
        if (isTauri) {
          checkDriver("loadtauri");
        } else {
          checkDriver("load");
        }
      }
    }}
    class="ml-2 mr-2 mt-2 flex items-center justify-center border-1 border-solid border-borderc p-3 text-sm drop-shadow-lg hover:bg-selected"
  >
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
