<script lang="ts">
    import Check from "src/lib/UI/GUI/CheckInput.svelte";
    import { language } from "src/lang";
    import Help from "src/lib/Others/Help.svelte";
    import { selectSingleFile } from "src/ts/util";
    import { DataBase } from "src/ts/storage/database";
    import { isTauri, saveAsset } from "src/ts/storage/globalApi";
    import NumberInput from "src/lib/UI/GUI/NumberInput.svelte";
    import TextInput from "src/lib/UI/GUI/TextInput.svelte";
    import SelectInput from "src/lib/UI/GUI/SelectInput.svelte";
    import OptionInput from "src/lib/UI/GUI/OptionInput.svelte";
    import SliderInput from "src/lib/UI/GUI/SliderInput.svelte";
    import Button from "src/lib/UI/GUI/Button.svelte";
    import { getCharImage } from "src/ts/characters";
    import Arcodion from "src/lib/UI/Arcodion.svelte";
  import CheckInput from "src/lib/UI/GUI/CheckInput.svelte";
    $:{
        $DataBase.NAIImgConfig ??= {
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
            refimage: ''
        }
        if ($DataBase.NAIImgConfig.sampler === 'ddim_v3'){
            $DataBase.NAIImgConfig.sm = false
            $DataBase.NAIImgConfig.sm_dyn = false
        }
    }

    let submenu = $DataBase.useLegacyGUI ? -1 : 0
</script>
<h2 class="mb-2 text-2xl font-bold mt-2">{language.otherBots}</h2>


