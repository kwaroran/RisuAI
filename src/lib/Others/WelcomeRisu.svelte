<script>

    import { ArrowBigLeftIcon } from "lucide-svelte";
    import { changeLanguage, language } from "src/lang";
    import { addDefaultCharacters } from "src/ts/characters";
    import { DataBase } from "src/ts/storage/database";
    import { sleep } from "src/ts/util";
    import TextInput from "../UI/GUI/TextInput.svelte";
  import Button from "../UI/GUI/Button.svelte";

    let step = 0
    let provider = 0
</script>

<div class="w-full h-full flex justify-center welcome-bg text-textcolor">
    <article class="w-full overflow-x-hidden max-w-full min-h-full h-full flex flex-col overflow-y-auto">
        <div class="w-full justify-center flex mt-8">
            <img src="/logo_typo_trans.png" alt="logo" class="w-full max-w-screen-sm  mb-0">
        </div>
        <!-- <div class="w-full items-center flex flex-col justify-center mb-8">
            <button class=" border border-selected rounded-md px-4 py-2 text-lg hover:border-neutral-200 transition">Get Started</button>
        </div> -->
        <div class="w-full flex-col bg-darkbg flex-grow mt-5 prose prose-invert max-w-full p-5 rounded-t-lg overflow-x-hidden">
            {#if step === 0}
                <h2>Choose the language</h2>
                <div class="flex flex-col items-start ml-2">
                    <button class="hover:text-green-500 transition-colors" on:click={() => {
                        changeLanguage('en')
                        $DataBase.language='en'
                        step = 1
                    }}>• English</button>
                    <button class="hover:text-green-500 transition-colors" on:click={() => {
                        changeLanguage('ko')
                        $DataBase.language='ko'
                        step = 1
                    }}>• 한국어</button>
                    <button class="hover:text-green-500 transition-colors" on:click={() => {
                        changeLanguage('cn')
                        $DataBase.language='cn'
                        step = 1
                    }}>• 中文</button>
                </div>

            {:else if step === 1}
                <h2>{language.setup.chooseProvider}</h2>
                <div class="flex flex-col items-start ml-2">
                    <button class="hover:text-green-500 transition-colors" on:click={() => {
                        provider = 1
                        step += 1
                    }}>• {language.setup.openaikey}</button>
                    <button class="hover:text-green-500 transition-colors"on:click={() => {
                        provider = 2
                        step += 1
                    }}>• {language.setup.openaiProxy}</button>
                    <button class="hover:text-green-500 transition-colors" on:click={() => {
                        provider = 3
                        step += 1
                    }}>• {language.setup.setupmodelself}</button>
                </div>
            {:else if step === 2}
                {#if provider === 1}
                    <h2>{language.setup.openaikey}</h2>
                    <div class="w-full ml-2">
                        <span class="mb-2">API key</span>
                        <TextInput bind:value={$DataBase.openAIKey} placeholder="API Key" autocomplete="off"/>
                    </div>
                    <span class="text-textcolor2">{language.setup.apiKeyhelp} <a href="https://platform.openai.com/account/api-keys" target="_blank">https://platform.openai.com/account/api-keys</a></span>
                    <div class="flex flex-col items-start ml-2 mt-6">
                        <button class="hover:text-green-500 transition-colors" on:click={() => {
                            provider = 1
                            step += 1
                        }}>• {language.confirm}</button>
                    </div>
                {:else if provider === 2}
                    <h2>{language.setup.openaiProxy}</h2>
                    <div class="w-full ml-2">
                        <span class="mb-2">OpenAI Reverse Proxy URL</span>
                        <TextInput bind:value={$DataBase.forceReplaceUrl} placeholder="https://..." autocomplete="off"/>
                    </div>
                    <div class="w-full ml-2 mt-4">
                        <span class="mb-2">API key (Used for passwords)</span>
                        <TextInput bind:value={$DataBase.proxyKey} placeholder="Optional" autocomplete="off"/>
                    </div>
                    <div class="flex flex-col items-start ml-2 mt-6">
                        <button class="hover:text-green-500 transition-colors" on:click={() => {
                            provider = 1
                            step += 1
                        }}>• {language.confirm}</button>
                    </div>
                {:else}
                    <h2>{language.setup.setupmodelself}</h2>
                    <div class="w-full ml-2">
                        <span>{language.setup.setupSelfHelp}</span>
                    </div>
                    <div class="flex flex-col items-start ml-2 mt-6">
                        <button class="hover:text-green-500 transition-colors" on:click={() => {
                            provider = 1
                            step += 1
                        }}>• {language.confirm}</button>
                    </div>
                {/if}
            {:else if step === 3}
                <h2>{language.setup.theme}</h2>
                <div class="flex flex-col items-start ml-2">
                    <button class="hover:text-green-500 transition-colors flex flex-col items-start" on:click={() => {
                        $DataBase.theme = ''
                        step += 1
                    }}><span>• Standard Risu ({language.setup.themeDescClassic})</span>
                    <img class="w-3/4 mt-2" src="/ss2.webp" alt="example"></button>
                    <button class="hover:text-green-500 transition-colors flex flex-col items-start" on:click={() => {
                        $DataBase.theme = 'waifu'
                        step += 1
                    }}><span>• Waifulike ({language.setup.themeDescWifulike})</span>
                    <img class="w-3/4 mt-2" src="/ss3.webp" alt="example"></button>
                    <button class="hover:text-green-500 transition-colors flex flex-col items-start" on:click={() => {
                        $DataBase.theme = 'waifuMobile'
                        step += 1
                    }}><span>• WaifuCut ({language.setup.themeDescWifuCut})</span>
                    <img class="w-3/4 mt-2" src="/ss4.webp" alt="example"></button>
                </div>
            {:else if step === 4}
                <h2>{language.setup.texttheme}</h2>
                <div class="flex flex-col items-start ml-2">
                    <button class="hover:text-green-500 transition-colors flex flex-col items-start" on:click={() => {
                        $DataBase.textTheme = 'standard'
                        step += 1
                    }}><span>• {language.classicRisu}</span>
                        <div class="border-borderc py-2 px-8 not-prose">
                            <p class="mt-2 mb-0 classic p-0"> Normal Text</p>
                            <p class="mt-2 mb-0 classic-italic italic p-0">Italic Text</p>
                            <p class="mt-2 mb-0 classic font-bold p-0">Bold Text</p>

                        </div>
                    </button>
                </div>
                <div class="flex flex-col items-start ml-2 mt-2 mb-2">
                    <button class="hover:text-green-500 transition-colors flex flex-col items-start" on:click={() => {
                        $DataBase.textTheme = 'highcontrast'
                        step += 1
                    }}><span>• {language.highcontrast}</span>
                        <div class="border-borderc p-2 py-2 px-8  not-prose">
                            <p class="mt-2 mb-0 classic p-0" style="color:#f8f8f2"> Normal Text</p>
                            <p class="mt-2 mb-0 classic-italic italic p-0" style="color:#F1FA8C">Italic Text</p>
                            <p class="mt-2 mb-0 classic font-bold p-0" style="color:#FFB86C">Bold Text</p>

                        </div>
                    </button>
                </div>
            {:else if step === 5}
                <h2 class="mb-2">{language.setup.inputName}</h2>
                <div class="w-full ml-2">
                    <TextInput bind:value={$DataBase.username} />
                </div>
                <div class="flex flex-col items-start ml-2 mt-6">
                    <button class="hover:text-green-500 transition-colors" on:click={async () => {
                        $DataBase.forceReplaceUrl2 = $DataBase.forceReplaceUrl
                        await addDefaultCharacters()
                        $DataBase.didFirstSetup = true
                        await sleep(2000)
                        location.reload()
                    }}>• {language.confirm}</button>
                </div>
            {/if}


            {#if step > 0}

                <button class="hover:text-green-500 transition-colors ml-2" on:click={() => {
                    step = step - 1
                }}>• Go Back</button>
            {/if}
        </div>

    </article>
</div>
<style>
    .classic{
        color: #fafafa;
    }
    .classic-italic{
        color: #8C8D93;
    }
    .welcome-bg{
        background-image: url("/public/welcome/welcomebg.png");
        background-size: cover;
    }
</style>