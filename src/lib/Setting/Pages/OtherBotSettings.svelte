<script lang="ts">
    import Check from "src/lib/UI/GUI/CheckInput.svelte";
    import { language } from "src/lang";
    import Help from "src/lib/Others/Help.svelte";
    import { selectSingleFile } from "src/ts/util";
    import { DBState, selectedCharID } from 'src/ts/stores.svelte';
    import { isTauri, saveAsset, downloadFile } from "src/ts/globalApi.svelte";
    import NumberInput from "src/lib/UI/GUI/NumberInput.svelte";
    import TextInput from "src/lib/UI/GUI/TextInput.svelte";
    import SelectInput from "src/lib/UI/GUI/SelectInput.svelte";
    import OptionInput from "src/lib/UI/GUI/OptionInput.svelte";
    import SliderInput from "src/lib/UI/GUI/SliderInput.svelte";
    import { getCharImage } from "src/ts/characters";
    import Accordion from "src/lib/UI/Accordion.svelte";
    import CheckInput from "src/lib/UI/GUI/CheckInput.svelte";
    import TextAreaInput from "src/lib/UI/GUI/TextAreaInput.svelte";
    import { untrack } from "svelte";
    import { tokenizePreset } from "src/ts/process/prompt";
    import { getCharToken } from "src/ts/tokenizer";
    import { PlusIcon, PencilIcon, TrashIcon, DownloadIcon, HardDriveUploadIcon } from "@lucide/svelte";
    import { alertError, alertInput, alertConfirm, alertNormal } from "src/ts/alert";
    import { createHypaV3Preset } from "src/ts/process/memory/hypav3";

    let submenu = $state(DBState.db.useLegacyGUI ? -1 : 0);

    // HypaV3
    $effect(() => {
        const settings = DBState.db.hypaV3Presets?.[DBState.db.hypaV3PresetId]?.settings;
        const currentValue = settings?.similarMemoryRatio;

        if (!currentValue) return;

        untrack(() => {
            const newValue = Math.min(currentValue, 1);

            settings.similarMemoryRatio = newValue;

            if (newValue + settings.recentMemoryRatio > 1) {
                settings.recentMemoryRatio = 1 - newValue;
            }
        })
    });

    $effect(() => {
        const settings = DBState.db.hypaV3Presets?.[DBState.db.hypaV3PresetId]?.settings;
        const currentValue = settings?.recentMemoryRatio;

        if (!currentValue) return;

        untrack(() => {
            const newValue = Math.min(currentValue, 1);

            settings.recentMemoryRatio = newValue;

            if (newValue + settings.similarMemoryRatio > 1) {
                settings.similarMemoryRatio = 1 - newValue;
            }
        })
    });

    async function getMaxMemoryRatio(): Promise<number> {
        const promptTemplateToken = await tokenizePreset(DBState.db.promptTemplate);
        const char = DBState.db.characters[$selectedCharID];
        const charToken = await getCharToken(char);
        const maxLoreToken = char.loreSettings?.tokenBudget ?? DBState.db.loreBookToken;
        const maxResponse = DBState.db.maxResponse;
        const requiredToken = promptTemplateToken + charToken.persistant + Math.min(charToken.dynamic, maxLoreToken) + maxResponse * 3;
        const maxContext = DBState.db.maxContext;

        if (maxContext === 0) {
            return 0;
        }

        const maxMemoryRatio = Math.max((maxContext - requiredToken) / maxContext, 0);

        return parseFloat(maxMemoryRatio.toFixed(2));
    }
    // End HypaV3
</script>
<h2 class="mb-2 text-2xl font-bold mt-2">{language.otherBots}</h2>


