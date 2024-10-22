<script lang="ts">
    import { language } from "../../lang";
    import { tokenizeAccurate } from "../../ts/tokenizer";
    import { DataBase, saveImage as saveAsset, type Database, type character, type groupChat } from "../../ts/storage/database";
    import { CharConfigSubMenu, CurrentChat, MobileGUI, ShowRealmFrameStore, selectedCharID } from "../../ts/stores";
    import { PlusIcon, SmileIcon, TrashIcon, UserIcon, ActivityIcon, BookIcon, User, CurlyBraces, Volume2Icon, DownloadIcon, FolderUpIcon } from 'lucide-svelte'
    import Check from "../UI/GUI/CheckInput.svelte";
    import { addCharEmotion, addingEmotion, getCharImage, rmCharEmotion, selectCharImg, makeGroupImage, removeChar, changeCharImage } from "../../ts/characters";
    import LoreBook from "./LoreBook/LoreBookSetting.svelte";
    import { alertConfirm, alertMd, alertNormal, alertSelectChar, alertTOS, showHypaV2Alert } from "../../ts/alert";
    import BarIcon from "./BarIcon.svelte";
    import { findCharacterbyId, getAuthorNoteDefaultText, parseKeyValue, selectMultipleFile, selectSingleFile } from "../../ts/util";
    import { onDestroy } from "svelte";
    import {isEqual} from 'lodash'
    import Help from "../Others/Help.svelte";
    import { exportChar, hubURL } from "src/ts/characterCards";
    import { getElevenTTSVoices, getWebSpeechTTSVoices, getVOICEVOXVoices, oaiVoices, getNovelAIVoices, FixNAITTS } from "src/ts/process/tts";
    import { checkCharOrder, getFileSrc, openURL } from "src/ts/storage/globalApi";
    import { addGroupChar, rmCharFromGroup } from "src/ts/process/group";
    import TextInput from "../UI/GUI/TextInput.svelte";
    import NumberInput from "../UI/GUI/NumberInput.svelte";
    import TextAreaInput from "../UI/GUI/TextAreaInput.svelte";
    import Button from "../UI/GUI/Button.svelte";
    import SelectInput from "../UI/GUI/SelectInput.svelte";
    import OptionInput from "../UI/GUI/OptionInput.svelte";
    import RegexList from "./Scripts/RegexList.svelte";
    import TriggerList from "./Scripts/TriggerList.svelte";
    import CheckInput from "../UI/GUI/CheckInput.svelte";
    import { updateInlayScreen } from "src/ts/process/inlayScreen";
    import { registerOnnxModel } from "src/ts/process/transformers";
    import MultiLangInput from "../UI/GUI/MultiLangInput.svelte";
    import { applyModule } from "src/ts/process/modules";
    import { exportRegex, importRegex } from "src/ts/process/scripts";
    import Arcodion from "../UI/Arcodion.svelte";
    import SliderInput from "../UI/GUI/SliderInput.svelte";

    let iconRemoveMode = false
    let emos:[string, string][] = []
    let tokens = {
        desc: 0,
        firstMsg: 0,
        localNote: 0,
        charaNote: 0
    }

    let lasttokens = {
        desc: '',
        firstMsg: '',
        localNote: '',
        charaNote: ''
    }

    async function loadTokenize(chara){
        const cha = chara
        if(cha.type !== 'group'){
            if(lasttokens.desc !== cha.desc){
                if(cha.desc){
                    lasttokens.desc = cha.desc
                    tokens.desc = await tokenizeAccurate(cha.desc)
                }
            }
            if(lasttokens.firstMsg !==chara.firstMessage){
                lasttokens.firstMsg = chara.firstMessage
                tokens.firstMsg = await tokenizeAccurate(chara.firstMessage)
            }
        }
        if(lasttokens.localNote !== currentChar.data.chats[currentChar.data.chatPage].note){
            lasttokens.localNote = currentChar.data.chats[currentChar.data.chatPage].note
            tokens.localNote = await tokenizeAccurate(currentChar.data.chats[currentChar.data.chatPage].note)
        
        }

    }

    let database:Database
    let currentChar:{
        type: 'character',
        data: character
    }|{
        type: 'group',
        data: groupChat
    }


    const unsub = DataBase.subscribe(async (v) => {
        database = v
        const cha = (v.characters[$selectedCharID])
        if(!cha){
            return
        }
        if((!currentChar) || (!isEqual(currentChar.data, cha))){
            if(cha.type === 'character'){
                currentChar = {
                    type: 'character',
                    data: structuredClone(cha)
                }
            }
            else{
                currentChar = {
                    type: 'group',
                    data: structuredClone(cha)
                }
            }
        }
        emos = currentChar.data.emotionImages
        currentChar = currentChar

        if (currentChar.data.ttsMode === 'gptsovits' && (currentChar.data as character).gptSoVitsConfig) {
            if (!(currentChar.data as character).gptSoVitsConfig.use_prompt) {
                (currentChar.data as character).gptSoVitsConfig.prompt = undefined
            }
            if((currentChar.data as character).gptSoVitsConfig.use_auto_path){
                (currentChar.data as character).gptSoVitsConfig.ref_audio_path = undefined;

                (currentChar.data as character).gptSoVitsConfig.use_prompt = false;
                (currentChar.data as character).gptSoVitsConfig.prompt = undefined;

            }
        }

    })

    let assetFileExtensions:string[] = []
    let assetFilePath:string[] = []
    let licensed = (currentChar.type === 'character') ? currentChar.data.license : ''

    $: {
        if(database.characters[$selectedCharID].chaId === currentChar.data.chaId){
            database.characters[$selectedCharID] = currentChar.data
        }
        else{
            loadTokenize(currentChar.data)
        }
        emos = currentChar.data.emotionImages
        DataBase.set(database)
        loadTokenize(currentChar.data)

        if(currentChar.type ==='character' && database.useAdditionalAssetsPreview){
            if(currentChar.data.additionalAssets){
                for(let i = 0; i < currentChar.data.additionalAssets.length; i++){
                    if(currentChar.data.additionalAssets[i].length > 2 && currentChar.data.additionalAssets[i][2]) {
                        assetFileExtensions[i] = currentChar.data.additionalAssets[i][2]
                    } else 
                        assetFileExtensions[i] = currentChar.data.additionalAssets[i][1].split('.').pop()
                    getFileSrc(currentChar.data.additionalAssets[i][1]).then((filePath) => {
                        assetFilePath[i] = filePath
                    })
                }
            }
        }
        
    }

    onDestroy(unsub);


    $:licensed = (currentChar.type === 'character') ? currentChar.data.license : ''
    $: if (currentChar.data.ttsMode === 'novelai' && (currentChar.data as character).naittsConfig === undefined) {
        (currentChar.data as character).naittsConfig = {
            customvoice: false,
            voice: 'Aini',
            version: 'v2'
        };
    }
    $: if (currentChar.data.ttsMode === 'gptsovits' && (currentChar.data as character).gptSoVitsConfig === undefined) {
        (currentChar.data as character).gptSoVitsConfig = {
            url: '',
            use_auto_path: false,
            ref_audio_path: '',
            use_long_audio: false,
            ref_audio_data: {
                fileName: '',
                assetId: ''  
            },
            volume: 1.0,
            text_lang: 'auto',
            text: 'en',
            use_prompt: false,
            prompt_lang: 'en',
            top_p: 1,
            temperature: 0.7,
            speed: 1,
            top_k: 5,
            text_split_method: 'cut0',
        };
    }

    let fishSpeechModels:{
        _id:string,
        title:string,
        description:string
    }[] = []

    $: if (currentChar.data.ttsMode === 'fishspeech' && (currentChar.data as character).fishSpeechConfig === undefined) {
        (currentChar.data as character).fishSpeechConfig = {
            model: {
                _id: '',
                title: '',
                description: ''
            },
            chunk_length: 200,
            normalize: false,
        };
    }

    $: {
        if(currentChar.type === 'group' && ($CharConfigSubMenu === 4 || $CharConfigSubMenu === 5)){
            $CharConfigSubMenu = 0
        }

    }

    async function getFishSpeechModels() {
        try {
            const res = await fetch(`https://api.fish.audio/model?self=true`, {
                headers: {
                    'Authorization': `Bearer ${$DataBase.fishSpeechKey}`
                }
            });
            const data = await res.json();
            console.log(data.items);
            console.log(currentChar.data)
            
            if (Array.isArray(data.items)) {
                fishSpeechModels = data.items.map((item) => ({
                    _id: item._id || '',
                    title: item.title || '',
                    description: item.description || ''
                }));
            } else {
                console.error('Expected an array of items, but received:', data.items);
                fishSpeechModels = [];
            }
        } catch (error) {
            console.error('Error fetching fish speech models:', error);
            fishSpeechModels = [];
        }
    }