{#if submenu !== -1}
    <div class="flex w-full rounded-md border border-darkborderc mb-4">
        <button on:click={() => {
            submenu = 0
        }} class="p-2 flex-1 border-r border-darkborderc" class:bg-darkbutton={submenu === 0}>
            <span>{language.longTermMemory}</span>
        </button>
        <button on:click={() => {
            submenu = 1
        }} class="p2 flex-1 border-r border-darkborderc" class:bg-darkbutton={submenu === 1}>
            <span>TTS</span>
        </button>
        <button on:click={() => {
            submenu = 2
        }} class="p-2 flex-1 border-r border-darkborderc" class:bg-darkbutton={submenu === 2}>
            <span>{language.emotionImage}</span>
        </button>
        <button on:click={() => {
            submenu = 3
        }} class="p-2 flex-1" class:bg-darkbutton={submenu === 3}>
            <span>{language.imageGeneration}</span>
        </button>
    </div>
{/if}

{#if submenu === 3 || submenu === -1}
    <Arcodion name={language.imageGeneration} styled disabled={submenu !== -1}>
        <span class="text-textcolor mt-2">{language.imageGeneration} {language.provider} <Help key="sdProvider"/></span>
        <SelectInput className="mt-2 mb-4" bind:value={$DataBase.sdProvider}>
            <OptionInput value="" >None</OptionInput>
            <OptionInput value="webui" >Stable Diffusion WebUI</OptionInput>
            <OptionInput value="novelai" >Novel AI</OptionInput>
            <OptionInput value="dalle" >Dall-E</OptionInput>
            <OptionInput value="stability" >Stability API</OptionInput>
            <OptionInput value="comfy" >ComfyUI</OptionInput>
            <OptionInput value="fal" >Fal.ai</OptionInput>
        </SelectInput>
        
        {#if $DataBase.sdProvider === 'webui'}
        <span class="text-draculared text-xs mb-2">You must use WebUI with --api flag</span>
            <span class="text-draculared text-xs mb-2">You must use WebUI without agpl license or use unmodified version with agpl license to observe the contents of the agpl license.</span>
            {#if !isTauri}
                <span class="text-draculared text-xs mb-2">You are using web version. you must use ngrok or other tunnels to use your local webui.</span>
            {/if}
            <span class="text-textcolor mt-2">WebUI {language.providerURL}</span>
            <TextInput size="sm" marginBottom placeholder="https://..." bind:value={$DataBase.webUiUrl}/>
            <span class="text-textcolor">Steps</span>
            <NumberInput size="sm" marginBottom min={0} max={100} bind:value={$DataBase.sdSteps}/>
            
            <span class="text-textcolor">CFG Scale</span>
            <NumberInput size="sm" marginBottom min={0} max={20} bind:value={$DataBase.sdCFG}/>
        
            <span class="text-textcolor">Width</span>
            <NumberInput size="sm" marginBottom min={0} max={2048} bind:value={$DataBase.sdConfig.width}/>
            <span class="text-textcolor">Height</span>
            <NumberInput size="sm" marginBottom min={0} max={2048} bind:value={$DataBase.sdConfig.height}/>
            <span class="text-textcolor">Sampler</span>
            <TextInput size="sm" marginBottom bind:value={$DataBase.sdConfig.sampler_name}/>
            
            <div class="flex items-center mt-2">
                <Check bind:check={$DataBase.sdConfig.enable_hr} name='Enable Hires'/>
            </div>
            {#if $DataBase.sdConfig.enable_hr === true}
                <span class="text-textcolor">denoising_strength</span>
                <NumberInput size="sm" marginBottom  min={0} max={10} bind:value={$DataBase.sdConfig.denoising_strength}/>
                <span class="text-textcolor">hr_scale</span>
                <NumberInput size="sm" marginBottom  min={0} max={10} bind:value={$DataBase.sdConfig.hr_scale}/>
                <span class="text-textcolor">Upscaler</span>
                <TextInput size="sm" marginBottom bind:value={$DataBase.sdConfig.hr_upscaler}/>
            {/if}
        {/if}
        
        {#if $DataBase.sdProvider === 'novelai'}
            <span class="text-textcolor mt-2">Novel AI {language.providerURL}</span>
            <TextInput size="sm" marginBottom placeholder="https://image.novelai.net" bind:value={$DataBase.NAIImgUrl}/>
            <span class="text-textcolor">API Key</span>
            <TextInput size="sm" marginBottom placeholder="pst-..." bind:value={$DataBase.NAIApiKey}/>
        
            <span class="text-textcolor">Model</span>
            <TextInput size="sm" marginBottom placeholder="nai-diffusion-3" bind:value={$DataBase.NAIImgModel}/>
        
            <span class="text-textcolor">Width</span>
            <NumberInput size="sm" marginBottom min={0} max={2048} bind:value={$DataBase.NAIImgConfig.width}/>
            <span class="text-textcolor">Height</span>
            <NumberInput size="sm" marginBottom min={0} max={2048} bind:value={$DataBase.NAIImgConfig.height}/>
            <span class="text-textcolor">Sampler</span>
            <SelectInput className="mt-2 mb-4" bind:value={$DataBase.NAIImgConfig.sampler}>
                <OptionInput value="k_euler" >Euler</OptionInput>
                <OptionInput value="k_euler_ancestral" >Euler Ancestral</OptionInput>
                <OptionInput value="k_dpmpp_2s_ancestral" >DPM++ 2S Ancestral</OptionInput>
                <OptionInput value="k_dpmpp_2m" >DPM++ 2M</OptionInput>
                <OptionInput value="k_dpmpp_sde" >DPM++ SDE</OptionInput>
                <OptionInput value="k_dpmpp_2s" >DPM++ 2S</OptionInput>
                <OptionInput value="ddim_v3" >DDIM</OptionInput>
            </SelectInput>
            <span class="text-textcolor">steps</span>
            <NumberInput size="sm" marginBottom min={0} max={2048} bind:value={$DataBase.NAIImgConfig.steps}/>
            <span class="text-textcolor">CFG scale</span>
            <NumberInput size="sm" marginBottom min={0} max={2048} bind:value={$DataBase.NAIImgConfig.scale}/>
        
            {#if !$DataBase.NAII2I || $DataBase.NAIImgConfig.sampler !== 'ddim_v3'}
                <Check bind:check={$DataBase.NAIImgConfig.sm} name="Use SMEA"/>
                <Check bind:check={$DataBase.NAIImgConfig.sm_dyn} name='Use DYN'/>
            {/if}
            <Check bind:check={$DataBase.NAII2I} name="Enable I2I"/>
        
            {#if $DataBase.NAII2I}
        
                <span class="text-textcolor mt-4">Strength</span>
                <SliderInput min={0} max={0.99} step={0.01} bind:value={$DataBase.NAIImgConfig.strength}/>
                <span class="text-textcolor2 mb-6 text-sm">{$DataBase.NAIImgConfig.strength}</span>
                <span class="text-textcolor">Noise</span>
                <SliderInput min={0} max={0.99} step={0.01} bind:value={$DataBase.NAIImgConfig.noise}/>
                <span class="text-textcolor2 mb-6 text-sm">{$DataBase.NAIImgConfig.noise}</span>
        
                <span class="text-textcolor">Base image</span>
                <button on:click={async () => {
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
                    $DataBase.NAIImgConfig.image = saveId
                }}>
                    {#if $DataBase.NAIImgConfig.image === ''}
                        <div class="rounded-md h-20 w-20 shadow-lg bg-textcolor2 cursor-pointer hover:text-green-500"/>
                    {:else}
                        {#await getCharImage($DataBase.NAIImgConfig.image, 'css')}
                            <div class="rounded-md h-20 w-20 shadow-lg bg-textcolor2 cursor-pointer hover:text-green-500"/>
                        {:then im} 
                            <div class="rounded-md h-20 w-20 shadow-lg bg-textcolor2 cursor-pointer hover:text-green-500" style={im} />                
                        {/await}
                    {/if}
                </button>
        
            {/if}

            <Check bind:check={$DataBase.NAIREF} name="Enable Reference" className="mt-4"/>

            {#if $DataBase.NAIREF}


                <span class="text-textcolor mt-4">Information Extracted</span>
                <SliderInput min={0} max={1} step={0.01} bind:value={$DataBase.NAIImgConfig.InfoExtracted}/>
                <span class="text-textcolor2 mb-6 text-sm">{$DataBase.NAIImgConfig.InfoExtracted}</span>
                <span class="text-textcolor">Reference Strength</span>
                <SliderInput min={0} max={1} step={0.01} bind:value={$DataBase.NAIImgConfig.RefStrength}/>
                <span class="text-textcolor2 mb-6 text-sm">{$DataBase.NAIImgConfig.RefStrength}</span>




                <span class="text-textcolor">Reference image</span>
                <button on:click={async () => {
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
                    $DataBase.NAIImgConfig.refimage = saveId
                }}>
                    {#if $DataBase.NAIImgConfig.refimage === ''}
                        <div class="rounded-md h-20 w-20 shadow-lg bg-textcolor2 cursor-pointer hover:text-green-500"/>
                    {:else}
                        {#await getCharImage($DataBase.NAIImgConfig.refimage, 'css')}
                            <div class="rounded-md h-20 w-20 shadow-lg bg-textcolor2 cursor-pointer hover:text-green-500"/>
                        {:then im} 
                            <div class="rounded-md h-20 w-20 shadow-lg bg-textcolor2 cursor-pointer hover:text-green-500" style={im} />                
                        {/await}
                    {/if}
                </button>
            {/if}
        {/if}


        {#if $DataBase.sdProvider === 'dalle'}
            <span class="text-textcolor">OpenAI API Key</span>
            <TextInput size="sm" marginBottom placeholder="sk-..." bind:value={$DataBase.openAIKey}/>

            <span class="text-textcolor mt-4">Dall-E Quality</span>
            <SelectInput className="mt-2 mb-4" bind:value={$DataBase.dallEQuality}>
                <OptionInput value="standard" >Standard</OptionInput>
                <OptionInput value="hd" >HD</OptionInput>
            </SelectInput>

        {/if}

        {#if $DataBase.sdProvider === 'stability'}
            <span class="text-textcolor">Stability API Key</span>
            <TextInput size="sm" marginBottom placeholder="..." bind:value={$DataBase.stabilityKey}/>

            <span class="text-textcolor">Stability Model</span>
            <SelectInput className="mt-2 mb-4" bind:value={$DataBase.stabilityModel}>
                <OptionInput value="ultra" >SD Ultra</OptionInput>
                <OptionInput value="core" >SD Core</OptionInput>
                <OptionInput value="sd3-large" >SD3 Large</OptionInput>
                <OptionInput value="sd3-medium" >SD3 Medium</OptionInput>
            </SelectInput>

            {#if $DataBase.stabilityModel === 'core'}
                <span class="text-textcolor">SD Core Style</span>
                <SelectInput className="mt-2 mb-4" bind:value={$DataBase.stabllityStyle}>
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

        {#if $DataBase.sdProvider === 'comfy'}
        <span class="text-draculared text-xs mb-2">The first image generated by the prompt will be selected. </span>
            {#if !isTauri}
                <span class="text-draculared text-xs mb-2">"Please run comfyUI with --enable-cors-header."</span>
            {/if}
            <span class="text-textcolor mt-2">ComfyUI {language.providerURL}</span>
            <TextInput size="sm" marginBottom placeholder="http://127.0.0.1:8188" bind:value={$DataBase.comfyUiUrl}/>
            <span class="text-textcolor">Workflow</span>
            <TextInput size="sm" marginBottom placeholder="valid ComfyUI API json (Enable Dev mode Options in ComfyUI)" bind:value={$DataBase.comfyConfig.workflow}/>

            <span class="text-textcolor">Positive Text Node: ID</span>
            <TextInput size="sm" marginBottom placeholder="eg. 1, 3, etc" bind:value={$DataBase.comfyConfig.posNodeID}/>
            <span class="text-textcolor">Positive Text Node: Input Field Name</span>
            <TextInput size="sm" marginBottom placeholder="eg. text" bind:value={$DataBase.comfyConfig.posInputName}/>
            <span class="text-textcolor">Negative Text Node: ID</span>
            <TextInput size="sm" marginBottom placeholder="eg. 1, 3, etc" bind:value={$DataBase.comfyConfig.negNodeID}/>
            <span class="text-textcolor">Positive Text Node: Input Field Name</span>
            <TextInput size="sm" marginBottom placeholder="eg. text" bind:value={$DataBase.comfyConfig.negInputName}/>
            <span class="text-textcolor">Timeout (sec)</span>
            <NumberInput size="sm" marginBottom bind:value={$DataBase.comfyConfig.timeout} min={1} max={120} />
        {/if}

        {#if $DataBase.sdProvider === 'fal'}
            <span class="text-textcolor">Fal.ai API Key</span>
            <TextInput size="sm" marginBottom placeholder="..." bind:value={$DataBase.falToken}/>

            <span class="text-textcolor mt-4">Width</span>
            <NumberInput size="sm" marginBottom min={0} max={2048} bind:value={$DataBase.sdConfig.width}/>
            <span class="text-textcolor mt-4">Height</span>
            <NumberInput size="sm" marginBottom min={0} max={2048} bind:value={$DataBase.sdConfig.height}/>

            <span class="text-textcolor mt-4">Model</span>
            <SelectInput className="mt-2" bind:value={$DataBase.falModel}>
                <OptionInput value="fal-ai/flux/dev" >Flux[Dev]</OptionInput>
                <OptionInput value="fal-ai/flux-lora" >Flux[Dev] with Lora</OptionInput>
                <OptionInput value="fal-ai/flux-pro" >Flux[Pro]</OptionInput>
                <OptionInput value="fal-ai/flux/schnell" >Flux[Schnell]</OptionInput>
            </SelectInput>

            {#if $DataBase.falModel === 'fal-ai/flux-lora'}
                <span class="text-textcolor mt-4">Lora Model URL <Help key="urllora" /></span>
                <TextInput size="sm" marginBottom bind:value={$DataBase.falLora}/>

                <span class="text-textcolor mt-4">Lora Weight</span>
                <SliderInput fixed={2} min={0}  max={2} step={0.01} bind:value={$DataBase.falLoraScale}/>
            {/if}


        {/if}
    </Arcodion>
{/if}

{#if submenu === 1 || submenu === -1}
<Arcodion name="TTS" styled disabled={submenu !== -1}>
    <span class="text-textcolor mt-2">Auto Speech</span>
    <CheckInput bind:check={$DataBase.ttsAutoSpeech}/>

    <span class="text-textcolor mt-2">ElevenLabs API key</span>
    <TextInput size="sm" marginBottom bind:value={$DataBase.elevenLabKey}/>
    
    <span class="text-textcolor mt-2">VOICEVOX URL</span>
    <TextInput size="sm" marginBottom bind:value={$DataBase.voicevoxUrl}/>
    
    <span class="text-textcolor">OpenAI Key</span>
    <TextInput size="sm" marginBottom bind:value={$DataBase.openAIKey}/>

    <span class="text-textcolor mt-2">NovelAI API key</span>
    <TextInput size="sm" marginBottom placeholder="pst-..." bind:value={$DataBase.NAIApiKey}/>
    
    <span class="text-textcolor">Huggingface Key</span>
    <TextInput size="sm" marginBottom bind:value={$DataBase.huggingfaceKey} placeholder="hf_..."/>

    <span class="text-textcolor">fish-speech API Key</span>
    <TextInput size="sm" marginBottom bind:value={$DataBase.fishSpeechKey}/>

</Arcodion>
{/if}

{#if submenu === 2 || submenu === -1}
<Arcodion name={language.emotionImage} styled disabled={submenu !== -1}>
    <span class="text-textcolor mt-2">{language.emotionMethod}</span>

    <SelectInput className="mt-2 mb-4" bind:value={$DataBase.emotionProcesser}>
        <OptionInput value="submodel" >Ax. Model</OptionInput>
        <OptionInput value="embedding" >MiniLM-L6-v2</OptionInput>
    </SelectInput>
</Arcodion>
{/if}

{#if submenu === 0 || submenu === -1}
    <Arcodion name={language.longTermMemory} styled disabled={submenu !== -1}>
        <span class="text-textcolor mt-4">{language.type}</span>

        <SelectInput value={
            $DataBase.hypav2 ? 'hypaV2' :
            $DataBase.supaModelType !== 'none' ? 'supaMemory' :
            $DataBase.hanuraiEnable ? 'hanuraiMemory' : 'none'
        } on:change={(v) => {
            //@ts-ignore
            const value = v.target.value
            if (value === 'supaMemory'){
                $DataBase.supaModelType = 'distilbart'
                $DataBase.memoryAlgorithmType = 'supaMemory'
                $DataBase.hypav2 = false
                $DataBase.hanuraiEnable = false
            } else if (value === 'hanuraiMemory'){
                $DataBase.supaModelType = 'none'
                $DataBase.memoryAlgorithmType = 'hanuraiMemory'
                $DataBase.hypav2 = false
                $DataBase.hanuraiEnable = true
            } else if (value === 'hypaV2') {
                $DataBase.supaModelType = 'distilbart'
                $DataBase.memoryAlgorithmType = 'hypaMemoryV2'
                $DataBase.hypav2= true
                $DataBase.hanuraiEnable = false
            } else {
                $DataBase.supaModelType = 'none'
                $DataBase.memoryAlgorithmType = 'none'
                $DataBase.hypav2 = false
                $DataBase.hanuraiEnable = false
            }
        }}>
            <OptionInput value="none" >None</OptionInput>
            <OptionInput value="supaMemory" >{language.SuperMemory}</OptionInput>
            <OptionInput value="hypaV2" >{language.HypaMemory} V2</OptionInput>
            <OptionInput value="hanuraiMemory" >{language.hanuraiMemory}</OptionInput>
        </SelectInput>

        {#if $DataBase.hanuraiEnable}
            <span class="mb-2 text-textcolor2 text-sm text-wrap break-words max-w-full">{language.hanuraiDesc}</span>
            <span>Chunk Size</span>
            <NumberInput size="sm" marginBottom bind:value={$DataBase.hanuraiTokens} min={100} />
            <div class="flex">
                <Check bind:check={$DataBase.hanuraiSplit} name="Text Spliting"/>
            </div>
        {:else if $DataBase.hypav2}
            <span class="mb-2 text-textcolor2 text-sm text-wrap break-words max-w-full">{language.hypaV2Desc}</span>
            <span class="text-textcolor mt-4">{language.SuperMemory} {language.model}</span>
            <SelectInput className="mt-2 mb-2" bind:value={$DataBase.supaModelType}>
                <OptionInput value="distilbart">distilbart-cnn-6-6 (Free/Local)</OptionInput>
                <OptionInput value="instruct35">OpenAI 3.5 Turbo Instruct</OptionInput>
                <OptionInput value="subModel">{language.submodel}</OptionInput>
            </SelectInput>
            {#if $DataBase.supaModelType === 'davinci' || $DataBase.supaModelType === 'curie' || $DataBase.supaModelType === 'instruct35'}
            <span class="text-textcolor">{language.SuperMemory} OpenAI Key</span>
            <TextInput size="sm" marginBottom bind:value={$DataBase.supaMemoryKey}/>
            {/if}
            <span class="text-textcolor">{language.SuperMemory} Prompt</span>
            <TextInput size="sm" marginBottom bind:value={$DataBase.supaMemoryPrompt} placeholder="Leave it blank to use default"/>
            <span class="text-textcolor">{language.HypaMemory} Model</span>
            <SelectInput className="mt-2 mb-2" bind:value={$DataBase.hypaModel}>
                <OptionInput value="MiniLM">MiniLM-L6-v2 (Free / Local)</OptionInput>
                <OptionInput value="nomic">Nomic (Free / Local)</OptionInput>
                <OptionInput value="ada">OpenAI Ada (Davinci / Curie Only)</OptionInput>
            </SelectInput>
            <span class="text-textcolor">{language.hypaChunkSize}</span>
            <NumberInput size="sm" marginBottom bind:value={$DataBase.hypaChunkSize} min={100} />
            <span class="text-textcolor">{language.hypaAllocatedTokens}</span>
            <NumberInput size="sm" marginBottom bind:value={$DataBase.hypaAllocatedTokens} min={100} />
        {:else if ($DataBase.supaModelType !== 'none' && $DataBase.hypav2 === false)}
            <span class="mb-2 text-textcolor2 text-sm text-wrap break-words max-w-full">{language.supaDesc}</span>
            <span class="text-textcolor mt-4">{language.SuperMemory} {language.model}</span>
            <SelectInput className="mt-2 mb-2" bind:value={$DataBase.supaModelType}>
                <OptionInput value="distilbart" >distilbart-cnn-6-6 (Free/Local)</OptionInput>
                <OptionInput value="instruct35" >OpenAI 3.5 Turbo Instruct</OptionInput>
                <OptionInput value="subModel" >{language.submodel}</OptionInput>
            </SelectInput>
            <span class="text-textcolor">{language.maxSupaChunkSize}</span>
            <NumberInput size="sm" marginBottom bind:value={$DataBase.maxSupaChunkSize} min={100} />
            {#if $DataBase.supaModelType === 'davinci' || $DataBase.supaModelType === 'curie' || $DataBase.supaModelType === 'instruct35'}
                <span class="text-textcolor">{language.SuperMemory} OpenAI Key</span>
                <TextInput size="sm" marginBottom bind:value={$DataBase.supaMemoryKey}/>
            {/if}
            {#if $DataBase.supaModelType !== 'none'}
                <span class="text-textcolor">{language.SuperMemory} Prompt</span>
                <TextInput size="sm" marginBottom bind:value={$DataBase.supaMemoryPrompt} placeholder="Leave it blank to use default"/>
            {/if}
            {#if $DataBase.hypaMemory}
                <span class="text-textcolor">{language.HypaMemory} Model</span>
                <SelectInput className="mt-2 mb-2" bind:value={$DataBase.hypaModel}>
                    <OptionInput value="MiniLM" >MiniLM-L6-v2 (Free / Local)</OptionInput>
                    <OptionInput value="ada" >OpenAI Ada (Davinci / Curie Only)</OptionInput>
                </SelectInput>
            {/if}
            <div class="flex">
                <Check bind:check={$DataBase.hypaMemory} name={language.enable + ' ' + language.HypaMemory}/>
            </div>
        {/if}

    </Arcodion>
{/if}