{#if submenu !== -1}
    <div class="flex w-full rounded-md border border-darkborderc mb-4">
        <button onclick={() => {
            submenu = 0
        }} class="p-2 flex-1 border-r border-darkborderc" class:bg-darkbutton={submenu === 0}>
            <span>{language.longTermMemory}</span>
        </button>
        <button onclick={() => {
            submenu = 1
        }} class="p2 flex-1 border-r border-darkborderc" class:bg-darkbutton={submenu === 1}>
            <span>TTS</span>
        </button>
        <button onclick={() => {
            submenu = 2
        }} class="p-2 flex-1 border-r border-darkborderc" class:bg-darkbutton={submenu === 2}>
            <span>{language.emotionImage}</span>
        </button>
        <button onclick={() => {
            submenu = 3
        }} class="p-2 flex-1" class:bg-darkbutton={submenu === 3}>
            <span>{language.imageGeneration}</span>
        </button>
    </div>
{/if}

{#if submenu === 3 || submenu === -1}
    <Accordion name={language.imageGeneration} styled disabled={submenu !== -1}>
        <span class="text-textcolor mt-2">{language.imageGeneration} {language.provider} <Help key="sdProvider"/></span>
        <SelectInput className="mt-2 mb-4" bind:value={DBState.db.sdProvider}>
            <OptionInput value="" >None</OptionInput>
            <OptionInput value="webui" >Stable Diffusion WebUI</OptionInput>
            <OptionInput value="novelai" >Novel AI</OptionInput>
            <OptionInput value="dalle" >Dall-E</OptionInput>
            <OptionInput value="stability" >Stability API</OptionInput>
            <OptionInput value="fal" >Fal.ai</OptionInput>
            <OptionInput value="comfyui" >ComfyUI</OptionInput>
            <OptionInput value="Imagen" >Imagen</OptionInput>

            <!-- Legacy -->
            {#if DBState.db.sdProvider === 'comfy'}
                <OptionInput value="comfy" >ComfyUI (Legacy)</OptionInput>
            {/if}
        </SelectInput>

        {#if DBState.db.sdProvider === 'webui'}
        <span class="text-draculared text-xs mb-2">You must use WebUI with --api flag</span>
            <span class="text-draculared text-xs mb-2">You must use WebUI without agpl license or use unmodified version with agpl license to observe the contents of the agpl license.</span>
            {#if !isTauri}
                <span class="text-draculared text-xs mb-2">You are using web version. you must use ngrok or other tunnels to use your local webui.</span>
            {/if}
            <span class="text-textcolor mt-2">WebUI {language.providerURL}</span>
            <TextInput size="sm" marginBottom placeholder="https://..." bind:value={DBState.db.webUiUrl}/>
            <span class="text-textcolor">Steps</span>
            <NumberInput size="sm" marginBottom min={0} max={100} bind:value={DBState.db.sdSteps}/>

            <span class="text-textcolor">CFG Scale</span>
            <NumberInput size="sm" marginBottom min={0} max={20} bind:value={DBState.db.sdCFG}/>

            <span class="text-textcolor">Width</span>
            <NumberInput size="sm" marginBottom min={0} max={2048} bind:value={DBState.db.sdConfig.width}/>
            <span class="text-textcolor">Height</span>
            <NumberInput size="sm" marginBottom min={0} max={2048} bind:value={DBState.db.sdConfig.height}/>
            <span class="text-textcolor">Sampler</span>
            <TextInput size="sm" marginBottom bind:value={DBState.db.sdConfig.sampler_name}/>

            <div class="flex items-center mt-2">
                <Check bind:check={DBState.db.sdConfig.enable_hr} name='Enable Hires'/>
            </div>
            {#if DBState.db.sdConfig.enable_hr === true}
                <span class="text-textcolor">denoising_strength</span>
                <NumberInput size="sm" marginBottom  min={0} max={10} bind:value={DBState.db.sdConfig.denoising_strength}/>
                <span class="text-textcolor">hr_scale</span>
                <NumberInput size="sm" marginBottom  min={0} max={10} bind:value={DBState.db.sdConfig.hr_scale}/>
                <span class="text-textcolor">Upscaler</span>
                <TextInput size="sm" marginBottom bind:value={DBState.db.sdConfig.hr_upscaler}/>
            {/if}
        {/if}

        {#if DBState.db.sdProvider === 'novelai'}
            <span class="text-textcolor mt-2">Novel AI {language.providerURL}</span>
            <TextInput size="sm" marginBottom placeholder="https://image.novelai.net" bind:value={DBState.db.NAIImgUrl}/>
            <span class="text-textcolor">API Key</span>
            <TextInput size="sm" marginBottom placeholder="pst-..." bind:value={DBState.db.NAIApiKey}/>

            <span class="text-textcolor">Model</span>
            <SelectInput className="mb-4" bind:value={DBState.db.NAIImgModel} >
                <OptionInput value="nai-diffusion-4-5-full" >nai-diffusion-4-5-full</OptionInput>
                <OptionInput value="nai-diffusion-4-5-curated" >nai-diffusion-4-5-curated</OptionInput>
                <OptionInput value="nai-diffusion-4-full" >nai-diffusion-4-full</OptionInput>
                <OptionInput value="nai-diffusion-4-curated-preview" >nai-diffusion-4-curated-preview</OptionInput>
                <OptionInput value="nai-diffusion-3" >nai-diffusion-3</OptionInput>
                <OptionInput value="nai-diffusion-furry-3" >nai-diffusion-furry-3</OptionInput>
                <OptionInput value="nai-diffusion-2" >nai-diffusion-2</OptionInput>

            </SelectInput>

            <span class="text-textcolor">Width</span>
            <NumberInput size="sm" marginBottom min={0} max={2048} bind:value={DBState.db.NAIImgConfig.width}/>
            <span class="text-textcolor">Height</span>
            <NumberInput size="sm" marginBottom min={0} max={2048} bind:value={DBState.db.NAIImgConfig.height}/>
            <span class="text-textcolor">Sampler</span>

            {#if DBState.db.NAIImgModel === 'nai-diffusion-4-full'
            || DBState.db.NAIImgModel === 'nai-diffusion-4-curated-preview'
            || DBState.db.NAIImgModel === 'nai-diffusion-4-5-full'
            || DBState.db.NAIImgModel === 'nai-diffusion-4-5-curated'}
                <SelectInput className="mb-4" bind:value={DBState.db.NAIImgConfig.sampler}>
                    <OptionInput value="k_euler_ancestral" >Euler Ancestral</OptionInput>
                    <OptionInput value="k_dpmpp_2s_ancestral" >DPM++ 2S Ancestral</OptionInput>
                    <OptionInput value="k_dpmpp_2m_sde" >DPM++ 2M SDE</OptionInput>
                    <OptionInput value="k_euler" >Euler</OptionInput>
                    <OptionInput value="k_dpmpp_2m" >DPM++ 2M</OptionInput>
                    <OptionInput value="k_dpmpp_sde" >DPM++ SDE</OptionInput>
                </SelectInput>
            {:else}
                <SelectInput className="mb-4" bind:value={DBState.db.NAIImgConfig.sampler}>
                    <OptionInput value="k_euler_ancestral" >Euler Ancestral</OptionInput>
                    <OptionInput value="k_dpmpp_2s_ancestral" >DPM++ 2S Ancestral</OptionInput>
                    <OptionInput value="k_dpmpp_sde" >DPM++ SDE</OptionInput>
                    <OptionInput value="k_euler" >Euler</OptionInput>
                    <OptionInput value="k_dpmpp_2m" >DPM++ 2M</OptionInput>
                    <OptionInput value="k_dpmpp_2s" >DPM++ 2S</OptionInput>
                    <OptionInput value="ddim_v3" >DDIM</OptionInput>
                </SelectInput>
            {/if}

            <span class="text-textcolor">Noise Schedule</span>
            <SelectInput className="mb-4" bind:value={DBState.db.NAIImgConfig.noise_schedule}>
                <OptionInput value="native" >native</OptionInput>
                <OptionInput value="karras" >karras</OptionInput>
                <OptionInput value="exponential" >exponential</OptionInput>
                <OptionInput value="polyexponential" >polyexponential</OptionInput>
            </SelectInput>

            <span class="text-textcolor">steps</span>
            <NumberInput size="sm" marginBottom min={0} max={2048} bind:value={DBState.db.NAIImgConfig.steps}/>
            <span class="text-textcolor">CFG scale</span>
            <NumberInput size="sm" marginBottom min={0} max={2048} bind:value={DBState.db.NAIImgConfig.scale}/>
            <span class="text-textcolor">CFG rescale</span>
            <NumberInput size="sm" marginBottom min={0} max={1} bind:value={DBState.db.NAIImgConfig.cfg_rescale}/>

            <span class="text-textcolor">Image Reference</span>
            <SelectInput className="mb-4" bind:value={DBState.db.NAIImgConfig.reference_mode}>
                <OptionInput value="" >None</OptionInput>
                <OptionInput value="vibe" >Vibe Trasfer</OptionInput>
                {#if DBState.db.NAIImgModel === 'nai-diffusion-4-5-full' || DBState.db.NAIImgModel === 'nai-diffusion-4-5-curated'}
                    <OptionInput value="character" >Character Reference</OptionInput>
                {/if}
            </SelectInput>

            {#if DBState.db.NAIImgConfig.reference_mode === 'vibe'}
                <div class="relative">
                <button class="mb-4" onclick={async () => {
                    const file = await selectSingleFile(['naiv4vibe'])
                    if(!file){
                        return null
                    }
                    try {
                        const vibeData = JSON.parse(new TextDecoder().decode(file.data))
                        if (vibeData.version !== 1 || vibeData.identifier !== "novelai-vibe-transfer") {
                            alertError("Invalid vibe file. Version must be 1.")
                            return
                        }

                        // Store the vibe data
                        DBState.db.NAIImgConfig.vibe_data = vibeData

                        // Set the thumbnail as preview image for display
                        if (vibeData.thumbnail) {
                            // Clear the array and add the thumbnail
                            DBState.db.NAIImgConfig.reference_image_multiple = [];

                            // Set default model selection based on current model
                            if (DBState.db.NAIImgModel.includes('nai-diffusion-4-full')) {
                                DBState.db.NAIImgConfig.vibe_model_selection = 'v4full';
                            } else if (DBState.db.NAIImgModel.includes('nai-diffusion-4-curated')) {
                                DBState.db.NAIImgConfig.vibe_model_selection = 'v4curated';
                            } else if (DBState.db.NAIImgModel.includes('nai-diffusion-4-5-full')) { 
                                DBState.db.NAIImgConfig.vibe_model_selection = 'v4-5full';
                            } else if (DBState.db.NAIImgModel.includes('nai-diffusion-4-5-curated')) {
                                DBState.db.NAIImgConfig.vibe_model_selection = 'v4-5curated';
                            }

                            // Set InfoExtracted to the first value for the selected model
                            const selectedModel = DBState.db.NAIImgConfig.vibe_model_selection;
                            if (selectedModel && vibeData.encodings[selectedModel]) {
                                const encodings = vibeData.encodings[selectedModel];
                                const firstKey = Object.keys(encodings)[0];
                                if (firstKey) {
                                    DBState.db.NAIImgConfig.InfoExtracted = Number(encodings[firstKey].params.information_extracted);
                                }
                            }
                        }

                        // Initialize reference_strength_multiple if not set
                        if (!DBState.db.NAIImgConfig.reference_strength_multiple || !Array.isArray(DBState.db.NAIImgConfig.reference_strength_multiple)) {
                            DBState.db.NAIImgConfig.reference_strength_multiple = [0.7];
                        }
                    } catch (error) {
                        alertError("Error parsing vibe file: " + error)
                    }
                }}>
                    {#if !DBState.db.NAIImgConfig.vibe_data || !DBState.db.NAIImgConfig.vibe_data.thumbnail}
                        <div class="rounded-md h-20 w-20 shadow-lg bg-textcolor2 cursor-pointer hover:text-green-500 flex items-center justify-center">
                            <span class="text-sm">Upload<br />Vibe</span>
                        </div>
                    {:else}
                        <img src={DBState.db.NAIImgConfig.vibe_data.thumbnail} alt="Vibe Preview" class="rounded-md h-40 shadow-lg bg-textcolor2 cursor-pointer hover:text-green-500" />
                    {/if}
                </button>

                {#if DBState.db.NAIImgConfig.vibe_data}
                    <button 
                        onclick={() => {
                            DBState.db.NAIImgConfig.vibe_data = undefined;
                            DBState.db.NAIImgConfig.vibe_model_selection = undefined;
                        }}
                        class="absolute top-2 right-2 bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded-sm"
                    >
                        Delete
                    </button>
                {/if}

                </div>

                {#if DBState.db.NAIImgConfig.vibe_data}

                    <span class="text-textcolor">Vibe Model</span>
                    <SelectInput className="mb-2" bind:value={DBState.db.NAIImgConfig.vibe_model_selection} onchange={(e) => {
                        // When vibe model changes, set InfoExtracted to the first value
                        if (DBState.db.NAIImgConfig.vibe_data?.encodings &&
                            DBState.db.NAIImgConfig.vibe_model_selection &&
                            DBState.db.NAIImgConfig.vibe_data.encodings[DBState.db.NAIImgConfig.vibe_model_selection]) {
                            const encodings = DBState.db.NAIImgConfig.vibe_data.encodings[DBState.db.NAIImgConfig.vibe_model_selection];
                            const firstKey = Object.keys(encodings)[0];
                            if (firstKey) {
                                DBState.db.NAIImgConfig.InfoExtracted = Number(encodings[firstKey].params.information_extracted);
                            }
                        }
                    }}>
                        {#if DBState.db.NAIImgConfig.vibe_data.encodings?.v4full}
                            <OptionInput value="v4full">nai-diffusion-4-full</OptionInput>
                        {/if}
                        {#if DBState.db.NAIImgConfig.vibe_data.encodings?.v4curated}
                            <OptionInput value="v4curated">nai-diffusion-4-curated</OptionInput>
                        {/if}
                        {#if DBState.db.NAIImgConfig.vibe_data.encodings?.['v4-5full']}
                            <OptionInput value="v4-5full">nai-diffusion-4-5-full</OptionInput>
                        {/if}
                        {#if DBState.db.NAIImgConfig.vibe_data.encodings?.['v4-5curated']}
                            <OptionInput value="v4-5curated">nai-diffusion-4-5-curated</OptionInput>
                        {/if}
                    </SelectInput>

                    <span class="text-textcolor">Information Extracted</span>
                    <SelectInput className="mb-2" bind:value={DBState.db.NAIImgConfig.InfoExtracted}>
                        {#if DBState.db.NAIImgConfig.vibe_model_selection && DBState.db.NAIImgConfig.vibe_data.encodings[DBState.db.NAIImgConfig.vibe_model_selection]}
                            {#each Object.entries(DBState.db.NAIImgConfig.vibe_data.encodings[DBState.db.NAIImgConfig.vibe_model_selection]) as [key, value]}
                                <OptionInput value={value.params.information_extracted}>{value.params.information_extracted}</OptionInput>
                            {/each}
                        {/if}
                    </SelectInput>

                    <span class="text-textcolor">Reference Strength Multiple</span>
                    <SliderInput marginBottom min={0} max={1} step={0.1} fixed={2} bind:value={DBState.db.NAIImgConfig.reference_strength_multiple[0]} />
                {/if}
            {/if}

            {#if DBState.db.NAIImgConfig.reference_mode === 'character' && 
                (DBState.db.NAIImgModel === 'nai-diffusion-4-5-full' || DBState.db.NAIImgModel === 'nai-diffusion-4-5-curated')}
                
                <div class="relative">
                    <button class="mb-2" onclick={async () => {
                        const img = await selectSingleFile([
                            'jpg',
                            'jpeg',
                            'png',
                            'webp'
                        ])
                        if(!img){
                            return null
                        }
                        
                        const imageData = img.data;
                        
                        DBState.db.NAIImgConfig.character_base64image = Buffer.from(imageData).toString('base64');
                        const saveId = await saveAsset(imageData)
                        DBState.db.NAIImgConfig.character_image = saveId
                        console.log('Character image set:', DBState.db.NAIImgConfig.character_image)
                    }}>
                        {#if !DBState.db.NAIImgConfig.character_image || DBState.db.NAIImgConfig.character_image === ''}
                            <div class="rounded-md h-20 w-20 shadow-lg bg-textcolor2 cursor-pointer hover:text-green-500 flex items-center justify-center">
                                <span class="text-sm">Upload<br />Image</span>
                            </div>
                        {:else}
                            {#await getCharImage(DBState.db.NAIImgConfig.character_image, 'plain')}
                                <div class="rounded-md h-20 w-20 shadow-lg bg-textcolor2 cursor-pointer hover:text-green-500 flex items-center justify-center">
                                    <span class="text-sm">Uploading<br />Image..</span>
                                </div>
                            {:then im}
                                <img src={im} class="rounded-md h-40 shadow-lg bg-textcolor2 cursor-pointer hover:text-green-500" alt="Base Preview"/>
                            {/await}
                        {/if}
                    </button>

                    {#if DBState.db.NAIImgConfig.character_image && DBState.db.NAIImgConfig.character_image !== ''}
                        <button 
                            onclick={() => {
                                DBState.db.NAIImgConfig.character_image = undefined;
                                DBState.db.NAIImgConfig.character_base64image = undefined;
                            }}
                            class="absolute top-2 right-2 bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded-sm"
                        >
                            Delete
                        </button>
                    {/if}
                </div>
                
                <span class="text-textcolor2 text-xs mb-2 block">Leave blank to use the character's default image.</span>

                <Check className="mb-4" bind:check={DBState.db.NAIImgConfig.style_aware} name="Style Aware"/>

            {/if}

            
            

            {#if (DBState.db.NAIImgModel === 'nai-diffusion-3' || DBState.db.NAIImgModel === 'nai-diffusion-furry-3' || DBState.db.NAIImgModel === 'nai-diffusion-2')
            && DBState.db.NAIImgConfig.sampler !== 'ddim_v3'}
                <Check bind:check={DBState.db.NAIImgConfig.sm} name="Use SMEA"/>
            {/if}

            {#if DBState.db.NAIImgModel === 'nai-diffusion-3' && DBState.db.NAIImgConfig.sampler !== 'ddim_v3'}
                <Check bind:check={DBState.db.NAIImgConfig.sm_dyn} name='Use DYN'/>
            {/if}

            {#if DBState.db.NAIImgModel === 'nai-diffusion-4-5-full' || DBState.db.NAIImgModel === 'nai-diffusion-4-5-curated' 
            || DBState.db.NAIImgModel === 'nai-diffusion-4-full' || DBState.db.NAIImgModel === 'nai-diffusion-4-curated-preview'
            || DBState.db.NAIImgModel === 'nai-diffusion-3' || DBState.db.NAIImgModel === 'nai-diffusion-furry-3'}
                <Check bind:check={DBState.db.NAIImgConfig.variety_plus} name="Variety+"/>
            {/if}

            {#if DBState.db.NAIImgModel === 'nai-diffusion-3' || DBState.db.NAIImgModel === 'nai-diffusion-furry-3' || DBState.db.NAIImgModel === 'nai-diffusion-2'}
                <Check bind:check={DBState.db.NAIImgConfig.decrisp} name="Decrisp"/>
            {/if}

            {#if DBState.db.NAIImgModel === 'nai-diffusion-4-full'
            || DBState.db.NAIImgModel === 'nai-diffusion-4-curated-preview'}
                <Check bind:check={DBState.db.NAIImgConfig.legacy_uc} name='Use legacy uc'/>
            {/if}
                
            <Check className="mt-4 mb-4" bind:check={DBState.db.NAII2I} name="Enable I2I"/>
            
            {#if DBState.db.NAII2I}
                <div class="relative">
                    <button class="mb-2" onclick={async () => {
                        const img = await selectSingleFile([
                            'jpg',
                            'jpeg',
                            'png',
                            'webp'
                        ])
                        if(!img){
                            return null
                        }
                        DBState.db.NAIImgConfig.base64image = Buffer.from(img.data).toString('base64');
                        const saveId = await saveAsset(img.data)
                        DBState.db.NAIImgConfig.image = saveId
                    }}>
                        {#if !DBState.db.NAIImgConfig.image || DBState.db.NAIImgConfig.image === ''}
                            <div class="rounded-md h-20 w-20 shadow-lg bg-textcolor2 cursor-pointer hover:text-green-500 flex items-center justify-center">
                                <span class="text-sm">Upload<br />Image</span>
                            </div>
                        {:else}
                            {#await getCharImage(DBState.db.NAIImgConfig.image, 'plain')}
                                <div class="rounded-md h-20 w-20 shadow-lg bg-textcolor2 cursor-pointer hover:text-green-500 flex items-center justify-center">
                                    <span class="text-sm">Uploading<br />Image..</span>
                                </div>
                            {:then im}
                                <img src={im} class="rounded-md h-40 shadow-lg bg-textcolor2 cursor-pointer hover:text-green-500" alt="Base Preview"/>
                            {/await}
                        {/if}
                    </button>

                    {#if DBState.db.NAIImgConfig.image && DBState.db.NAIImgConfig.image !== ''}
                        <button 
                            onclick={() => {
                                DBState.db.NAIImgConfig.image = undefined;
                                DBState.db.NAIImgConfig.base64image = undefined;
                            }}
                            class="absolute top-2 right-2 bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded-sm"
                        >
                            Delete
                        </button>
                    {/if}
                </div>
                <span class="text-textcolor2 text-xs block">Leave blank to use the character's default image.</span>


                <span class="text-textcolor mt-2">Strength</span>
                <SliderInput min={0} max={0.99} step={0.01} fixed={2} bind:value={DBState.db.NAIImgConfig.strength}/>
                <span class="text-textcolor mt-2">Noise</span>
                <SliderInput min={0} max={0.99} step={0.01} fixed={2} bind:value={DBState.db.NAIImgConfig.noise}/>


            {/if}
        {/if}

         
        
        {#if DBState.db.sdProvider === 'dalle'}
            <span class="text-textcolor">OpenAI API Key</span>
            <TextInput size="sm" marginBottom placeholder="sk-..." bind:value={DBState.db.openAIKey}/>

            <span class="text-textcolor mt-4">Dall-E Quality</span>
            <SelectInput className="mt-2 mb-4" bind:value={DBState.db.dallEQuality}>
                <OptionInput value="standard" >Standard</OptionInput>
                <OptionInput value="hd" >HD</OptionInput>
            </SelectInput>

        {/if}

        {#if DBState.db.sdProvider === 'stability'}
            <span class="text-textcolor">Stability API Key</span>
            <TextInput size="sm" marginBottom placeholder="..." bind:value={DBState.db.stabilityKey}/>

            <span class="text-textcolor">Stability Model</span>
            <SelectInput className="mt-2 mb-4" bind:value={DBState.db.stabilityModel}>
                <OptionInput value="ultra" >SD Ultra</OptionInput>
                <OptionInput value="core" >SD Core</OptionInput>
                <OptionInput value="sd3-large" >SD3 Large</OptionInput>
                <OptionInput value="sd3-medium" >SD3 Medium</OptionInput>
            </SelectInput>

            {#if DBState.db.stabilityModel === 'core'}
                <span class="text-textcolor">SD Core Style</span>
                <SelectInput className="mt-2 mb-4" bind:value={DBState.db.stabllityStyle}>
                    <OptionInput value="" >Unspecified</OptionInput>
                    <OptionInput value="3d-model" >3D Model</OptionInput>
                    <OptionInput value="analog-film" >Analog Film</OptionInput>
                    <OptionInput value="anime" >Anime</OptionInput>
                    <OptionInput value="cinematic" >Cinematic</OptionInput>
                    <OptionInput value="comic-book" >Comic Book</OptionInput>
                    <OptionInput value="digital-art" >Digital Art</OptionInput>
                    <OptionInput value="enhance" >Enhance</OptionInput>
                    <OptionInput value="fantasy-art" >Fantasy Art</OptionInput>
                    <OptionInput value="isometric" >Isometric</OptionInput>
                    <OptionInput value="line-art" >Line Art</OptionInput>
                    <OptionInput value="low-poly" >Low Poly</OptionInput>
                    <OptionInput value="modeling-compound" >Modeling Compound</OptionInput>
                    <OptionInput value="neon-punk" >Neon Punk</OptionInput>
                    <OptionInput value="origami" >Origami</OptionInput>
                    <OptionInput value="photographic" >Photographic</OptionInput>
                    <OptionInput value="pixel-art" >Pixel Art</OptionInput>
                    <OptionInput value="tile-texture" >Tile Texture</OptionInput>
                </SelectInput>
            {/if}
        {/if}

        {#if DBState.db.sdProvider === 'comfyui'}
            <span class="text-textcolor mt-2">ComfyUI {language.providerURL}</span>
            <TextInput size="sm" marginBottom placeholder="http://127.0.0.1:8188" bind:value={DBState.db.comfyUiUrl}/>

            <span class="text-textcolor">Workflow <Help key="comfyWorkflow" /></span>
            <TextInput size="sm" marginBottom bind:value={DBState.db.comfyConfig.workflow}/>

            <span class="text-textcolor">Timeout (sec)</span>
            <NumberInput size="sm" marginBottom bind:value={DBState.db.comfyConfig.timeout} min={1} max={120} />
        {/if}

        {#if DBState.db.sdProvider === 'comfy'}
            <span class="text-draculared text-xs mb-2">The first image generated by the prompt will be selected. </span>
            {#if !isTauri}
                <span class="text-draculared text-xs mb-2">"Please run comfyUI with --enable-cors-header."</span>
            {/if}
            <span class="text-textcolor mt-2">ComfyUI {language.providerURL}</span>
            <TextInput size="sm" marginBottom placeholder="http://127.0.0.1:8188" bind:value={DBState.db.comfyUiUrl}/>
            <span class="text-textcolor">Workflow</span>
            <TextInput size="sm" marginBottom placeholder="valid ComfyUI API json (Enable Dev mode Options in ComfyUI)" bind:value={DBState.db.comfyConfig.workflow}/>

            <span class="text-textcolor">Positive Text Node: ID</span>
            <TextInput size="sm" marginBottom placeholder="eg. 1, 3, etc" bind:value={DBState.db.comfyConfig.posNodeID}/>
            <span class="text-textcolor">Positive Text Node: Input Field Name</span>
            <TextInput size="sm" marginBottom placeholder="eg. text" bind:value={DBState.db.comfyConfig.posInputName}/>
            <span class="text-textcolor">Negative Text Node: ID</span>
            <TextInput size="sm" marginBottom placeholder="eg. 1, 3, etc" bind:value={DBState.db.comfyConfig.negNodeID}/>
            <span class="text-textcolor">Positive Text Node: Input Field Name</span>
            <TextInput size="sm" marginBottom placeholder="eg. text" bind:value={DBState.db.comfyConfig.negInputName}/>
            <span class="text-textcolor">Timeout (sec)</span>
            <NumberInput size="sm" marginBottom bind:value={DBState.db.comfyConfig.timeout} min={1} max={120} />
        {/if}

        {#if DBState.db.sdProvider === 'fal'}
            <span class="text-textcolor">Fal.ai API Key</span>
            <TextInput size="sm" marginBottom placeholder="..." bind:value={DBState.db.falToken}/>

            <span class="text-textcolor mt-4">Width</span>
            <NumberInput size="sm" marginBottom min={0} max={2048} bind:value={DBState.db.sdConfig.width}/>
            <span class="text-textcolor mt-4">Height</span>
            <NumberInput size="sm" marginBottom min={0} max={2048} bind:value={DBState.db.sdConfig.height}/>

            <span class="text-textcolor mt-4">Model</span>
            <SelectInput className="mt-2" bind:value={DBState.db.falModel}>
                <OptionInput value="fal-ai/flux/dev" >Flux[Dev]</OptionInput>
                <OptionInput value="fal-ai/flux-lora" >Flux[Dev] with Lora</OptionInput>
                <OptionInput value="fal-ai/flux-pro" >Flux[Pro]</OptionInput>
                <OptionInput value="fal-ai/flux/schnell" >Flux[Schnell]</OptionInput>
            </SelectInput>

            {#if DBState.db.falModel === 'fal-ai/flux-lora'}
                <span class="text-textcolor mt-4">Lora Model URL <Help key="urllora" /></span>
                <TextInput size="sm" marginBottom bind:value={DBState.db.falLora}/>

                <span class="text-textcolor mt-4">Lora Weight</span>
                <SliderInput fixed={2} min={0}  max={2} step={0.01} bind:value={DBState.db.falLoraScale}/>
            {/if}


        {/if}

        {#if DBState.db.sdProvider === 'Imagen'}
            <span class="text-textcolor mt-2">GoogleAI API Key</span>
            <TextInput marginBottom={true} size={"sm"} placeholder="..." hideText={DBState.db.hideApiKey} bind:value={DBState.db.google.accessToken}/>
            
            <span class="text-textcolor">Model</span>
            <SelectInput className="mb-4" bind:value={DBState.db.ImagenModel}>
                <OptionInput value="imagen-4.0-generate-001" >Imagen 4</OptionInput>
                <OptionInput value="imagen-4.0-ultra-generate-001" >Imagen 4 Ultra</OptionInput>
                <OptionInput value="imagen-4.0-fast-generate-001" >Imagen 4 Fast</OptionInput>
                <OptionInput value="imagen-3.0-generate-002" >Imagen 3.0</OptionInput>
            </SelectInput>

            {#if DBState.db.ImagenModel === 'imagen-4.0-generate-001' || DBState.db.ImagenModel === 'imagen-4.0-ultra-generate-001'}
                <span class="text-textcolor">Image size</span>
                <SelectInput className="mb-4" bind:value={DBState.db.ImagenImageSize}>
                    <OptionInput value="1K" >1K</OptionInput>
                    <OptionInput value="2K" >2K</OptionInput>
                </SelectInput>
            {/if}

            <span class="text-textcolor">Aspect ratio</span>
            <SelectInput className="mb-4" bind:value={DBState.db.ImagenAspectRatio}>
                <OptionInput value="1:1" >1:1</OptionInput>
                <OptionInput value="3:4" >3:4</OptionInput>
                <OptionInput value="4:3" >4:3</OptionInput>
                <OptionInput value="9:16" >9:16</OptionInput>
                <OptionInput value="16:9" >16:9</OptionInput>
            </SelectInput>

            <span class="text-textcolor">Person generation</span>
            <SelectInput className="mb-4" bind:value={DBState.db.ImagenPersonGeneration}>
                <OptionInput value="allow_all" >Allow all</OptionInput>
                <OptionInput value="allow_adult" >Allow adult</OptionInput>
                <OptionInput value="dont_allow" >Don't allow</OptionInput>
            </SelectInput>
        {/if}
    </Accordion>
{/if}

{#if submenu === 1 || submenu === -1}
<Accordion name="TTS" styled disabled={submenu !== -1}>
    <span class="text-textcolor mt-2">Auto Speech</span>
    <CheckInput bind:check={DBState.db.ttsAutoSpeech}/>

    <span class="text-textcolor mt-2">ElevenLabs API key</span>
    <TextInput size="sm" marginBottom bind:value={DBState.db.elevenLabKey}/>

    <span class="text-textcolor mt-2">VOICEVOX URL</span>
    <TextInput size="sm" marginBottom bind:value={DBState.db.voicevoxUrl}/>

    <span class="text-textcolor">OpenAI Key</span>
    <TextInput size="sm" marginBottom bind:value={DBState.db.openAIKey}/>

    <span class="text-textcolor mt-2">NovelAI API key</span>
    <TextInput size="sm" marginBottom placeholder="pst-..." bind:value={DBState.db.NAIApiKey}/>

    <span class="text-textcolor">Huggingface Key</span>
    <TextInput size="sm" marginBottom bind:value={DBState.db.huggingfaceKey} placeholder="hf_..."/>

    <span class="text-textcolor">fish-speech API Key</span>
    <TextInput size="sm" marginBottom bind:value={DBState.db.fishSpeechKey}/>

</Accordion>
{/if}

{#if submenu === 2 || submenu === -1}
<Accordion name={language.emotionImage} styled disabled={submenu !== -1}>
    <span class="text-textcolor mt-2">{language.emotionMethod}</span>

    <SelectInput className="mt-2 mb-4" bind:value={DBState.db.emotionProcesser}>
        <OptionInput value="submodel" >Ax. Model</OptionInput>
        <OptionInput value="embedding" >MiniLM-L6-v2</OptionInput>
    </SelectInput>
</Accordion>
{/if}

{#if submenu === 0 || submenu === -1}
    <Accordion name={language.longTermMemory} styled disabled={submenu !== -1}>
        <span class="text-textcolor mt-4">{language.type}</span>

        <SelectInput value={
            DBState.db.hypaV3 ? 'hypaV3' :
            DBState.db.hypav2 ? 'hypaV2' :
            DBState.db.supaModelType !== 'none' ? 'supaMemory' :
            DBState.db.hanuraiEnable ? 'hanuraiMemory' : 'none'
        } onchange={(v) => {
            //@ts-expect-error 'value' doesn't exist on EventTarget, but target is HTMLSelectElement here
            const value = v.target.value
            if (value === 'supaMemory'){
                DBState.db.supaModelType = 'distilbart'
                DBState.db.memoryAlgorithmType = 'supaMemory'
                DBState.db.hypav2 = false
                DBState.db.hanuraiEnable = false
                DBState.db.hypaV3 = false
            } else if (value === 'hanuraiMemory'){
                DBState.db.supaModelType = 'none'
                DBState.db.memoryAlgorithmType = 'hanuraiMemory'
                DBState.db.hypav2 = false
                DBState.db.hanuraiEnable = true
                DBState.db.hypaV3 = false
            } else if (value === 'hypaV2') {
                DBState.db.supaModelType = 'distilbart'
                DBState.db.memoryAlgorithmType = 'hypaMemoryV2'
                DBState.db.hypav2= true
                DBState.db.hanuraiEnable = false
                DBState.db.hypaV3 = false
            } else if (value === 'hypaV3') {
                DBState.db.memoryAlgorithmType = 'hypaMemoryV3'
                DBState.db.supaModelType = 'none'
                DBState.db.hanuraiEnable = false
                DBState.db.hypav2 = false
                DBState.db.hypaV3 = true
            } else {
                DBState.db.supaModelType = 'none'
                DBState.db.memoryAlgorithmType = 'none'
                DBState.db.hypav2 = false
                DBState.db.hanuraiEnable = false
                DBState.db.hypaV3 = false
            }
        }}>
            <OptionInput value="none" >None</OptionInput>
            <OptionInput value="supaMemory" >{language.SuperMemory}</OptionInput>
            <OptionInput value="hypaV2" >{language.HypaMemory} V2</OptionInput>
            <OptionInput value="hanuraiMemory" >{language.hanuraiMemory}</OptionInput>
            <OptionInput value="hypaV3" >{language.HypaMemory} V3</OptionInput>
        </SelectInput>

        {#if DBState.db.hanuraiEnable}
            <span class="mb-2 text-textcolor2 text-sm text-wrap wrap-break-word max-w-full">{language.hanuraiDesc}</span>
            <span>Chunk Size</span>
            <NumberInput size="sm" marginBottom bind:value={DBState.db.hanuraiTokens} min={100} />
            <div class="flex">
                <Check bind:check={DBState.db.hanuraiSplit} name="Text Spliting"/>
            </div>
        {:else if DBState.db.hypav2}
            <span class="mb-2 text-textcolor2 text-sm text-wrap wrap-break-word max-w-full">{language.hypaV2Desc}</span>
            <span class="text-textcolor mt-4">{language.SuperMemory} {language.model}</span>
            <SelectInput className="mt-2 mb-2" bind:value={DBState.db.supaModelType}>
                <OptionInput value="distilbart">distilbart-cnn-6-6 (Free/Local)</OptionInput>
                <OptionInput value="instruct35">OpenAI 3.5 Turbo Instruct</OptionInput>
                <OptionInput value="subModel">{language.submodel}</OptionInput>
            </SelectInput>
            {#if DBState.db.supaModelType === 'davinci' || DBState.db.supaModelType === 'curie' || DBState.db.supaModelType === 'instruct35'}
            <span class="text-textcolor">{language.SuperMemory} OpenAI Key</span>
            <TextInput size="sm" marginBottom bind:value={DBState.db.supaMemoryKey}/>
            {/if}
            <span class="text-textcolor">{language.summarizationPrompt} <Help key="summarizationPrompt" /></span>
            <TextAreaInput size="sm" bind:value={DBState.db.supaMemoryPrompt} placeholder="Leave it blank to use default"/>
            <span class="text-textcolor">{language.hypaChunkSize}</span>
            <NumberInput size="sm" marginBottom bind:value={DBState.db.hypaChunkSize} min={100} />
            <span class="text-textcolor">{language.hypaAllocatedTokens}</span>
            <NumberInput size="sm" marginBottom bind:value={DBState.db.hypaAllocatedTokens} min={100} />
        {:else if DBState.db.hypaV3}
            <span class="max-w-full mb-6 text-sm text-wrap wrap-break-word text-textcolor2">{language.hypaV3Settings.descriptionLabel}</span>
            <span class="text-textcolor">Preset</span>
            <select class={"border border-darkborderc focus:border-borderc rounded-md shadow-xs text-textcolor bg-transparent focus:ring-borderc focus:ring-2 focus:outline-hidden transition-colors duration-200 text-md px-4 py-2 mb-1"}
                bind:value={DBState.db.hypaV3PresetId}
            >
                {#each DBState.db.hypaV3Presets as preset, i}
                    <option class="bg-darkbg appearance-none" value={i}>{preset.name}</option>
                {/each}
            </select>

            <div class="flex items-center mb-8">
                <button class="mr-2 text-textcolor2 hover:text-green-500 cursor-pointer" onclick={() => {
                    const newPreset = createHypaV3Preset()
                    const presets = DBState.db.hypaV3Presets

                    presets.push(newPreset)
                    DBState.db.hypaV3Presets = presets
                    DBState.db.hypaV3PresetId = DBState.db.hypaV3Presets.length - 1
                }}>
                    <PlusIcon size={24}/>
                </button>

                <button class="mr-2 text-textcolor2 hover:text-green-500 cursor-pointer" onclick={async () => {
                    const presets = DBState.db.hypaV3Presets

                    if(presets.length === 0){
                        alertError("There must be least one preset.")
                        return
                    }

                    const id = DBState.db.hypaV3PresetId
                    const preset = presets[id]
                    const newName = await alertInput(`Enter new name for ${preset.name}`)

                    if (!newName || newName.trim().length === 0) return

                    preset.name = newName
                    DBState.db.hypaV3Presets = presets
                }}>
                    <PencilIcon size={24}/>
                </button>

                <button class="mr-2 text-textcolor2 hover:text-green-500 cursor-pointer" onclick={async (e) => {
                    const presets = DBState.db.hypaV3Presets

                    if(presets.length <= 1){
                        alertError("There must be least one preset.")
                        return
                    }

                    const id = DBState.db.hypaV3PresetId
                    const preset = presets[id]
                    const confirmed = await alertConfirm(`${language.removeConfirm}${preset.name}`)

                    if (!confirmed) return

                    DBState.db.hypaV3PresetId = 0
                    presets.splice(id, 1)
                    DBState.db.hypaV3Presets = presets
                }}>
                    <TrashIcon size={24}/>
                </button>

                <div class="ml-2 mr-4 w-px h-full bg-darkborderc"></div>

                <button class="mr-2 text-textcolor2 hover:text-green-500 cursor-pointer" onclick={async() => {
                    try {
                        const presets = DBState.db.hypaV3Presets
                        
                        if(presets.length === 0){
                            alertError("There must be least one preset.")
                            return
                        }

                        const id = DBState.db.hypaV3PresetId
                        const preset = presets[id]
                        const bytesExport = Buffer.from(JSON.stringify({
                            type: 'risu',
                            ver: 1,
                            data: preset
                        }), 'utf-8')
                        
                        await downloadFile(`hypaV3_export_${preset.name}.json`, bytesExport)
                        alertNormal(language.successExport)
                    } catch (error) {
                        alertError(`${error}`)
                    }
                }}>
                    <DownloadIcon size={24}/>
                </button>

                <button class="mr-2 text-textcolor2 hover:text-green-500 cursor-pointer" onclick={async() => {
                    try {
                        const bytesImport = (await selectSingleFile(['json'])).data

                        if(!bytesImport) return

                        const objImport = JSON.parse(Buffer.from(bytesImport).toString('utf-8'))

                        if(objImport.type !== 'risu' || !objImport.data) return

                        const newPreset = createHypaV3Preset(
                            objImport.data.name || "Imported Preset",
                            objImport.data.settings || {}
                        );
                        const presets = DBState.db.hypaV3Presets
                        
                        presets.push(newPreset)
                        DBState.db.hypaV3Presets = presets
                        DBState.db.hypaV3PresetId = DBState.db.hypaV3Presets.length - 1

                        alertNormal(language.successImport)
                    } catch (error) {
                        alertError(`${error}`)
                    }
                }}>
                    <HardDriveUploadIcon size={24}/>
                </button>
            </div>

            {#if DBState.db.hypaV3Presets?.[DBState.db.hypaV3PresetId]?.settings}
                {@const settings = DBState.db.hypaV3Presets[DBState.db.hypaV3PresetId].settings}

                <span class="text-textcolor">{language.SuperMemory} {language.model}</span>
                <SelectInput className="mb-4" bind:value={settings.summarizationModel}>
                    <OptionInput value="subModel">{language.submodel}</OptionInput>
                    {#if "gpu" in navigator}
                        <OptionInput value="Qwen3-1.7B-q4f32_1-MLC">Qwen3 1.7B (GPU)</OptionInput>
                        <OptionInput value="Qwen3-4B-q4f32_1-MLC">Qwen3 4B (GPU)</OptionInput>
                        <OptionInput value="Qwen3-8B-q4f32_1-MLC">Qwen3 8B (GPU)</OptionInput>
                    {/if}
                </SelectInput>
                <span class="text-textcolor">{language.summarizationPrompt} <Help key="summarizationPrompt"/></span>
                <div class="mb-4">
                    <TextAreaInput size="sm" placeholder={language.hypaV3Settings.supaMemoryPromptPlaceHolder} bind:value={settings.summarizationPrompt} />
                </div>
                <span class="text-textcolor">{language.reSummarizationPrompt}</span>
                <div class="mb-4">
                    <TextAreaInput size="sm" placeholder={language.hypaV3Settings.supaMemoryPromptPlaceHolder} bind:value={settings.reSummarizationPrompt} />
                </div>
                {#await getMaxMemoryRatio() then maxMemoryRatio}
                <span class="text-textcolor">{language.hypaV3Settings.maxMemoryTokensRatioLabel}</span>
                <NumberInput marginBottom disabled size="sm" value={maxMemoryRatio} />
                {:catch error}
                <span class="mb-4 text-red-400">{language.hypaV3Settings.maxMemoryTokensRatioError}</span>
                {/await}
                <span class="text-textcolor">{language.hypaV3Settings.memoryTokensRatioLabel}</span>
                <SliderInput marginBottom min={0} max={1} step={0.01} fixed={2} bind:value={settings.memoryTokensRatio} />
                <span class="text-textcolor">{language.hypaV3Settings.extraSummarizationRatioLabel}</span>
                <SliderInput marginBottom min={0} max={1 - settings.memoryTokensRatio} step={0.01} fixed={2} bind:value={settings.extraSummarizationRatio} />
                <span class="text-textcolor">{language.hypaV3Settings.maxChatsPerSummaryLabel}</span>
                <NumberInput marginBottom size="sm" min={1} bind:value={settings.maxChatsPerSummary} />
                <span class="text-textcolor">{language.hypaV3Settings.recentMemoryRatioLabel}</span>
                <SliderInput marginBottom min={0} max={1} step={0.01} fixed={2} bind:value={settings.recentMemoryRatio} />
                <span class="text-textcolor">{language.hypaV3Settings.similarMemoryRatioLabel}</span>
                <SliderInput marginBottom min={0} max={1} step={0.01} fixed={2} bind:value={settings.similarMemoryRatio} />
                <span class="text-textcolor">{language.hypaV3Settings.randomMemoryRatioLabel}</span>
                <NumberInput marginBottom disabled size="sm" value={parseFloat((1 - settings.recentMemoryRatio - settings.similarMemoryRatio).toFixed(2))} />
                <div class="mb-2">
                    <Check name={language.hypaV3Settings.preserveOrphanedMemoryLabel} bind:check={settings.preserveOrphanedMemory} />
                </div>
                <div class="mb-2">
                    <Check name={language.hypaV3Settings.applyRegexScriptWhenRerollingLabel} bind:check={settings.processRegexScript} />
                </div>
                <div class="mb-2">
                    <Check name={language.hypaV3Settings.doNotSummarizeUserMessageLabel} bind:check={settings.doNotSummarizeUserMessage} />
                </div>
                <Accordion name="Advanced Settings" styled>
                    <div class="mb-2">
                        <Check name="Use Experimental Implementation" bind:check={settings.useExperimentalImpl} />
                    </div>
                    <div class="mb-2">
                        <Check name="Always Toggle On" bind:check={settings.alwaysToggleOn} />
                    </div>
                    {#if settings.useExperimentalImpl}
                        <span class="text-textcolor">Summarization Requests Per Minute</span>
                        <NumberInput marginBottom size="sm" min={1} bind:value={settings.summarizationRequestsPerMinute} />
                        <span class="text-textcolor">Summarization Max Concurrent</span>
                        <NumberInput marginBottom size="sm" min={1} max={10} bind:value={settings.summarizationMaxConcurrent} />
                        <span class="text-textcolor">Embedding Requests Per Minute</span>
                        <NumberInput marginBottom size="sm" min={1} bind:value={settings.embeddingRequestsPerMinute} />
                        <span class="text-textcolor">Embedding Max Concurrent</span>
                        <NumberInput marginBottom size="sm" min={1} max={10} bind:value={settings.embeddingMaxConcurrent} />
                    {:else}
                        <div class="mb-2">
                            <Check name={language.hypaV3Settings.enableSimilarityCorrectionLabel} bind:check={settings.enableSimilarityCorrection} />
                        </div>
                    {/if}
                </Accordion>
            {/if}

            <div class="mb-8"></div>
        {:else if (DBState.db.supaModelType !== 'none' && DBState.db.hypav2 === false && DBState.db.hypaV3 === false)}
            <span class="mb-2 text-textcolor2 text-sm text-wrap wrap-break-word max-w-full">{language.supaDesc}</span>
            <span class="text-textcolor mt-4">{language.SuperMemory} {language.model}</span>
            <SelectInput className="mt-2 mb-2" bind:value={DBState.db.supaModelType}>
                <OptionInput value="distilbart" >distilbart-cnn-6-6 (Free/Local)</OptionInput>
                <OptionInput value="instruct35" >OpenAI 3.5 Turbo Instruct</OptionInput>
                <OptionInput value="subModel" >{language.submodel}</OptionInput>
            </SelectInput>
            <span class="text-textcolor">{language.maxSupaChunkSize}</span>
            <NumberInput size="sm" marginBottom bind:value={DBState.db.maxSupaChunkSize} min={100} />
            {#if DBState.db.supaModelType === 'davinci' || DBState.db.supaModelType === 'curie' || DBState.db.supaModelType === 'instruct35'}
                <span class="text-textcolor">{language.SuperMemory} OpenAI Key</span>
                <TextInput size="sm" marginBottom bind:value={DBState.db.supaMemoryKey}/>
            {/if}
            {#if DBState.db.supaModelType !== 'none'}
                <span class="text-textcolor">{language.SuperMemory} Prompt</span>
                <TextInput size="sm" marginBottom bind:value={DBState.db.supaMemoryPrompt} placeholder="Leave it blank to use default"/>
            {/if}
            <div class="flex">
                <Check bind:check={DBState.db.hypaMemory} name={language.enable + ' ' + language.HypaMemory}/>
            </div>
        {/if}

        <span class="text-textcolor">{language.embedding}</span>
        <SelectInput className="mb-4" bind:value={DBState.db.hypaModel}>
            {#if 'gpu' in navigator}
                <OptionInput value="MiniLMGPU">MiniLM L6 v2 (GPU)</OptionInput>
                <OptionInput value="nomicGPU">Nomic Embed Text v1.5 (GPU)</OptionInput>
                <OptionInput value="bgeSmallEnGPU">BGE Small English (GPU)</OptionInput>
                <OptionInput value="bgem3GPU">BGE Medium 3 (GPU)</OptionInput>
                <OptionInput value="multiMiniLMGPU">Multilingual MiniLM L12 v2 (GPU)</OptionInput>
                <OptionInput value="bgeM3KoGPU">BGE Medium 3 Korean (GPU)</OptionInput>
            {/if}
            <OptionInput value="MiniLM">MiniLM L6 v2 (CPU)</OptionInput>
            <OptionInput value="nomic">Nomic Embed Text v1.5 (CPU)</OptionInput>
            <OptionInput value="bgeSmallEn">BGE Small English (CPU)</OptionInput>
            <OptionInput value="bgem3">BGE Medium 3 (CPU)</OptionInput>
            <OptionInput value="multiMiniLM">Multilingual MiniLM L12 v2 (CPU)</OptionInput>
            <OptionInput value="bgeM3Ko">BGE Medium 3 Korean (CPU)</OptionInput>
            <OptionInput value="openai3small">OpenAI text-embedding-3-small</OptionInput>
            <OptionInput value="openai3large">OpenAI text-embedding-3-large</OptionInput>
            <OptionInput value="ada">OpenAI Ada</OptionInput>
            <OptionInput value="custom">Custom (OpenAI-compatible)</OptionInput>
        </SelectInput>

        {#if DBState.db.hypaModel === 'openai3small' || DBState.db.hypaModel === 'openai3large' || DBState.db.hypaModel === 'ada'}
            <span class="text-textcolor">OpenAI API Key</span>
            <TextInput size="sm" marginBottom bind:value={DBState.db.supaMemoryKey}/>
        {/if}

        {#if DBState.db.hypaModel === 'custom'}
            <span class="text-textcolor">URL</span>
            <TextInput size="sm" marginBottom bind:value={DBState.db.hypaCustomSettings.url}/>
            <span class="text-textcolor">Key/Password</span>
            <TextInput size="sm" marginBottom bind:value={DBState.db.hypaCustomSettings.key}/>
            <span class="text-textcolor">Request Model</span>
            <TextInput size="sm" marginBottom bind:value={DBState.db.hypaCustomSettings.model}/>
        {/if}

    </Accordion>
{/if}
