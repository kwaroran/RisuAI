<script>
  import { ArrowBigLeftIcon } from "lucide-svelte";
  import { changeLanguage, language } from "src/lang";
  import { addDefaultCharacters } from "src/ts/characters";
  import { DataBase } from "src/ts/database";
  import { sleep } from "src/ts/util";

  let step = 0;
  let provider = 0;
</script>

<div class="flex h-full w-full justify-center bg-bgcolor">
  <article
    class="prose prose-invert w-full max-w-screen-md overflow-y-auto overflow-x-hidden bg-darkbg p-5"
  >
    <div class="flex w-full justify-center">
      <img src="/logo.png" alt="logo" />
    </div>
    <div class="flex w-full justify-center">
      <h1>Welcome to RisuAI!</h1>
    </div>
    {#if step === 0}
      <h2>Choose the language</h2>
      <div class="ml-2 flex flex-col items-start">
        <button
          class="transition-colors hover:text-green-500"
          on:click={() => {
            changeLanguage("en");
            step = 1;
          }}>• English</button
        >
        <button
          class="transition-colors hover:text-green-500"
          on:click={() => {
            changeLanguage("ko");
            step = 1;
          }}>• 한국어</button
        >
      </div>
    {:else if step === 1}
      <h2>{language.setup.chooseProvider}</h2>
      <div class="ml-2 flex flex-col items-start">
        <button
          class="transition-colors hover:text-green-500"
          on:click={() => {
            provider = 1;
            step += 1;
          }}>• {language.setup.openaikey}</button
        >
        <button
          class="transition-colors hover:text-green-500"
          on:click={() => {
            provider = 2;
            step += 1;
          }}>• {language.setup.openaiProxy}</button
        >
        <button
          class="transition-colors hover:text-green-500"
          on:click={() => {
            provider = 3;
            step += 1;
          }}>• {language.setup.setupmodelself}</button
        >
      </div>
    {:else if step === 2}
      {#if provider === 1}
        <h2>{language.setup.openaikey}</h2>
        <div class="ml-2 w-full">
          <span>API key</span>
          <input
            class="input-text m-0 mt-2 bg-transparent p-2 text-neutral-200 focus:bg-selected"
            bind:value={$DataBase.openAIKey}
          />
        </div>
        <span class="text-gray-400"
          >{language.setup.apiKeyhelp}
          <a href="https://platform.openai.com/account/api-keys" target="_blank"
            >https://platform.openai.com/account/api-keys</a
          ></span
        >
        <div class="ml-2 mt-6 flex flex-col items-start">
          <button
            class="transition-colors hover:text-green-500"
            on:click={() => {
              provider = 1;
              step += 1;
            }}>• {language.confirm}</button
          >
        </div>
      {:else if provider === 2}
        <h2>{language.setup.openaiProxy}</h2>
        <div class="ml-2 w-full">
          <span>OpenAI Reverse Proxy URL</span>
          <input
            class="input-text m-0 mt-2 bg-transparent p-2 text-neutral-200 focus:bg-selected"
            bind:value={$DataBase.forceReplaceUrl}
            placeholder="https://..."
          />
        </div>
        <div class="ml-2 mt-4 w-full">
          <span>API key (Used for passwords)</span>
          <input
            class="input-text m-0 mt-2 bg-transparent p-2 text-neutral-200 focus:bg-selected"
            bind:value={$DataBase.openAIKey}
            placeholder="Optional"
          />
        </div>
        <div class="ml-2 mt-6 flex flex-col items-start">
          <button
            class="transition-colors hover:text-green-500"
            on:click={() => {
              provider = 1;
              step += 1;
            }}>• {language.confirm}</button
          >
        </div>
      {:else}
        <h2>{language.setup.setupmodelself}</h2>
        <div class="ml-2 w-full">
          <span>{language.setup.setupSelfHelp}</span>
        </div>
        <div class="ml-2 mt-6 flex flex-col items-start">
          <button
            class="transition-colors hover:text-green-500"
            on:click={() => {
              provider = 1;
              step += 1;
            }}>• {language.confirm}</button
          >
        </div>
      {/if}
    {:else if step === 3}
      <h2>{language.setup.theme}</h2>
      <div class="ml-2 flex flex-col items-start">
        <button
          class="flex flex-col items-start transition-colors hover:text-green-500"
          on:click={() => {
            $DataBase.theme = "";
            step += 1;
          }}
          ><span>• Standard Risu</span>
          <img class="mt-2 w-3/4" src="/ss2.webp" alt="example" /></button
        >
        <button
          class="flex flex-col items-start transition-colors hover:text-green-500"
          on:click={() => {
            $DataBase.theme = "waifu";
            step += 1;
          }}
          ><span>• Waifulike (Not suitable for mobile)</span>
          <img class="mt-2 w-3/4" src="/ss3.webp" alt="example" /></button
        >
      </div>
    {:else if step === 4}
      <h2>{language.setup.theme}</h2>
      <div class="ml-2 flex flex-col items-start">
        <button
          class="flex flex-col items-start transition-colors hover:text-green-500"
          on:click={() => {
            $DataBase.theme = "";
            step += 1;
          }}
          ><span>• Standard Risu</span>
          <img class="mt-2 w-3/4" src="/ss2.webp" alt="example" /></button
        >
        <button
          class="flex flex-col items-start transition-colors hover:text-green-500"
          on:click={() => {
            $DataBase.theme = "waifu";
            step += 1;
          }}
          ><span>• Waifulike</span>
          <img class="mt-2 w-3/4" src="/ss3.webp" alt="example" /></button
        >
      </div>
    {:else if step === 4}
      <h2>{language.setup.theme}</h2>
      <div class="ml-2 flex flex-col items-start">
        <button
          class="flex flex-col items-start transition-colors hover:text-green-500"
          on:click={() => {
            $DataBase.theme = "";
            step += 1;
          }}
          ><span>• Standard Risu</span>
          <img class="mt-2 w-3/4" src="/ss2.webp" alt="example" /></button
        >
        <button
          class="flex flex-col items-start transition-colors hover:text-green-500"
          on:click={() => {
            $DataBase.theme = "waifu";
            step += 1;
          }}
          ><span>• Waifulike</span>
          <img class="mt-2 w-3/4" src="/ss3.webp" alt="example" /></button
        >
      </div>
    {:else if step === 5}
      <h2>{language.setup.texttheme}</h2>
      <div class="ml-2 flex flex-col items-start">
        <button
          class="flex flex-col items-start transition-colors hover:text-green-500"
          on:click={() => {
            $DataBase.theme = "";
            step += 1;
          }}
          ><span>• {language.classicRisu}</span>
          <div class="not-prose border-borderc px-8 py-2">
            <p class="classic mb-0 mt-2 p-0">Normal Text</p>
            <p class="classic-italic mb-0 mt-2 p-0 italic">Italic Text</p>
            <p class="classic mb-0 mt-2 p-0 font-bold">Bold Text</p>
          </div>
        </button>
      </div>
      <div class="mb-2 ml-2 mt-2 flex flex-col items-start">
        <button
          class="flex flex-col items-start transition-colors hover:text-green-500"
          on:click={() => {
            $DataBase.theme = "";
            step += 1;
          }}
          ><span>• {language.highcontrast}</span>
          <div class="not-prose border-borderc p-2 px-8 py-2">
            <p class="classic mb-0 mt-2 p-0" style="color:#f8f8f2">
              Normal Text
            </p>
            <p
              class="classic-italic mb-0 mt-2 p-0 italic"
              style="color:#F1FA8C"
            >
              Italic Text
            </p>
            <p class="classic mb-0 mt-2 p-0 font-bold" style="color:#FFB86C">
              Bold Text
            </p>
          </div>
        </button>
      </div>
    {:else if step === 6}
      <h2>{language.setup.inputName}</h2>
      <div class="ml-2 w-full">
        <input
          class="input-text m-0 mt-2 bg-transparent p-2 text-neutral-200 focus:bg-selected"
          bind:value={$DataBase.username}
        />
      </div>
      <div class="ml-2 mt-6 flex flex-col items-start">
        <button
          class="transition-colors hover:text-green-500"
          on:click={async () => {
            $DataBase.forceReplaceUrl2 = $DataBase.forceReplaceUrl;
            await addDefaultCharacters();
            $DataBase.didFirstSetup = true;
            await sleep(2000);
            location.reload();
          }}>• {language.confirm}</button
        >
      </div>
    {/if}

    {#if step > 0}
      <button
        class="ml-2 transition-colors hover:text-green-500"
        on:click={() => {
          step = step - 1;
        }}>• Go Back</button
      >
    {/if}
  </article>
</div>

<style>
  .classic {
    color: #fafafa;
  }
  .classic-italic {
    color: #8c8d93;
  }
</style>