</script>

{#if licensed !== 'private' && !$MobileGUI}
    <div class="flex gap-2 mb-2">
        <button class={$CharConfigSubMenu === 0 ? 'text-textcolor ' : 'text-textcolor2'} on:click={() => {$CharConfigSubMenu = 0}}>
            <UserIcon />
        </button>
        <button class={$CharConfigSubMenu === 1 ? 'text-textcolor' : 'text-textcolor2'} on:click={() => {$CharConfigSubMenu = 1}}>
            <SmileIcon />
        </button>
        <button class={$CharConfigSubMenu === 3 ? 'text-textcolor' : 'text-textcolor2'} on:click={() => {$CharConfigSubMenu = 3}}>
            <BookIcon />
        </button>
        {#if currentChar.type === 'character'}
            <button class={$CharConfigSubMenu === 5 ? 'text-textcolor' : 'text-textcolor2'} on:click={() => {$CharConfigSubMenu = 5}}>
                <Volume2Icon />
            </button>
            <button class={$CharConfigSubMenu === 4 ? 'text-textcolor' : 'text-textcolor2'} on:click={() => {$CharConfigSubMenu = 4}}>
                <CurlyBraces />
            </button>
        {/if}
        <button class={$CharConfigSubMenu === 2 ? 'text-textcolor' : 'text-textcolor2'} on:click={() => {$CharConfigSubMenu = 2}}>
            <ActivityIcon />
        </button>
    </div>
{/if}


{#if $CharConfigSubMenu === 0}
    {#if currentChar.type !== 'group' && licensed !== 'private'}
        <TextInput size="xl" marginBottom placeholder="Character Name" bind:value={currentChar.data.name} />
        <span class="text-textcolor">{language.description} <Help key="charDesc"/></span>
        <TextAreaInput highlight margin="both" autocomplete="off" bind:value={currentChar.data.desc}></TextAreaInput>
        <span class="text-textcolor2 mb-6 text-sm">{tokens.desc} {language.tokens}</span>
        <span class="text-textcolor">{language.firstMessage} <Help key="charFirstMessage"/></span>
        <TextAreaInput highlight margin="both" autocomplete="off" bind:value={currentChar.data.firstMessage}></TextAreaInput>
        <span class="text-textcolor2 mb-6 text-sm">{tokens.firstMsg} {language.tokens}</span>

    {:else if licensed !== 'private' && currentChar.type === 'group'}
        <TextInput size="xl" marginBottom placeholder="Group Name" bind:value={currentChar.data.name} />
        <span class="text-textcolor">{language.character}</span>
        <div class="p-4 gap-2 bg-bgcolor rounded-lg char-grid">
            {#if currentChar.data.characters.length === 0}
                <span class="text-textcolor2">No Character</span>
            {:else}
                <div></div>
                <div class="text-center">{language.talkness}</div>
                <div class="text-center">{language.active}</div>
                {#each currentChar.data.characters as char, i}
                    {#await getCharImage(findCharacterbyId(char).image, 'css')}
                        <BarIcon onClick={() => {
                            rmCharFromGroup(i)
                        }}>
                            <User/>
                        </BarIcon>
                    {:then im} 
                        <BarIcon onClick={() => {
                            rmCharFromGroup(i)
                        }} additionalStyle={im} />
                    {/await}
                    <div class="flex items-center px-2 py-3">
                        {#each [1,2,3,4,5,6] as barIndex}
                            <button class="bg-selected h-full flex-1 border-r-bgcolor border-r" 
                                class:bg-green-500={currentChar.data.characterTalks[i] >= (1 / 6 * barIndex)}
                                class:bg-selected={currentChar.data.characterTalks[i] < (1 / 6 * barIndex)}
                                class:rounded-l-lg={barIndex === 1}
                                class:rounded-r-lg={barIndex === 6}
                                on:click={() => {
                                    if(currentChar.data.type === 'group'){
                                        currentChar.data.characterTalks[i] = (1 / 6 * barIndex)
                                    }
                                }}
                            ></button>
                        {/each}
                    </div>
                    <div class="flex items-center justify-center">
                        <Check margin={false} bind:check={currentChar.data.characterActive[i]} />
                    </div>
                {/each}
            {/if}
        </div>
        <div class="text-textcolor2 mt-1 flex mb-6">
            <button on:click={addGroupChar} class="hover:text-textcolor cursor-pointer">
                <PlusIcon />
            </button>
        </div>

    {/if}
    <span class="text-textcolor">{language.authorNote} <Help key="chatNote"/></span>
    <TextAreaInput
        margin="both"
        autocomplete="off"
        bind:value={currentChar.data.chats[currentChar.data.chatPage].note}
        highlight
        placeholder={getAuthorNoteDefaultText()}
    />
    <span class="text-textcolor2 mb-6 text-sm">{tokens.localNote} {language.tokens}</span>

    {#if !$MobileGUI}
        <div class="flex mt-6 items-center">
            <Check bind:check={$DataBase.jailbreakToggle} name={language.jailbreakToggle}/>
        </div>

        {#each parseKeyValue($DataBase.customPromptTemplateToggle) as toggle}
            <div class="flex mt-2 items-center">
                <Check check={$DataBase.globalChatVariables[`toggle_${toggle[0]}`] === '1'} name={toggle[1]} onChange={() => {
                    $DataBase.globalChatVariables[`toggle_${toggle[0]}`] = $DataBase.globalChatVariables[`toggle_${toggle[0]}`] === '1' ? '0' : '1'
                }} />
            </div>
        {/each}

        
        {#if $DataBase.supaModelType !== 'none' || $DataBase.hanuraiEnable}
            {#if $DataBase.hanuraiEnable}
                <div class="flex mt-2 items-center">
                    <Check bind:check={currentChar.data.supaMemory} name={ language.hanuraiMemory}/>
                </div>
            {:else if $DataBase.hypaMemory}
                <div class="flex mt-2 items-center">
                    <Check bind:check={currentChar.data.supaMemory} name={ language.ToggleHypaMemory}/>
                </div>
            {:else}
                <div class="flex mt-2 items-center">
                    <Check bind:check={currentChar.data.supaMemory} name={ language.ToggleSuperMemory}/>
                </div>
            {/if}
        {/if}

        {#if currentChar.type === 'group'}
            <div class="flex mt-2 items-center">
                <Check bind:check={currentChar.data.orderByOrder} name={language.orderByOrder}/>
            </div>
        {/if}
    {/if}
    {#if licensed === 'private'}
        <Button on:click={async () => {
            const conf = await alertConfirm(language.removeConfirm + currentChar.data.name)
            if(!conf){
                return
            }
            const conf2 = await alertConfirm(language.removeConfirm2 + currentChar.data.name)
            if(!conf2){
                return
            }
            let chars = $DataBase.characters
            chars.splice($selectedCharID, 1)
            checkCharOrder()
            $selectedCharID = -1
            $DataBase.characters = chars

        }} className="mt-2" size="sm">{ currentChar.type === 'group' ? language.removeGroup : language.removeCharacter}</Button>
    {/if}
{:else if licensed === 'private'}
    <span>You are not allowed</span>
    {(() => {
        $CharConfigSubMenu = 0
    })()}
{:else if $CharConfigSubMenu === 1}
    {#if !$MobileGUI}
        <h2 class="mb-2 text-2xl font-bold mt-2">{language.characterDisplay}</h2>
    {/if}
    <span class="text-textcolor mt-2 mb-2">{currentChar.type !== 'group' ? language.charIcon : language.groupIcon}</span>
    {#if currentChar.type === 'group'}
        <button on:click={async () => {await selectCharImg($selectedCharID);currentChar = currentChar}}>
            {#await getCharImage(currentChar.data.image, 'css')}
                <div class="rounded-md h-24 w-24 shadow-lg bg-textcolor2 cursor-pointer ring"></div>
            {:then im}
                <div class="rounded-md h-24 w-24 shadow-lg bg-textcolor2 cursor-pointer ring" style={im} />     
            {/await}
        </button>
    {:else}
        <div class="p-2 border-darkborderc border rounded-md flex flex-wrap gap-2">
            {#if currentChar.data.image !== '' && currentChar.data.image}
                <button on:click={() => {
                    if(
                        currentChar.type === 'character' &&
                        currentChar.data.image !== '' &&
                        currentChar.data.image &&
                        iconRemoveMode
                    ){
                        currentChar.data.image = ''
                        if(currentChar.data.ccAssets && currentChar.data.ccAssets.length > 0){
                            changeCharImage($selectedCharID, 0)
                            currentChar = currentChar
                        }
                        iconRemoveMode = false
                    }
                }}>
                    {#await getCharImage(currentChar.data.image, currentChar.data.largePortrait ? 'lgcss' : 'css')}
                        <div
                            class="rounded-md h-24 w-24 shadow-lg bg-textcolor2 cursor-pointer ring transition-shadow"
                            class:ring-red-500={iconRemoveMode}
                        />
                    {:then im}
                        <div
                            class="rounded-md h-24 w-24 shadow-lg bg-textcolor2 cursor-pointer ring transition-shadow"
                            class:ring-red-500={iconRemoveMode}
                            style={im}
                        />     
                    {/await}
                </button>
            {/if}
            {#if currentChar.data.ccAssets}
                {#each currentChar.data.ccAssets as assets, i}
                    <button on:click={async () => {
                        if(!iconRemoveMode){
                            changeCharImage($selectedCharID, i)
                            currentChar = currentChar
                        }
                        else if(currentChar.type === 'character'){
                            currentChar.data.ccAssets.splice(i, 1)
                            currentChar.data.ccAssets = currentChar.data.ccAssets
                            iconRemoveMode = false
                        }
                    }}>
                        {#await getCharImage(assets.uri, currentChar.data.largePortrait ? 'lgcss' : 'css')}
                            <div
                                class="rounded-md h-24 w-24 shadow-lg bg-textcolor2 cursor-pointer hover:ring transition-shadow"
                                class:ring-red-500={iconRemoveMode} class:ring={iconRemoveMode}
                            />
                        {:then im}
                            <div
                                class="rounded-md h-24 w-24 shadow-lg bg-textcolor2 cursor-pointer hover:ring transition-shadow"
                                style={im} class:ring-red-500={iconRemoveMode} class:ring={iconRemoveMode}
                            />     
                        {/await}
                    </button>
                {/each}
            {/if}
            <button on:click={async () => {await selectCharImg($selectedCharID);currentChar = currentChar}}>
                <div
                    class="rounded-md h-24 w-24 cursor-pointer border-darkborderc border border-dashed flex justify-center items-center hover:border-blue-500"
                    style={currentChar.data.largePortrait ? 'height: 10.66rem;' : ''}
                >
                    <PlusIcon />
                </div>
            </button>
        </div>
        <div class="flex w-full items-end justify-end mt-2">
            <button class={iconRemoveMode ? "text-red-500" : "text-textcolor2 hover:text-textcolor"} on:click={() => {
                iconRemoveMode = !iconRemoveMode
            }}>
                <TrashIcon size="18" />
            </button>
        </div>
    {/if}

    {#if currentChar.type === 'character' && currentChar.data.image !== ''}
        <div class="flex items-center mt-4">
            <Check bind:check={currentChar.data.largePortrait} name={language.largePortrait}/>
        </div>
    {/if}

    {#if currentChar.type === 'group'}
        <Button on:click={makeGroupImage}>
            {language.createGroupImg}
        </Button>
    {/if}


    <span class="text-textcolor mt-6 mb-2">{language.viewScreen}</span>
    <!-- svelte-ignore empty-block -->

    {#if currentChar.type !== 'group'}
        <SelectInput className="mb-2" bind:value={currentChar.data.viewScreen} on:change={() => {
            if(currentChar.type === 'character'){
                currentChar.data = updateInlayScreen(currentChar.data)
            }
        }}>
            <OptionInput value="none">{language.none}</OptionInput>
            <OptionInput value="emotion">{language.emotionImage}</OptionInput>
            <OptionInput value="imggen">{language.imageGeneration}</OptionInput>
            {#if $DataBase.tpo}
                <OptionInput value="vn">VN test</OptionInput>
            {/if}
        </SelectInput>
    {:else}
        <SelectInput className="mb-2" bind:value={currentChar.data.viewScreen}>
            <OptionInput value="none">{language.none}</OptionInput>
            <OptionInput value="single">{language.singleView}</OptionInput>
            <OptionInput value="multiple">{language.SpacedView}</OptionInput>
            <OptionInput value="emp">{language.emphasizedView}</OptionInput>

        </SelectInput>
    {/if}

    {#if currentChar.data.viewScreen === 'emotion'}
        <span class="text-textcolor mt-6">{language.emotionImage} <Help key="emotion"/></span>
        <span class="text-textcolor2 text-xs">{language.emotionWarn}</span>

        <div class="w-full max-w-full border border-selected p-2 rounded-md">

            <table class="w-full max-w-full tabler">
                <tbody>
                <tr>
                    <th class="font-medium w-1/3">{language.image}</th>
                    <th class="font-medium w-1/2">{language.emotion}</th>
                    <th class="font-medium"></th>
                </tr>
                {#if currentChar.data.emotionImages.length === 0}
                    <tr>
                        <div class="text-textcolor2">{language.noImages}</div>
                    </tr>
                {:else}
                    {#each emos as emo, i}
                        <tr>
                            {#await getCharImage(emo[1], 'plain')}
                                <td class="font-medium truncate w-1/3"></td>
                            {:then im}
                                <td class="font-medium truncate w-1/3"><img src={im} alt="img" class="w-full"></td>                        
                            {/await}
                            <td class="font-medium truncate w-1/2">
                                <TextInput marginBottom size='lg' bind:value={currentChar.data.emotionImages[i][0]} />
                            </td>
                            <button class="font-medium cursor-pointer hover:text-green-500" on:click={() => {
                                rmCharEmotion($selectedCharID,i)
                            }}><TrashIcon /></button>
                        </tr>
                    {/each}
                {/if}
                </tbody>
            </table>

        </div>

        <div class="text-textcolor2 hover:text-textcolor mt-2 flex">
            {#if !$addingEmotion}
                <button class="cursor-pointer hover:text-green-500" on:click={() => {addCharEmotion($selectedCharID)}}>
                    <PlusIcon />
                </button>
            {:else}
                <span>Loading...</span>
            {/if}
        </div>

        {#if currentChar.data.inlayViewScreen}
            <span class="text-textcolor mt-2">{language.imgGenInstructions}</span>
            <TextAreaInput highlight bind:value={currentChar.data.newGenData.emotionInstructions} />
        {/if}

        <CheckInput bind:check={currentChar.data.inlayViewScreen} name={language.inlayViewScreen} onChange={() => {
            if(currentChar.type === 'character'){
                if(currentChar.data.inlayViewScreen && currentChar.data.additionalAssets === undefined){
                    currentChar.data.additionalAssets = []
                }else if(!currentChar.data.inlayViewScreen && currentChar.data.additionalAssets.length === 0){
                    currentChar.data.additionalAssets = undefined
                }
                
                currentChar.data = updateInlayScreen(currentChar.data)
            }
        }}/>
    {/if}
    {#if currentChar.data.viewScreen === 'imggen'}
        <span class="text-textcolor mt-6">{language.imageGeneration} <Help key="imggen"/></span>
        <span class="text-textcolor2 text-xs">{language.emotionWarn}</span>
        
        <span class="text-textcolor mt-2">{language.imgGenPrompt}</span>
        <TextAreaInput highlight bind:value={currentChar.data.newGenData.prompt} />
        <span class="text-textcolor mt-2">{language.imgGenNegatives}</span>
        <TextAreaInput highlight bind:value={currentChar.data.newGenData.negative} />
        <span class="text-textcolor mt-2">{language.imgGenInstructions}</span>
        <TextAreaInput highlight bind:value={currentChar.data.newGenData.instructions} />

        <CheckInput bind:check={currentChar.data.inlayViewScreen} name={language.inlayViewScreen} onChange={() => {
            if(currentChar.type === 'character'){
                currentChar.data = updateInlayScreen(currentChar.data)
            }
        }}/>
    {/if}
{:else if $CharConfigSubMenu === 3}
    {#if !$MobileGUI}
        <h2 class="mb-2 text-2xl font-bold mt-2">{language.loreBook} <Help key="lorebook"/></h2>
    {/if}
    <LoreBook />
{:else if $CharConfigSubMenu === 4}
    {#if currentChar.type === 'character'}
        {#if !$MobileGUI}
            <h2 class="mb-2 text-2xl font-bold mt-2">{language.scripts}</h2>
        {/if}
        <span class="text-textcolor mt-2">Bias <Help key="bias"/></span>
        <div class="w-full max-w-full border border-selected rounded-md p-2">

        <table class="w-full max-w-full tabler mt-2">
            <tbody>
            <tr>
                <th class="font-medium w-1/2">Bias</th>
                <th class="font-medium w-1/3">{language.value}</th>
                <th>
                    <button class="font-medium cursor-pointer hover:text-green-500" on:click={() => {
                        if(currentChar.type === 'character'){
                            let bia = currentChar.data.bias
                            bia.push(['', 0])
                            currentChar.data.bias = bia
                        }
                    }}><PlusIcon /></button>
                </th>
            </tr>
            {#if currentChar.data.bias.length === 0}
                <tr>
                    <div class="text-textcolor2"> {language.noBias}</div>
                </tr>
            {/if}
            {#each currentChar.data.bias as bias, i}
                <tr class="align-middle text-center">
                    <td class="font-medium truncate w-1/2">
                        <TextInput fullh fullwidth bind:value={currentChar.data.bias[i][0]} placeholder="string" />
                    </td> 
                    <td class="font-medium truncate w-1/3">
                        <NumberInput fullh fullwidth bind:value={currentChar.data.bias[i][1]} max={100} min={-100} />
                    </td>
                    <td>
                        <button class="font-medium flex justify-center items-center w-full h-full cursor-pointer hover:text-green-500" on:click={() => {
                            if(currentChar.type === 'character'){
                                let bia = currentChar.data.bias
                                bia.splice(i, 1)
                                currentChar.data.bias = bia
                            }
                        }}><TrashIcon /></button>
                    </td>
                </tr>
            {/each}
            </tbody>
            
        </table>

        </div>

        <span class="text-textcolor mt-4">{language.regexScript} <Help key="regexScript"/></span>
        <RegexList bind:value={currentChar.data.customscript} />
        <div class="text-textcolor2 mt-2 flex gap-2">
            <button class="font-medium cursor-pointer hover:text-green-500" on:click={() => {
                if(currentChar.type === 'character'){
                    let script = currentChar.data.customscript
                    script.push({
                    comment: "",
                    in: "",
                    out: "",
                    type: "editinput"
                    })
                    currentChar.data.customscript = script
                }
            }}><PlusIcon /></button>
            <button class="font-medium cursor-pointer hover:text-green-500" on:click={() => {
                exportRegex(currentChar.data.customscript)
            }}><DownloadIcon /></button>
            <button class="font-medium cursor-pointer hover:text-green-500" on:click={async () => {
                currentChar.data.customscript = await importRegex(currentChar.data.customscript)
            }}><FolderUpIcon /></button>
        </div>

        <span class="text-textcolor mt-4">{language.triggerScript} <Help key="triggerScript"/></span>
        <TriggerList bind:value={currentChar.data.triggerscript} lowLevelAble={currentChar.data.lowLevelAccess} />


        {#if currentChar.data.virtualscript || $DataBase.showUnrecommended}
            <span class="text-textcolor mt-4">{language.charjs} <Help key="charjs" unrecommended/></span>
            <TextAreaInput margin="both" autocomplete="off" bind:value={currentChar.data.virtualscript}></TextAreaInput>
        {/if}
    {/if}
{:else if $CharConfigSubMenu === 5}
    {#if currentChar.type === 'character'}
        {#if !$MobileGUI}
            <h2 class="mb-2 text-2xl font-bold mt-2">TTS</h2>
        {/if}
        <span class="text-textcolor">{language.provider}</span>
        <SelectInput className="mb-4 mt-2" bind:value={currentChar.data.ttsMode} on:change={(e) => {
            if(currentChar.type === 'character'){
                currentChar.data.ttsSpeech = ''
            }
        }}>
            <OptionInput value="">{language.disabled}</OptionInput>
            <OptionInput value="elevenlab">ElevenLabs</OptionInput>
            <OptionInput value="webspeech">Web Speech</OptionInput>
            <OptionInput value="VOICEVOX">VOICEVOX</OptionInput>
            <OptionInput value="openai">OpenAI</OptionInput>
            <OptionInput value="novelai">NovelAI</OptionInput>
            <OptionInput value="huggingface">Huggingface</OptionInput>
            <OptionInput value="vits">VITS</OptionInput>
            <OptionInput value="gptsovits">GPT-SoVITS</OptionInput>
            <OptionInput value="fishspeech">fish-speech</OptionInput>
        </SelectInput>
        

        {#if currentChar.data.ttsMode === 'webspeech'}
            {#if !speechSynthesis}
                <span class="text-textcolor">Web Speech isn't supported in your browser or OS</span>
            {:else}
                <span class="text-textcolor">{language.Speech}</span>
                <SelectInput className="mb-4 mt-2" bind:value={currentChar.data.ttsSpeech}>
                    <OptionInput value="">Auto</OptionInput>
                    {#each getWebSpeechTTSVoices() as voice}
                        <OptionInput value={voice}>{voice}</OptionInput>
                    {/each}
                </SelectInput>
                {#if currentChar.data.ttsSpeech !== ''}
                    <span class="text-red-400 text-sm">If you do not set it to Auto, it may not work properly when importing from another OS or browser.</span>
                {/if}
            {/if}
        {:else if currentChar.data.ttsMode === 'elevenlab'}
            <span class="text-sm mb-2 text-textcolor2">Please set the ElevenLabs API key in "global Settings → Bot Settings → Others → ElevenLabs API key"</span>
            {#await getElevenTTSVoices() then voices}
                <span class="text-textcolor">{language.Speech}</span>
                <SelectInput className="mb-4 mt-2" bind:value={currentChar.data.ttsSpeech}>
                    <OptionInput value="">Unset</OptionInput>
                        {#each voices as voice}
                            <OptionInput value={voice.voice_id}>{voice.name}</OptionInput>
                        {/each}
                </SelectInput>
            {/await}
         {:else if currentChar.data.ttsMode === 'VOICEVOX'}
                <span class="text-textcolor">Speaker</span>
                <SelectInput className="mb-4 mt-2" bind:value={currentChar.data.voicevoxConfig.speaker}>
                    {#await getVOICEVOXVoices() then voices}
                        {#each voices as voice}
                            <OptionInput value={voice.list}  selected={currentChar.data.voicevoxConfig.speaker === voice.list}>{voice.name}</OptionInput>
                        {/each}
                    {/await}
                </SelectInput>
                {#if currentChar.data.voicevoxConfig.speaker}
                <span class="text=neutral-200">Style</span>
                <SelectInput className="mb-4 mt-2" bind:value={currentChar.data.ttsSpeech}>
                {#each JSON.parse(currentChar.data.voicevoxConfig.speaker) as styles}
                        <OptionInput value={styles.id} selected={currentChar.data.ttsSpeech === styles.id}>{styles.name}</OptionInput>
                {/each}
                </SelectInput>
                {/if}
                <span class="text-textcolor">Speed scale</span>
                <NumberInput size={"sm"} marginBottom bind:value={currentChar.data.voicevoxConfig.SPEED_SCALE}/>

                <span class="text-textcolor">Pitch scale</span>
                <NumberInput size={"sm"} marginBottom bind:value={currentChar.data.voicevoxConfig.PITCH_SCALE}/>

                <span class="text-textcolor">Volume scale</span>
                <NumberInput size={"sm"} marginBottom bind:value={currentChar.data.voicevoxConfig.VOLUME_SCALE}/>

                <span class="text-textcolor">Intonation scale</span>
                <NumberInput size={"sm"} marginBottom bind:value={currentChar.data.voicevoxConfig.INTONATION_SCALE}/>
                <span class="text-sm mb-2 text-textcolor2">To use VOICEVOX, you need to run a colab and put the localtunnel URL in "Settings → Other Bots". https://colab.research.google.com/drive/1tyeXJSklNfjW-aZJAib1JfgOMFarAwze</span>
        {:else if currentChar.data.ttsMode === 'novelai'}
            <span class="text-textcolor">Custom Voice Seed</span>
            <Check bind:check={currentChar.data.naittsConfig.customvoice}/>
            {#if !currentChar.data.naittsConfig.customvoice}
                <span class="text-textcolor">Voice</span>
                <SelectInput className="mb-4 mt-2" bind:value={currentChar.data.naittsConfig.voice}>
                    {#await getNovelAIVoices() then voices}
                        {#each voices as voiceGroup}
                            <optgroup label={voiceGroup.gender} class="bg-darkbg appearance-none">
                                {#each voiceGroup.voices as voice}
                                    <OptionInput value={voice} selected={currentChar.data.naittsConfig.voice === voice}>{voice}</OptionInput>
                                {/each}
                            </optgroup>
                        {/each}
                    {/await}
                </SelectInput>
            {:else}
                <span class="text-textcolor">Voice</span>
                <TextInput size={"sm"} bind:value={currentChar.data.naittsConfig.voice}/>
            {/if}
            <span class="text-textcolor">Version</span>
            <SelectInput className="mb-4 mt-2" bind:value={currentChar.data.naittsConfig.version}>
                <OptionInput value="v1">v1</OptionInput>
                <OptionInput value="v2">v2</OptionInput>
            </SelectInput>
        {:else if currentChar.data.ttsMode === 'openai'}
            <SelectInput className="mb-4 mt-2" bind:value={currentChar.data.oaiVoice}>
                <OptionInput value="">Unset</OptionInput>
                {#each oaiVoices as voice}
                    <OptionInput value={voice}>{voice}</OptionInput>
                {/each}
            </SelectInput>
        {:else if currentChar.data.ttsMode === 'huggingface'}
            <span class="text-textcolor">Model</span>
            <TextInput className="mb-4 mt-2" bind:value={currentChar.data.hfTTS.model} />

            <span class="text-textcolor">Language</span>
            <TextInput className="mb-4 mt-2" bind:value={currentChar.data.hfTTS.language} placeholder="en" />
        {:else if currentChar.data.ttsMode === 'vits'}
            {#if currentChar.data.vits}
                <span class="text-textcolor">{currentChar.data.vits.name ?? 'Unnamed VitsModel'}</span>
            {:else}
                <span class="text-textcolor">No Model</span>
            {/if}
            <Button on:click={async () => {
                const model = await registerOnnxModel()
                if(model && currentChar.type === 'character'){
                    currentChar.data.vits = model
                }
            }}>{language.selectModel}</Button>
        {:else if currentChar.data.ttsMode === 'gptsovits'}
            <span class="text-textcolor">Volume</span>
            <SliderInput min={0.0} max={1.0} step={0.01} fixed={2} bind:value={currentChar.data.gptSoVitsConfig.volume}/>
            <span class="text-textcolor">URL</span>
            <TextInput className="mb-4 mt-2" bind:value={currentChar.data.gptSoVitsConfig.url}/>

            <span class="text-textcolor">Use Auto Path</span>
            <Check bind:check={currentChar.data.gptSoVitsConfig.use_auto_path}/>

            {#if !currentChar.data.gptSoVitsConfig.use_auto_path}
                <span class="text-textcolor">Reference Audio Path (e.g. C:/Users/user/Downloads/GPT-SoVITS-v2-240821)</span>
                <TextInput className="mb-4 mt-2" bind:value={currentChar.data.gptSoVitsConfig.ref_audio_path}/>
            {/if}

            <span class="text-textcolor">Use Long Audio</span>
            <Check bind:check={currentChar.data.gptSoVitsConfig.use_long_audio}/>

            <span class="text-textcolor">Reference Audio Data (3~10s audio file)</span>
            <Button on:click={async () => {
                const audio = await selectSingleFile([
                    'wav',
                    'ogg',
                    'aac',
                    'mp3'
                ])
                if(!audio){
                    return null
                }
                const saveId = await saveAsset(audio.data)
                // @ts-expect-error not groupChat
                currentChar.data.gptSoVitsConfig.ref_audio_data = {
                    fileName: audio.name,
                    assetId: saveId
                }

            }}
            className="h-10">
                
                {#if currentChar.data.gptSoVitsConfig.ref_audio_data.assetId === '' || currentChar.data.gptSoVitsConfig.ref_audio_data.assetId === undefined}
                    {language.selectFile}
                {:else}
                    {currentChar.data.gptSoVitsConfig.ref_audio_data.fileName}
                {/if}
            </Button>
            <span class="text-textcolor">Text Language</span>
            <SelectInput className="mb-4 mt-2" bind:value={currentChar.data.gptSoVitsConfig.text_lang}>
                <OptionInput value="auto">Multi-language Mixed</OptionInput>
                <OptionInput value="auto_yue">Multi-language Mixed (Cantonese)</OptionInput>
                <OptionInput value="en">English</OptionInput>
                <OptionInput value="zh">Chinese-English Mixed</OptionInput>
                <OptionInput value="ja">Japanese-English Mixed</OptionInput>
                <OptionInput value="yue">Cantonese-English Mixed</OptionInput>
                <OptionInput value="ko">Korean-English Mixed</OptionInput>
                <OptionInput value="all_zh">Chinese</OptionInput>
                <OptionInput value="all_ja">Japanese</OptionInput>
                <OptionInput value="all_yue">Cantonese</OptionInput>
                <OptionInput value="all_ko">Korean</OptionInput>
            </SelectInput>

            {#if !currentChar.data.gptSoVitsConfig.use_long_audio}
                <span class="text-textcolor">Use Reference Audio Script</span>
                <Check bind:check={currentChar.data.gptSoVitsConfig.use_prompt}/>
            {/if}

            {#if currentChar.data.gptSoVitsConfig.use_prompt && !currentChar.data.gptSoVitsConfig.use_long_audio}
                <span class="text-textcolor">Reference Audio Script</span>
                <TextAreaInput className="mb-4 mt-2" bind:value={currentChar.data.gptSoVitsConfig.prompt}/>
            {/if}

            <span class="text-textcolor">Reference Audio Language</span>
            <SelectInput className="mb-4 mt-2" bind:value={currentChar.data.gptSoVitsConfig.prompt_lang}>
                <OptionInput value="auto">Multi-language Mixed</OptionInput>
                <OptionInput value="auto_yue">Multi-language Mixed (Cantonese)</OptionInput>
                <OptionInput value="en">English</OptionInput>
                <OptionInput value="zh">Chinese-English Mixed</OptionInput>
                <OptionInput value="ja">Japanese-English Mixed</OptionInput>
                <OptionInput value="yue">Cantonese-English Mixed</OptionInput>
                <OptionInput value="ko">Korean-English Mixed</OptionInput>
                <OptionInput value="all_zh">Chinese</OptionInput>
                <OptionInput value="all_ja">Japanese</OptionInput>
                <OptionInput value="all_yue">Cantonese</OptionInput>
                <OptionInput value="all_ko">Korean</OptionInput>
            </SelectInput>
            <span class="text-textcolor">Top P</span>
            <SliderInput min={0.0} max={1.0} step={0.05} fixed={2} bind:value={currentChar.data.gptSoVitsConfig.top_p}/>

            <span class="text-textcolor">Temperature</span>
            <SliderInput min={0.0} max={1.0} step={0.05} fixed={2} bind:value={currentChar.data.gptSoVitsConfig.temperature}/>

            <span class="text-textcolor">Speed</span>
            <SliderInput min={0.6} max={1.65} step={0.05} fixed={2} bind:value={currentChar.data.gptSoVitsConfig.speed}/>

            <span class="text-textcolor">Top K</span>
            <SliderInput min={1} max={100} step={1} bind:value={currentChar.data.gptSoVitsConfig.top_k}/>

            <span class="text-textcolor">Text Split Method</span>
            <SelectInput className="mb-4 mt-2" bind:value={currentChar.data.gptSoVitsConfig.text_split_method}>
                <OptionInput value="cut0">Cut 0 (No splitting)</OptionInput>
                <OptionInput value="cut1">Cut 1 (Split every 4 sentences)</OptionInput>
                <OptionInput value="cut2">Cut 2 (Split every 50 characters)</OptionInput>
                <OptionInput value="cut3">Cut 3 (Split by Chinese periods)</OptionInput>
                <OptionInput value="cut4">Cut 4 (Split by English periods)</OptionInput>
                <OptionInput value="cut5">Cut 5 (Split by various punctuation marks)</OptionInput>
            </SelectInput>        
        {:else if currentChar.data.ttsMode === 'fishspeech'}
            {#await getFishSpeechModels()}
                <span class="text-textcolor">Loading...</span>
            {:then}
                <span class="text-textcolor">Model</span>
                <SelectInput className="mb-4 mt-2" bind:value={currentChar.data.fishSpeechConfig.model._id}>
                    <OptionInput value="">Not selected</OptionInput>
                    {#each fishSpeechModels as model}
                        <OptionInput value={model._id}>
                            <div class="flex items-center">
                                <span>{model.title}</span>
                                <span class="text-sm text-textcolor2">{model.description}</span>
                            </div>
                        </OptionInput>
                    {/each}
                </SelectInput>
            {:catch}
                <span class="text-textcolor">An error occurred while fetching the models.</span>
            {/await}

            <span class="text-textcolor">Chunk Length</span>
            <NumberInput className="mb-4 mt-2" bind:value={currentChar.data.fishSpeechConfig.chunk_length}/>

            <span class="mt-2 text-textcolor">Normalize</span>
            <Check className="mb-4 mt-2" bind:check={currentChar.data.fishSpeechConfig.normalize}/>
        {/if}
        {#if currentChar.data.ttsMode}
            <div class="flex items-center mt-2">
                <Check bind:check={currentChar.data.ttsReadOnlyQuoted} name={language.ttsReadOnlyQuoted}/>
            </div>
        {/if}
    {/if}
{:else if $CharConfigSubMenu === 2}
    {#if !$MobileGUI}
        <h2 class="mb-2 text-2xl font-bold mt-2">{language.advancedSettings}</h2>
    {/if}
    {#if currentChar.type !== 'group'}
        <span class="text-textcolor">{language.exampleMessage} <Help key="exampleMessage"/></span>
        <TextAreaInput highlight margin="both" autocomplete="off" bind:value={currentChar.data.exampleMessage}></TextAreaInput>

        <span class="text-textcolor">{language.creatorNotes} <Help key="creatorQuotes"/></span>
        <MultiLangInput bind:value={currentChar.data.creatorNotes} className="my-2" onInput={() => {
            currentChar.data.removedQuotes = false
        }}></MultiLangInput>

        <span class="text-textcolor">{language.systemPrompt} <Help key="systemPrompt"/></span>
        <TextAreaInput highlight margin="both" autocomplete="off" bind:value={currentChar.data.systemPrompt}></TextAreaInput>

        <span class="text-textcolor">{language.replaceGlobalNote} <Help key="replaceGlobalNote"/></span>
        <TextAreaInput highlight margin="both" autocomplete="off" bind:value={currentChar.data.replaceGlobalNote}></TextAreaInput>

        <span class="text-textcolor mt-2">{language.additionalText} <Help key="additionalText" /></span>
        <TextAreaInput highlight margin="both" autocomplete="off" bind:value={currentChar.data.additionalText}></TextAreaInput>

        {#if $DataBase.showUnrecommended || currentChar.data.personality.length > 3}
            <span class="text-textcolor">{language.personality} <Help key="personality" unrecommended/></span>
            <TextAreaInput highlight margin="both" autocomplete="off" bind:value={currentChar.data.personality}></TextAreaInput>
        {/if}
        {#if $DataBase.showUnrecommended || currentChar.data.scenario.length > 3}
            <span class="text-textcolor">{language.scenario} <Help key="scenario" unrecommended/></span>
            <TextAreaInput highlight margin="both" autocomplete="off" bind:value={currentChar.data.scenario}></TextAreaInput>
        {/if}

        <span class="text-textcolor mt-2">{language.backgroundHTML} <Help key="backgroundHTML" /></span>
        <TextAreaInput highlight margin="both" autocomplete="off" bind:value={currentChar.data.backgroundHTML}></TextAreaInput>

        <span class="text-textcolor mt-2">{language.defaultVariables} <Help key="defaultVariables" /></span>
        <TextAreaInput margin="both" autocomplete="off" bind:value={currentChar.data.defaultVariables}></TextAreaInput>

        <span class="text-textcolor mt-2">{language.translatorNote} <Help key="translatorNote" /></span>
        <TextAreaInput margin="both" autocomplete="off" bind:value={currentChar.data.translatorNote}></TextAreaInput>

        <span class="text-textcolor">{language.creator}</span>
        <TextInput size="sm" autocomplete="off" bind:value={currentChar.data.additionalData.creator} />

        <span class="text-textcolor">{language.CharVersion}</span>
        <TextInput size="sm" bind:value={currentChar.data.additionalData.character_version}/>

        <span class="text-textcolor">{language.nickname} <Help key="nickname" /></span>
        <TextInput size="sm" bind:value={currentChar.data.nickname}/>

        <span class="text-textcolor">{language.depthPrompt}</span>
        <div class="flex justify-center items-center">
            <NumberInput size="sm" bind:value={currentChar.data.depth_prompt.depth} className="w-12"/>
            <TextInput size="sm" bind:value={currentChar.data.depth_prompt.prompt} className="flex-1"/>
        </div>

        <span class="text-textcolor mt-2">{language.altGreet}</span>
        <div class="w-full max-w-full border border-selected rounded-md p-2">
            <table class="contain w-full max-w-full tabler mt-2">
                <tbody>
                <tr>
                    <th class="font-medium">{language.value}</th>
                    <th class="font-medium cursor-pointer w-10">
                        <button class="hover:text-green-500" on:click={() => {
                            if(currentChar.type === 'character'){
                                let alternateGreetings = currentChar.data.alternateGreetings
                                alternateGreetings.push('')
                                currentChar.data.alternateGreetings = alternateGreetings
                            }
                        }}>
                            <PlusIcon />
                        </button>
                    </th>
                </tr>
                {#if currentChar.data.alternateGreetings.length === 0}
                    <tr>
                        <div class="text-textcolor2"> No Messages</div>
                    </tr>
                {/if}
                {#each currentChar.data.alternateGreetings as bias, i}
                    <tr>
                        <td class="font-medium truncate">
                            <TextAreaInput highlight bind:value={currentChar.data.alternateGreetings[i]} placeholder="..." fullwidth />
                        </td>
                        <th class="font-medium cursor-pointer w-10">
                            <button class="hover:text-green-500" on:click={() => {
                                if(currentChar.type === 'character'){
                                    $CurrentChat.fmIndex = -1
                                    let alternateGreetings = currentChar.data.alternateGreetings
                                    alternateGreetings.splice(i, 1)
                                    currentChar.data.alternateGreetings = alternateGreetings
                                }
                            }}>
                                <TrashIcon />
                            </button>
                        </th>
                    </tr>
                {/each}
            </tbody>
            </table>
        </div>
      
        <Arcodion styled name={language.additionalAssets} help="additionalAssets">
            <div class="w-full max-w-full border border-selected rounded-md p-2">
                <table class="contain w-full max-w-full tabler mt-2">
                <tbody>
                    <tr>
                        <th class="font-medium">{language.value}</th>
                        <th class="font-medium cursor-pointer w-10">
                            <button class="hover:text-green-500" on:click={async () => {
                                if(currentChar.type === 'character'){
                                    const da = await selectMultipleFile(['png', 'webp', 'mp4', 'mp3', 'gif', 'jpeg', 'jpg', 'ttf', 'otf', 'css', 'webm', 'woff', 'woff2', 'svg', 'avif'])
                                    currentChar.data.additionalAssets = currentChar.data.additionalAssets ?? []
                                    if(!da){
                                        return
                                    }
                                    for(const f of da){
                                        const img = f.data
                                        const name = f.name
                                        const extension = name.split('.').pop().toLowerCase()
                                        const imgp = await saveAsset(img,'', extension)
                                        currentChar.data.additionalAssets.push([name, imgp, extension])
                                        currentChar.data.additionalAssets = currentChar.data.additionalAssets
                                    }
                                }
                            }}>
                                <PlusIcon />
                            </button>
                        </th>
                    </tr>
                    {#if (!currentChar.data.additionalAssets) || currentChar.data.additionalAssets.length === 0}
                        <tr>
                            <div class="text-textcolor2"> No Assets</div>
                        </tr>
                    {:else}
                        {#each currentChar.data.additionalAssets as assets, i}
                            <tr>
                                <td class="font-medium truncate">
                                    {#if assetFilePath[i] && database.useAdditionalAssetsPreview}
                                        {#if assetFileExtensions[i] === 'mp4'}
                                        <!-- svelte-ignore a11y-media-has-caption -->
                                            <video controls class="mt-2 px-2 w-full m-1 rounded-md"><source src={assetFilePath[i]} type="video/mp4"></video>
                                        {:else if assetFileExtensions[i] === 'mp3'}
                                            <audio controls class="mt-2 px-2 w-full h-16 m-1 rounded-md" loop><source src={assetFilePath[i]} type="audio/mpeg"></audio>
                                        {:else if ['png', 'webp', 'jpeg', 'jpg', 'gif'].includes(assetFileExtensions[i])}
                                            <img src={assetFilePath[i]} class="w-16 h-16 m-1 rounded-md" alt={assets[0]}/>
                                        {/if}
                                    {/if}
                                    <TextInput size="sm" marginBottom bind:value={currentChar.data.additionalAssets[i][0]} placeholder="..." />
                                </td>
                                
                                <th class="font-medium cursor-pointer w-10">
                                    <button class="hover:text-green-500" on:click={() => {
                                        if(currentChar.type === 'character'){
                                            $CurrentChat.fmIndex = -1
                                            let additionalAssets = currentChar.data.additionalAssets
                                            additionalAssets.splice(i, 1)
                                            currentChar.data.additionalAssets = additionalAssets
                                        }
                                    }}>
                                        <TrashIcon />
                                    </button>
                                </th>
                            </tr>
                        {/each}
                    {/if}
                </tbody>
                </table>
            </div>
        </Arcodion>

        <div class="flex items-center mt-4">
            <Check bind:check={currentChar.data.lowLevelAccess} name={language.lowLevelAccess}/>
            <span> <Help key="lowLevelAccess" name={language.lowLevelAccess}/></span>
        </div>

        <div class="flex items-center mt-4">
            <Check bind:check={currentChar.data.hideChatIcon} name={language.hideChatIcon}/>
        </div>

        <div class="flex items-center mt-4">
            <Check bind:check={currentChar.data.utilityBot} name={language.utilityBot}/>
            <span> <Help key="utilityBot" name={language.utilityBot}/></span>
        </div>

        {#if $DataBase.supaModelType !== 'none' && $DataBase.hypav2}
            <Button
                on:click={() => {
                    currentChar.data.chats[currentChar.data.chatPage].hypaV2Data ??= {
                        chunks: [],
                        mainChunks: []
                    }
                    showHypaV2Alert()
                }}
                className="mt-4"
            >
                {language.HypaMemory} V2 Data
            </Button>
        {:else if currentChar.data.chats[currentChar.data.chatPage].supaMemoryData && currentChar.data.chats[currentChar.data.chatPage].supaMemoryData.length > 4 || currentChar.data.supaMemory}
            <span class="text-textcolor mt-4">{language.SuperMemory}</span>
            <TextAreaInput margin="both" autocomplete="off" bind:value={currentChar.data.chats[currentChar.data.chatPage].supaMemoryData}></TextAreaInput>
        {/if}

        <Button
            on:click={applyModule}
            className="mt-4"
        >
            {language.applyModule}
        </Button>

        {#if currentChar.data.license !== 'CC BY-NC-SA 4.0'
            && currentChar.data.license !== 'CC BY-SA 4.0'
            && currentChar.data.license !== 'CC BY-ND 4.0'
            && currentChar.data.license !== 'CC BY-NC-ND 4.0'
            || $DataBase.tpo
        }
            <Button size="lg" on:click={async () => {
                const res = await exportChar($selectedCharID)
            }} className="mt-2">{language.exportCharacter}</Button>
        {/if}

        {#if currentChar.data.license !== 'CC BY-NC-SA 4.0'
            && currentChar.data.license !== 'CC BY-SA 4.0'
        }
            <Button size="lg" on:click={async () => {
                if(await alertTOS()){
                    $ShowRealmFrameStore = 'character'
                }
            }} className="mt-2">
                {#if currentChar.data.realmId}
                    {language.updateRealm}
                {:else}
                    {language.shareCloud}
                {/if}
            </Button>
        {/if}
    {:else}
        {#if currentChar.data.chats[currentChar.data.chatPage].supaMemoryData && currentChar.data.chats[currentChar.data.chatPage].supaMemoryData.length > 4 || currentChar.data.supaMemory}
            <span class="text-textcolor mt-4">{language.SuperMemory}</span>
            <TextAreaInput margin="both" autocomplete="off" bind:value={currentChar.data.chats[currentChar.data.chatPage].supaMemoryData}></TextAreaInput>
        {/if}

        <div class="flex items-center mt-4">
            <Check bind:check={currentChar.data.lowLevelAccess} name={language.lowLevelAccess}/>
            <span> <Help key="lowLevelAccess" name={language.lowLevelAccess}/></span>
        </div>
    {/if}
    <Button on:click={async () => {
        removeChar($selectedCharID, currentChar.data.name)
    }} className="mt-2" size="sm">{ currentChar.type === 'group' ? language.removeGroup : language.removeCharacter}</Button>
{/if}


<style>

    .tabler {
    table-layout: fixed;
    }

    .tabler td {
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .char-grid{
        display: grid;
        grid-template-columns: auto 1fr auto;
    }
</style>