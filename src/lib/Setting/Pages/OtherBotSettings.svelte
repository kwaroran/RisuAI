<script lang="ts">
    import Check from "src/lib/UI/GUI/CheckInput.svelte";
    import { language } from "src/lang";
    import Help from "src/lib/Others/Help.svelte";
    import { selectSingleFile } from "src/ts/util";
    
    import { DBState } from 'src/ts/stores.svelte';
    import { isTauri, saveAsset } from "src/ts/globalApi.svelte";
    import NumberInput from "src/lib/UI/GUI/NumberInput.svelte";
    import TextInput from "src/lib/UI/GUI/TextInput.svelte";
    import SelectInput from "src/lib/UI/GUI/SelectInput.svelte";
    import OptionInput from "src/lib/UI/GUI/OptionInput.svelte";
    import SliderInput from "src/lib/UI/GUI/SliderInput.svelte";
    import Button from "src/lib/UI/GUI/Button.svelte";
    import { getCharImage } from "src/ts/characters";
    import Arcodion from "src/lib/UI/Arcodion.svelte";
    import CheckInput from "src/lib/UI/GUI/CheckInput.svelte";
    import TextAreaInput from "src/lib/UI/GUI/TextAreaInput.svelte";
    import { untrack } from "svelte";
    import { tokenizePreset } from "src/ts/process/prompt";
    import { getCharToken } from "src/ts/tokenizer";
    import { selectedCharID } from "src/ts/stores.svelte";

    $effect.pre(() => {
        DBState.db.NAIImgConfig ??= {
            width: 512,
            height: 512,
            sampler: 'k_euler',
            steps: 100,
            scale: 1,
            sm: false,
            sm_dyn: false,
            strength: 0.5,
            noise: 0.5,
            image: '',
            InfoExtracted: 0.5,
            RefStrength: 0.5,
            refimage: '',
            autoSmea:false,
            legacy_uc:false,
            use_coords:false,
            v4_prompt:{
                caption:{
                    base_caption:'',
                    char_captions:[]
                },
                use_coords:false,
                use_order:true
            },
            v4_negative_prompt:{
                caption:{
                    base_caption:'',
                    char_captions:[]
                },
                legacy_uc:false,
            }
        }
        if (DBState.db.NAIImgConfig.sampler === 'ddim_v3'){
            DBState.db.NAIImgConfig.sm = false
            DBState.db.NAIImgConfig.sm_dyn = false
        }
    });

    let submenu = $state(DBState.db.useLegacyGUI ? -1 : 0);

    // HypaV3
    $effect(() => {
        const newValue = Math.min(DBState.db.hypaV3Settings.recentMemoryRatio, 1);

        untrack(() => {
            DBState.db.hypaV3Settings.recentMemoryRatio = newValue;
            
            if (newValue + DBState.db.hypaV3Settings.similarMemoryRatio > 1) {
                DBState.db.hypaV3Settings.similarMemoryRatio = 1 - newValue;
            }
        })
    });

    $effect(() => {
        const newValue = Math.min(DBState.db.hypaV3Settings.similarMemoryRatio, 1);

        untrack(() => {
            DBState.db.hypaV3Settings.similarMemoryRatio = newValue;

            if (newValue + DBState.db.hypaV3Settings.recentMemoryRatio > 1) {
                DBState.db.hypaV3Settings.recentMemoryRatio = 1 - newValue;
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

    let imageModel = '';

    // add init NAI V4
    // if(DBState.db.NAIImgConfig.autoSmea === undefined) DBState.db.NAIImgConfig.autoSmea = false;
    // if(DBState.db.NAIImgConfig.use_coords === undefined) DBState.db.NAIImgConfig.use_coords = false;
    // if(DBState.db.NAIImgConfig.v4_prompt.use_coords === undefined) DBState.db.NAIImgConfig.v4_prompt.use_coords = false;
    // if(DBState.db.NAIImgConfig.v4_prompt.use_order === undefined) DBState.db.NAIImgConfig.v4_prompt.use_order = false;
    // if(DBState.db.NAIImgConfig.v4_negative_prompt.legacy_uc === undefined) DBState.db.NAIImgConfig.v4_negative_prompt.legacy_uc = false;

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
    <Arcodion name={language.imageGeneration} styled disabled={submenu !== -1}>
        <span class="text-textcolor mt-2">{language.imageGeneration} {language.provider} <Help key="sdProvider"/></span>
        <SelectInput className="mt-2 mb-4" bind:value={DBState.db.sdProvider}>
            <OptionInput value="" >None</OptionInput>
            <OptionInput value="webui" >Stable Diffusion WebUI</OptionInput>
            <OptionInput value="novelai" >Novel AI</OptionInput>
            <OptionInput value="dalle" >Dall-E</OptionInput>
            <OptionInput value="stability" >Stability API</OptionInput>
            <OptionInput value="fal" >Fal.ai</OptionInput>
            <OptionInput value="comfyui" >ComfyUI</OptionInput>

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
            <TextInput size="sm" marginBottom placeholder="nai-diffusion-4-full" bind:value={DBState.db.NAIImgModel}/>
            <SelectInput className="mt-2 mb-4" bind:value={imageModel} onchange={(e)=>{
                DBState.db.NAIImgModel = imageModel;
            }}>
                <OptionInput value="" >선택하여 자동입력</OptionInput>
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
            || DBState.db.NAIImgModel === 'nai-diffusion-4-curated-preview'}
                <SelectInput className="mt-2 mb-4" bind:value={DBState.db.NAIImgConfig.sampler}>
                    <OptionInput value="k_euler_ancestral" >(Recommended)Euler Ancestral</OptionInput>
                    <OptionInput value="k_dpmpp_2s_ancestral" >(Recommended)DPM++ 2S Ancestral</OptionInput>
                    <OptionInput value="k_dpmpp_2m_sde" >(Recommended)DPM++ 2M SDE</OptionInput>
                    <OptionInput value="k_euler" >(Other)Euler</OptionInput>
                    <OptionInput value="k_dpmpp_2m" >(Other)DPM++ 2M</OptionInput>
                    <OptionInput value="k_dpmpp_sde" >(Other)DPM++ SDE</OptionInput>
                </SelectInput>
            {:else}
                <SelectInput className="mt-2 mb-4" bind:value={DBState.db.NAIImgConfig.sampler}>
                    <OptionInput value="k_euler" >Euler</OptionInput>
                    <OptionInput value="k_euler_ancestral" >Euler Ancestral</OptionInput>
                    <OptionInput value="k_dpmpp_2s_ancestral" >DPM++ 2S Ancestral</OptionInput>
                    <OptionInput value="k_dpmpp_2m" >DPM++ 2M</OptionInput>
                    <OptionInput value="k_dpmpp_sde" >DPM++ SDE</OptionInput>
                    <OptionInput value="k_dpmpp_2s" >DPM++ 2S</OptionInput>
                    <OptionInput value="ddim_v3" >DDIM</OptionInput>
                </SelectInput>
            {/if}

            <span class="text-textcolor">steps</span>
            <NumberInput size="sm" marginBottom min={0} max={2048} bind:value={DBState.db.NAIImgConfig.steps}/>
            <span class="text-textcolor">CFG scale</span>
            <NumberInput size="sm" marginBottom min={0} max={2048} bind:value={DBState.db.NAIImgConfig.scale}/>

            {#if !DBState.db.NAII2I || DBState.db.NAIImgConfig.sampler !== 'ddim_v3'}
                <Check bind:check={DBState.db.NAIImgConfig.sm} name="Use SMEA"/>
            {:else if DBState.db.NAIImgModel === 'nai-diffusion-4-full'
            || DBState.db.NAIImgModel === 'nai-diffusion-4-curated-preview'}
                <Check bind:check={DBState.db.NAIImgConfig.sm_dyn} name='Use DYN'/>
            {/if}
            <Check bind:check={DBState.db.NAII2I} name="Enable I2I"/>

            {#if DBState.db.NAIImgModel === 'nai-diffusion-4-full'
            || DBState.db.NAIImgModel === 'nai-diffusion-4-curated-preview'}
                <Check bind:check={DBState.db.NAIImgConfig.autoSmea} name='Auto Smea'/>
                <Check bind:check={DBState.db.NAIImgConfig.use_coords} name='Use coords'/>
                <Check bind:check={DBState.db.NAIImgConfig.legacy_uc} name='Use legacy uc'/>

                <Check bind:check={DBState.db.NAIImgConfig.v4_prompt.use_coords} name='Use v4 prompt coords'/>
                <Check bind:check={DBState.db.NAIImgConfig.v4_prompt.use_order} name='Use v4 prompt order'/>

                <Check bind:check={DBState.db.NAIImgConfig.v4_negative_prompt.legacy_uc} name='Use v4 negative prompt legacy uc'/>
            {/if}

            {#if DBState.db.NAII2I}

                <span class="text-textcolor mt-4">Strength</span>
                <SliderInput min={0} max={0.99} step={0.01} bind:value={DBState.db.NAIImgConfig.strength}/>
                <span class="text-textcolor2 mb-6 text-sm">{DBState.db.NAIImgConfig.strength}</span>
                <span class="text-textcolor">Noise</span>
                <SliderInput min={0} max={0.99} step={0.01} bind:value={DBState.db.NAIImgConfig.noise}/>
                <span class="text-textcolor2 mb-6 text-sm">{DBState.db.NAIImgConfig.noise}</span>

                <span class="text-textcolor">Base image</span>
                <button onclick={async () => {
                    const img = await selectSingleFile([
                        'jpg',
                        'jpeg',
                        'png',
                        'webp'
                    ])
                    if(!img){
                        return null
                    }
                    const saveId = await saveAsset(img.data)
                    DBState.db.NAIImgConfig.image = saveId
                }}>
                    {#if DBState.db.NAIImgConfig.image === ''}
                        <div class="rounded-md h-20 w-20 shadow-lg bg-textcolor2 cursor-pointer hover:text-green-500"></div>
                    {:else}
                        {#await getCharImage(DBState.db.NAIImgConfig.image, 'css')}
                            <div class="rounded-md h-20 w-20 shadow-lg bg-textcolor2 cursor-pointer hover:text-green-500"></div>
                        {:then im}
                            <div class="rounded-md h-20 w-20 shadow-lg bg-textcolor2 cursor-pointer hover:text-green-500" style={im}></div>
                        {/await}
                    {/if}
                </button>

            {/if}

            <Check bind:check={DBState.db.NAIREF} name="Enable Reference" className="mt-4"/>

            {#if DBState.db.NAIREF}


                <span class="text-textcolor mt-4">Information Extracted</span>
                <SliderInput min={0} max={1} step={0.01} bind:value={DBState.db.NAIImgConfig.InfoExtracted}/>
                <span class="text-textcolor2 mb-6 text-sm">{DBState.db.NAIImgConfig.InfoExtracted}</span>
                <span class="text-textcolor">Reference Strength</span>
                <SliderInput min={0} max={1} step={0.01} bind:value={DBState.db.NAIImgConfig.RefStrength}/>
                <span class="text-textcolor2 mb-6 text-sm">{DBState.db.NAIImgConfig.RefStrength}</span>




                <span class="text-textcolor">Reference image</span>
                <button onclick={async () => {
                    const img = await selectSingleFile([
                        'jpg',
                        'jpeg',
                        'png',
                        'webp'
                    ])
                    if(!img){
                        return null
                    }
                    const saveId = await saveAsset(img.data)
                    DBState.db.NAIImgConfig.refimage = saveId
                }}>
                    {#if DBState.db.NAIImgConfig.refimage === ''}
                        <div class="rounded-md h-20 w-20 shadow-lg bg-textcolor2 cursor-pointer hover:text-green-500"></div>
                    {:else}
                        {#await getCharImage(DBState.db.NAIImgConfig.refimage, 'css')}
                            <div class="rounded-md h-20 w-20 shadow-lg bg-textcolor2 cursor-pointer hover:text-green-500"></div>
                        {:then im}
                            <div class="rounded-md h-20 w-20 shadow-lg bg-textcolor2 cursor-pointer hover:text-green-500" style={im}></div>
                        {/await}
                    {/if}
                </button>
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
    </Arcodion>
{/if}

{#if submenu === 1 || submenu === -1}
<Arcodion name="TTS" styled disabled={submenu !== -1}>
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

</Arcodion>
{/if}

{#if submenu === 2 || submenu === -1}
<Arcodion name={language.emotionImage} styled disabled={submenu !== -1}>
    <span class="text-textcolor mt-2">{language.emotionMethod}</span>

    <SelectInput className="mt-2 mb-4" bind:value={DBState.db.emotionProcesser}>
        <OptionInput value="submodel" >Ax. Model</OptionInput>
        <OptionInput value="embedding" >MiniLM-L6-v2</OptionInput>
    </SelectInput>
</Arcodion>
{/if}

{#if submenu === 0 || submenu === -1}
    <Arcodion name={language.longTermMemory} styled disabled={submenu !== -1}>
        <span class="text-textcolor mt-4">{language.type}</span>

        <SelectInput value={
            DBState.db.hypaV3 ? 'hypaV3' :
            DBState.db.hypav2 ? 'hypaV2' :
            DBState.db.supaModelType !== 'none' ? 'supaMemory' :
            DBState.db.hanuraiEnable ? 'hanuraiMemory' : 'none'
        } onchange={(v) => {
            //@ts-ignore
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
                DBState.db.supaModelType = 'subModel'
                DBState.db.memoryAlgorithmType = 'hypaMemoryV3'
                DBState.db.hypav2 = false
                DBState.db.hanuraiEnable = false
                DBState.db.hypaV3 = true
                DBState.db.hypaV3Settings.memoryTokensRatio = 0.2
                DBState.db.hypaV3Settings.extraSummarizationRatio = 0
                DBState.db.hypaV3Settings.maxChatsPerSummary = 4
                DBState.db.hypaV3Settings.recentMemoryRatio = 0.4
                DBState.db.hypaV3Settings.similarMemoryRatio = 0.4
                DBState.db.hypaV3Settings.enableSimilarityCorrection = false
                DBState.db.hypaV3Settings.preserveOrphanedMemory = false
                DBState.db.hypaV3Settings.processRegexScript = false
                DBState.db.hypaV3Settings.doNotSummarizeUserMessage = false
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
            <span class="mb-2 text-textcolor2 text-sm text-wrap break-words max-w-full">{language.hanuraiDesc}</span>
            <span>Chunk Size</span>
            <NumberInput size="sm" marginBottom bind:value={DBState.db.hanuraiTokens} min={100} />
            <div class="flex">
                <Check bind:check={DBState.db.hanuraiSplit} name="Text Spliting"/>
            </div>
        {:else if DBState.db.hypav2}
            <span class="mb-2 text-textcolor2 text-sm text-wrap break-words max-w-full">{language.hypaV2Desc}</span>
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
            <span class="mb-2 text-textcolor2 text-sm text-wrap break-words max-w-full">{language.hypaV3Settings.descriptionLabel}</span>
            <span class="text-textcolor mt-4">{language.SuperMemory} {language.model}</span>
            <SelectInput className="mt-2 mb-2" bind:value={DBState.db.supaModelType}>
                <OptionInput value="distilbart">distilbart-cnn-6-6 (Free/Local)</OptionInput>
                <OptionInput value="subModel">{language.submodel}</OptionInput>
            </SelectInput>
            <span class="text-textcolor">{language.summarizationPrompt} <Help key="summarizationPrompt"/></span>
            <div class="mb-2">
                <TextAreaInput size="sm" placeholder={language.hypaV3Settings.supaMemoryPromptPlaceHolder} bind:value={DBState.db.supaMemoryPrompt} />
            </div>
            {#await getMaxMemoryRatio() then maxMemoryRatio}
            <span class="text-textcolor">{language.hypaV3Settings.maxMemoryTokensRatioLabel}</span>
            <NumberInput marginBottom disabled size="sm" value={maxMemoryRatio} />
            {:catch error}
            <span class="text-red-400">{language.hypaV3Settings.maxMemoryTokensRatioError}</span>
            {/await}
            <span class="text-textcolor">{language.hypaV3Settings.memoryTokensRatioLabel}</span>
            <SliderInput marginBottom min={0} max={1} step={0.01} fixed={2} bind:value={DBState.db.hypaV3Settings.memoryTokensRatio} />
            <span class="text-textcolor">{language.hypaV3Settings.extraSummarizationRatioLabel}</span>
            <SliderInput marginBottom min={0} max={1 - DBState.db.hypaV3Settings.memoryTokensRatio} step={0.01} fixed={2} bind:value={DBState.db.hypaV3Settings.extraSummarizationRatio} />
            <span class="text-textcolor">{language.hypaV3Settings.maxChatsPerSummaryLabel}</span>
            <NumberInput marginBottom size="sm" min={1} bind:value={DBState.db.hypaV3Settings.maxChatsPerSummary} />
            <span class="text-textcolor">{language.hypaV3Settings.recentMemoryRatioLabel}</span>
            <SliderInput marginBottom min={0} max={1} step={0.01} fixed={2} bind:value={DBState.db.hypaV3Settings.recentMemoryRatio} />
            <span class="text-textcolor">{language.hypaV3Settings.similarMemoryRatioLabel}</span>
            <SliderInput marginBottom min={0} max={1} step={0.01} fixed={2} bind:value={DBState.db.hypaV3Settings.similarMemoryRatio} />
            <span class="text-textcolor">{language.hypaV3Settings.randomMemoryRatioLabel}</span>
            <NumberInput marginBottom disabled size="sm" value={parseFloat((1 - DBState.db.hypaV3Settings.recentMemoryRatio - DBState.db.hypaV3Settings.similarMemoryRatio).toFixed(2))} />
            <div class="flex mb-2">
                <Check name={language.hypaV3Settings.enableSimilarityCorrectionLabel} bind:check={DBState.db.hypaV3Settings.enableSimilarityCorrection} />
            </div>
            <div class="flex mb-2">
                <Check name={language.hypaV3Settings.preserveOrphanedMemoryLabel} bind:check={DBState.db.hypaV3Settings.preserveOrphanedMemory} />
            </div>
            <div class="flex mb-2">
                <Check name={language.hypaV3Settings.applyRegexScriptWhenRerollingLabel} bind:check={DBState.db.hypaV3Settings.processRegexScript} />
            </div>
            <div class="flex mb-2">
                <Check name={language.hypaV3Settings.doNotSummarizeUserMessageLabel} bind:check={DBState.db.hypaV3Settings.doNotSummarizeUserMessage} />
            </div>
        {:else if (DBState.db.supaModelType !== 'none' && DBState.db.hypav2 === false && DBState.db.hypaV3 === false)}
            <span class="mb-2 text-textcolor2 text-sm text-wrap break-words max-w-full">{language.supaDesc}</span>
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
        <SelectInput className="mt-2 mb-2" bind:value={DBState.db.hypaModel}>
            {#if 'gpu' in navigator}
                <OptionInput value="nomicGPU">Nomic Embed Text v1.5 (GPU)</OptionInput>
                <OptionInput value="bgeSmallEnGPU">BGE Small English (GPU)</OptionInput>
                <OptionInput value="bgem3GPU">BGE Medium 3 (GPU)</OptionInput>
            {/if}
            <OptionInput value="MiniLM">MiniLM L6 v2 (CPU)</OptionInput>
            <OptionInput value="nomic">Nomic Embed Text v1.5 (CPU)</OptionInput>
            <OptionInput value="bgeSmallEn">BGE Small English (CPU)</OptionInput>
            <OptionInput value="bgem3">BGE Medium 3 (CPU)</OptionInput>
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

    </Arcodion>
{/if}