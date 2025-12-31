<script lang="ts">
    import { language } from "../../lang";
    import { tokenizeAccurate } from "../../ts/tokenizer";
    import { saveImage as saveAsset, type character, type groupChat } from "../../ts/storage/database.svelte";
    import { DBState } from 'src/ts/stores.svelte';
    import { CharConfigSubMenu, MobileGUI, ShowRealmFrameStore, selectedCharID, hypaV3ModalOpen } from "../../ts/stores.svelte";
    import { PlusIcon, SmileIcon, TrashIcon, UserIcon, ActivityIcon, BookIcon, User, Braces, Volume2Icon, DownloadIcon, HardDriveUploadIcon, Share2Icon, ImageIcon, ImageOffIcon, ArrowUp, ArrowDown } from '@lucide/svelte'
    import Check from "../UI/GUI/CheckInput.svelte";
    import { addCharEmotion, addingEmotion, getCharImage, rmCharEmotion, selectCharImg, makeGroupImage, removeChar, changeCharImage } from "../../ts/characters";
    import LoreBook from "./LoreBook/LoreBookSetting.svelte";
    import { alertTOS, showHypaV2Alert } from "../../ts/alert";
    import BarIcon from "./BarIcon.svelte";
    import { findCharacterbyId, getAuthorNoteDefaultText, selectMultipleFile, selectSingleFile } from "../../ts/util";
    import Help from "../Others/Help.svelte";
    import { exportChar } from "src/ts/characterCards";
    import { getElevenTTSVoices, getWebSpeechTTSVoices, getVOICEVOXVoices, oaiVoices, getNovelAIVoices } from "src/ts/process/tts";
    import { getFileSrc } from "src/ts/globalApi.svelte";
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
    import SliderInput from "../UI/GUI/SliderInput.svelte";
    import Toggles from "./Toggles.svelte";

    let iconRemoveMode = $state(false)
    let viewSubMenu = $state(0)
    let emos:[string, string][] = $state([])
    let iconButtonSize = window.innerWidth > 360 ? 24 as const : 20 as const
    let tokens = $state({
        desc: 0,
        firstMsg: 0,
        localNote: 0,
        charaNote: 0
    })

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
        if(lasttokens.localNote !== DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].note){
            lasttokens.localNote = DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].note
            tokens.localNote = await tokenizeAccurate(DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].note)
        
        }

    }


    let assetFileExtensions:string[] = $state([])
    let assetFilePath:string[] = $state([])
    let licensed = $state((DBState.db.characters[$selectedCharID].type === 'character') ? (DBState.db.characters[$selectedCharID] as character).license : '')

    $effect.pre(() => {
        emos = DBState.db.characters[$selectedCharID].emotionImages
        loadTokenize(DBState.db.characters[$selectedCharID])

        if(DBState.db.characters[$selectedCharID].type ==='character' && DBState.db.useAdditionalAssetsPreview){
            if((DBState.db.characters[$selectedCharID] as character).additionalAssets){
                for(let i = 0; i < (DBState.db.characters[$selectedCharID] as character).additionalAssets.length; i++){
                    if((DBState.db.characters[$selectedCharID] as character).additionalAssets[i].length > 2 && (DBState.db.characters[$selectedCharID] as character).additionalAssets[i][2]) {
                        assetFileExtensions[i] = (DBState.db.characters[$selectedCharID] as character).additionalAssets[i][2]
                    } else 
                        assetFileExtensions[i] = (DBState.db.characters[$selectedCharID] as character).additionalAssets[i][1].split('.').pop()
                    getFileSrc((DBState.db.characters[$selectedCharID] as character).additionalAssets[i][1]).then((filePath) => {
                        assetFilePath[i] = filePath
                    })
                }
            }
        }
        
    });

    $effect.pre(() => {
        licensed = (DBState.db.characters[$selectedCharID].type === 'character') ? (DBState.db.characters[$selectedCharID] as character).license : ''
    });
    $effect.pre(() => {
        if (DBState.db.characters[$selectedCharID].ttsMode === 'novelai' && (DBState.db.characters[$selectedCharID] as character).naittsConfig === undefined) {
            (DBState.db.characters[$selectedCharID] as character).naittsConfig = {
                customvoice: false,
                voice: 'Aini',
                version: 'v2'
            };
        }
    });
    $effect.pre(() => {
        if (DBState.db.characters[$selectedCharID].ttsMode === 'gptsovits' && (DBState.db.characters[$selectedCharID] as character).gptSoVitsConfig === undefined) {
            (DBState.db.characters[$selectedCharID] as character).gptSoVitsConfig = {
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
    });

    let fishSpeechModels:{
        _id:string,
        title:string,
        description:string
    }[] = $state([])

    $effect.pre(() => {
        if (DBState.db.characters[$selectedCharID].ttsMode === 'fishspeech' && (DBState.db.characters[$selectedCharID] as character).fishSpeechConfig === undefined) {
            (DBState.db.characters[$selectedCharID] as character).fishSpeechConfig = {
                model: {
                    _id: '',
                    title: '',
                    description: ''
                },
                chunk_length: 200,
                normalize: false,
            };
        }
    });

    $effect.pre(() => {
        if(DBState.db.characters[$selectedCharID].type === 'group' && ($CharConfigSubMenu === 4 || $CharConfigSubMenu === 5)){
            $CharConfigSubMenu = 0
        }

    });

    async function getFishSpeechModels() {
        try {
            const res = await fetch(`https://api.fish.audio/model?self=true`, {
                headers: {
                    'Authorization': `Bearer ${DBState.db.fishSpeechKey}`
                }
            });
            const data = await res.json();
            console.log(data.items);
            console.log(DBState.db.characters[$selectedCharID])
            
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

    function moveAlternateGreetingUp(index: number) {
        if(index === 0) return
        if(DBState.db.characters[$selectedCharID].type === 'character'){
            let alternateGreetings = DBState.db.characters[$selectedCharID].alternateGreetings
            let temp = alternateGreetings[index]
            alternateGreetings[index] = alternateGreetings[index - 1]
            alternateGreetings[index - 1] = temp
            DBState.db.characters[$selectedCharID].alternateGreetings = alternateGreetings
        }
    }

    function moveAlternateGreetingDown(index: number) {
        if(index === DBState.db.characters[$selectedCharID].alternateGreetings.length - 1) return
        if(DBState.db.characters[$selectedCharID].type === 'character'){
            let alternateGreetings = DBState.db.characters[$selectedCharID].alternateGreetings
            let temp = alternateGreetings[index]
            alternateGreetings[index] = alternateGreetings[index + 1]
            alternateGreetings[index + 1] = temp
            DBState.db.characters[$selectedCharID].alternateGreetings = alternateGreetings
        }
    }

</script>

{#if licensed !== 'private' && !$MobileGUI}
    <div class="flex mb-2" class:gap-2={iconButtonSize === 24} class:gap-1={iconButtonSize < 24}>
        <button class={$CharConfigSubMenu === 0 ? 'text-textcolor ' : 'text-textcolor2'} onclick={() => {$CharConfigSubMenu = 0}}>
            <UserIcon size={iconButtonSize} />
        </button>
        <button class={$CharConfigSubMenu === 1 ? 'text-textcolor' : 'text-textcolor2'} onclick={() => {$CharConfigSubMenu = 1}}>
            <SmileIcon size={iconButtonSize} />
        </button>
        <button class={$CharConfigSubMenu === 3 ? 'text-textcolor' : 'text-textcolor2'} onclick={() => {$CharConfigSubMenu = 3}}>
            <BookIcon size={iconButtonSize} />
        </button>
        {#if DBState.db.characters[$selectedCharID].type === 'character'}
            <button class={$CharConfigSubMenu === 5 ? 'text-textcolor' : 'text-textcolor2'} onclick={() => {$CharConfigSubMenu = 5}}>
                <Volume2Icon size={iconButtonSize} />
            </button>
            <button class={$CharConfigSubMenu === 4 ? 'text-textcolor' : 'text-textcolor2'} onclick={() => {$CharConfigSubMenu = 4}}>
                <Braces size={iconButtonSize} />
            </button>
        {/if}
        <button class={$CharConfigSubMenu === 2 ? 'text-textcolor' : 'text-textcolor2'} onclick={() => {$CharConfigSubMenu = 2}}>
            <ActivityIcon size={iconButtonSize} />
        </button>
        {#if DBState.db.characters[$selectedCharID].type === 'character'}
            <button class={$CharConfigSubMenu === 6 ? 'text-textcolor' : 'text-textcolor2'} onclick={() => {$CharConfigSubMenu = 6}}>
                <Share2Icon size={iconButtonSize} />
            </button>
        {/if}
    </div>
{/if}


{#if $CharConfigSubMenu === 0}
    {#if DBState.db.characters[$selectedCharID].type !== 'group' && licensed !== 'private'}
        <TextInput size="xl" marginBottom placeholder="Character Name" bind:value={DBState.db.characters[$selectedCharID].name} />
        <span class="text-textcolor">{language.description} <Help key="charDesc"/></span>
        <TextAreaInput highlight margin="both" autocomplete="off" bind:value={(DBState.db.characters[$selectedCharID] as character).desc}></TextAreaInput>
        <span class="text-textcolor2 mb-6 text-sm">{tokens.desc} {language.tokens}</span>
        <span class="text-textcolor">{language.firstMessage} <Help key="charFirstMessage"/></span>
        <TextAreaInput highlight margin="both" autocomplete="off" bind:value={DBState.db.characters[$selectedCharID].firstMessage}></TextAreaInput>
        <span class="text-textcolor2 mb-6 text-sm">{tokens.firstMsg} {language.tokens}</span>

    {:else if licensed !== 'private' && DBState.db.characters[$selectedCharID].type === 'group'}
        <TextInput size="xl" marginBottom placeholder="Group Name" bind:value={DBState.db.characters[$selectedCharID].name} />
        <span class="text-textcolor">{language.character}</span>
        <div class="p-4 gap-2 bg-bgcolor rounded-lg char-grid">
            {#if (DBState.db.characters[$selectedCharID] as groupChat).characters.length === 0}
                <span class="text-textcolor2">No Character</span>
            {:else}
                <div></div>
                <div class="text-center">{language.talkness}</div>
                <div class="text-center">{language.active}</div>
                {#each (DBState.db.characters[$selectedCharID] as groupChat).characters as char, i}
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
                                aria-labelledby="loading"
                                class:bg-green-500={(DBState.db.characters[$selectedCharID] as groupChat).characterTalks[i] >= (1 / 6 * barIndex)}
                                class:bg-selected={(DBState.db.characters[$selectedCharID] as groupChat).characterTalks[i] < (1 / 6 * barIndex)}
                                class:rounded-l-lg={barIndex === 1}
                                class:rounded-r-lg={barIndex === 6}
                                onclick={() => {
                                    if(DBState.db.characters[$selectedCharID].type === 'group'){
                                        (DBState.db.characters[$selectedCharID] as groupChat).characterTalks[i] = (1 / 6 * barIndex)
                                    }
                                }}
                            ></button>
                        {/each}
                    </div>
                    <div class="flex items-center justify-center">
                        <Check margin={false} bind:check={(DBState.db.characters[$selectedCharID] as groupChat).characterActive[i]} />
                    </div>
                {/each}
            {/if}
        </div>
        <div class="text-textcolor2 mt-1 flex mb-6">
            <button onclick={addGroupChar} class="hover:text-textcolor cursor-pointer">
                <PlusIcon />
            </button>
        </div>

    {/if}
    <span class="text-textcolor">{language.authorNote} <Help key="chatNote"/></span>
    <TextAreaInput
        margin="both"
        autocomplete="off"
        bind:value={DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].note}
        highlight
        placeholder={getAuthorNoteDefaultText()}
    />
    <span class="text-textcolor2 mb-6 text-sm">{tokens.localNote} {language.tokens}</span>

    {#if !$MobileGUI}
        <Toggles bind:chara={DBState.db.characters[$selectedCharID]} noContainer />

        {#if DBState.db.characters[$selectedCharID].type === 'group'}
            <div class="flex mt-2 items-center">
                <Check bind:check={(DBState.db.characters[$selectedCharID] as groupChat).orderByOrder} name={language.orderByOrder}/>
            </div>
        {/if}
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

    <div class="flex w-full rounded-md border border-selected mb-4">
        <button onclick={() => {
            viewSubMenu = 0
        }} class="p-2 flex-1" class:bg-selected={viewSubMenu === 0}>
            <span>{DBState.db.characters[$selectedCharID].type !== 'group' ? language.charIcon : language.groupIcon}</span>
        </button>
        <button onclick={() => {
            viewSubMenu = 1
        }} class="p2 flex-1 border-r border-l border-selected" class:bg-selected={viewSubMenu === 1}>
            <span>{language.viewScreen}</span>
        </button>
        <button onclick={() => {
            viewSubMenu = 2
        }} class="p-2 flex-1" class:bg-selected={viewSubMenu === 2}>
            <span>{language.additionalAssets}</span>
        </button>
    </div>

    {#if viewSubMenu === 0}
        {#if DBState.db.characters[$selectedCharID].type === 'group'}
            <button onclick={async () => {await selectCharImg($selectedCharID)}}>
                {#await getCharImage(DBState.db.characters[$selectedCharID].image, 'css')}
                    <div class="rounded-md h-24 w-24 shadow-lg bg-textcolor2 cursor-pointer ring-3"></div>
                {:then im}
                    <div class="rounded-md h-24 w-24 shadow-lg bg-textcolor2 cursor-pointer ring-3" style={im}></div>     
                {/await}
            </button>
        {:else}
            <div class="p-2 border-darkborderc border rounded-md flex flex-wrap gap-2">
                {#if DBState.db.characters[$selectedCharID].image !== '' && DBState.db.characters[$selectedCharID].image}
                    <button onclick={() => {
                        if(
                            DBState.db.characters[$selectedCharID].type === 'character' &&
                            DBState.db.characters[$selectedCharID].image !== '' &&
                            DBState.db.characters[$selectedCharID].image &&
                            iconRemoveMode
                        ){
                            DBState.db.characters[$selectedCharID].image = ''
                            if((DBState.db.characters[$selectedCharID] as character).ccAssets && (DBState.db.characters[$selectedCharID] as character).ccAssets.length > 0){
                                changeCharImage($selectedCharID, 0)
                            }
                            iconRemoveMode = false
                        }
                    }}>
                        {#await getCharImage(DBState.db.characters[$selectedCharID].image, (DBState.db.characters[$selectedCharID] as character).largePortrait ? 'lgcss' : 'css')}
                            <div
                                class="rounded-md h-24 w-24 shadow-lg bg-textcolor2 cursor-pointer ring-3 transition-shadow"
                                class:ring-red-500={iconRemoveMode}
    ></div>
                        {:then im}
                            <div
                                class="rounded-md h-24 w-24 shadow-lg bg-textcolor2 cursor-pointer ring-3 transition-shadow"
                                class:ring-red-500={iconRemoveMode}
                                style={im}
    ></div>     
                        {/await}
                    </button>
                {/if}
                {#if (DBState.db.characters[$selectedCharID] as character).ccAssets}
                    {#each (DBState.db.characters[$selectedCharID] as character).ccAssets as assets, i}
                        <button onclick={async () => {
                            if(!iconRemoveMode){
                                changeCharImage($selectedCharID, i)
                            }
                            else if(DBState.db.characters[$selectedCharID].type === 'character'){
                                (DBState.db.characters[$selectedCharID] as character).ccAssets.splice(i, 1)
                                iconRemoveMode = false
                            }
                        }}>
                            {#await getCharImage(assets.uri, (DBState.db.characters[$selectedCharID] as character).largePortrait ? 'lgcss' : 'css')}
                                <div
                                    class="rounded-md h-24 w-24 shadow-lg bg-textcolor2 cursor-pointer hover:ring-3 transition-shadow"
                                    class:ring-red-500={iconRemoveMode} class:ring-3={iconRemoveMode}
    ></div>
                            {:then im}
                                <div
                                    class="rounded-md h-24 w-24 shadow-lg bg-textcolor2 cursor-pointer hover:ring-3 transition-shadow"
                                    style={im} class:ring-red-500={iconRemoveMode} class:ring-3={iconRemoveMode}
    ></div>     
                            {/await}
                        </button>
                    {/each}
                {/if}
                <button onclick={async () => {await selectCharImg($selectedCharID);}}>
                    <div
                        class="rounded-md h-24 w-24 cursor-pointer border-darkborderc border border-dashed flex justify-center items-center hover:border-blue-500"
                        style={(DBState.db.characters[$selectedCharID] as character).largePortrait ? 'height: 10.66rem;' : ''}
                    >
                        <PlusIcon />
                    </div>
                </button>
            </div>
            <div class="flex w-full items-end justify-end mt-2">
                <button class={iconRemoveMode ? "text-red-500" : "text-textcolor2 hover:text-textcolor"} onclick={() => {
                    iconRemoveMode = !iconRemoveMode
                }}>
                    <TrashIcon size="18" />
                </button>
            </div>
        {/if}

        {#if DBState.db.characters[$selectedCharID].type === 'character' && DBState.db.characters[$selectedCharID].image !== ''}
            <div class="flex items-center mt-4">
                <Check bind:check={(DBState.db.characters[$selectedCharID] as character).largePortrait} name={language.largePortrait}/>
            </div>
        {/if}

        {#if DBState.db.characters[$selectedCharID].type === 'group'}
            <Button onclick={makeGroupImage}>
                {language.createGroupImg}
            </Button>
        {/if}


    {:else if viewSubMenu === 1}
        <!-- svelte-ignore block_empty -->

        {#if DBState.db.characters[$selectedCharID].type !== 'group'}
            <SelectInput className="mb-2" bind:value={DBState.db.characters[$selectedCharID].viewScreen} onchange={() => {
                if(DBState.db.characters[$selectedCharID].type === 'character'){
                    DBState.db.characters[$selectedCharID] = updateInlayScreen((DBState.db.characters[$selectedCharID] as character))
                }
            }}>
                <OptionInput value="none">{language.none}</OptionInput>
                <OptionInput value="emotion">{language.emotionImage}</OptionInput>
                <OptionInput value="imggen">{language.imageGeneration}</OptionInput>
                {#if DBState.db.tpo}
                    <OptionInput value="vn">VN test</OptionInput>
                {/if}
            </SelectInput>
        {:else}
            <SelectInput className="mb-2" bind:value={DBState.db.characters[$selectedCharID].viewScreen}>
                <OptionInput value="none">{language.none}</OptionInput>
                <OptionInput value="single">{language.singleView}</OptionInput>
                <OptionInput value="multiple">{language.SpacedView}</OptionInput>
                <OptionInput value="emp">{language.emphasizedView}</OptionInput>

            </SelectInput>
        {/if}

        {#if DBState.db.characters[$selectedCharID].viewScreen === 'emotion'}
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
                    {#if DBState.db.characters[$selectedCharID].emotionImages.length === 0}
                        <tr>
                            <td colspan="3">{language.noImages}</td>
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
                                    <TextInput marginBottom size='lg' bind:value={DBState.db.characters[$selectedCharID].emotionImages[i][0]} />
                                </td>
                                <td>
                                    <button class="font-medium cursor-pointer hover:text-green-500" onclick={() => {
                                        rmCharEmotion($selectedCharID,i)
                                    }}><TrashIcon /></button>
                                </td>

                            </tr>
                        {/each}
                    {/if}
                    </tbody>
                </table>

            </div>

            <div class="text-textcolor2 hover:text-textcolor mt-2 flex">
                {#if !$addingEmotion}
                    <button class="cursor-pointer hover:text-green-500" onclick={() => {addCharEmotion($selectedCharID)}}>
                        <PlusIcon />
                    </button>
                {:else}
                    <span>Loading...</span>
                {/if}
            </div>

            {#if (DBState.db.characters[$selectedCharID] as character).inlayViewScreen}
                <span class="text-textcolor mt-2">{language.imgGenInstructions}</span>
                <TextAreaInput highlight bind:value={(DBState.db.characters[$selectedCharID] as character).newGenData.emotionInstructions} />
            {/if}

            <CheckInput bind:check={(DBState.db.characters[$selectedCharID] as character).inlayViewScreen} name={language.inlayViewScreen} onChange={() => {
                if(DBState.db.characters[$selectedCharID].type === 'character'){
                    if((DBState.db.characters[$selectedCharID] as character).inlayViewScreen && (DBState.db.characters[$selectedCharID] as character).additionalAssets === undefined){
                        (DBState.db.characters[$selectedCharID] as character).additionalAssets = []
                    }else if(!(DBState.db.characters[$selectedCharID] as character).inlayViewScreen && (DBState.db.characters[$selectedCharID] as character).additionalAssets.length === 0){
                        (DBState.db.characters[$selectedCharID] as character).additionalAssets = undefined
                    }
                    
                    DBState.db.characters[$selectedCharID] = updateInlayScreen((DBState.db.characters[$selectedCharID] as character))
                }
            }}/>
        {/if}
        {#if DBState.db.characters[$selectedCharID].viewScreen === 'imggen'}
            <span class="text-textcolor mt-6">{language.imageGeneration} <Help key="imggen"/></span>
            <span class="text-textcolor2 text-xs">{language.emotionWarn}</span>
            
            <span class="text-textcolor mt-2">{language.imgGenPrompt}</span>
            <TextAreaInput highlight bind:value={(DBState.db.characters[$selectedCharID] as character).newGenData.prompt} />
            <span class="text-textcolor mt-2">{language.imgGenNegatives}</span>
            <TextAreaInput highlight bind:value={(DBState.db.characters[$selectedCharID] as character).newGenData.negative} />
            <span class="text-textcolor mt-2">{language.imgGenInstructions}</span>
            <TextAreaInput highlight bind:value={(DBState.db.characters[$selectedCharID] as character).newGenData.instructions} />

            <CheckInput bind:check={(DBState.db.characters[$selectedCharID] as character).inlayViewScreen} name={language.inlayViewScreen} onChange={() => {
                if((DBState.db.characters[$selectedCharID] as character).type === 'character'){
                    (DBState.db.characters[$selectedCharID] as character) = updateInlayScreen((DBState.db.characters[$selectedCharID] as character))
                }
            }}/>
        {/if}
    {:else if viewSubMenu === 2}

            {#if DBState.db.newImageHandlingBeta}
            <CheckInput bind:check={DBState.db.characters[$selectedCharID].prebuiltAssetCommand} name={language.insertAssetPrompt}/>

            {#if DBState.db.characters[$selectedCharID].prebuiltAssetCommand}

            <span class="text-textcolor mt-2">{language.assetStyle}</span>
            <SelectInput className="mb-2" bind:value={DBState.db.characters[$selectedCharID].prebuiltAssetStyle}>
                <OptionInput value="">{language.static}</OptionInput>
                <OptionInput value="dynamic">{language.dynamic}</OptionInput>
            </SelectInput>
            {/if}
            {/if}
            <div class="w-full max-w-full border border-selected rounded-md p-2 mt-2">
                <table class="contain w-full max-w-full tabler mt-2">
                <tbody>
                    <tr>
                        <th class="font-medium">{language.value}</th>
                        <th class="font-medium cursor-pointer w-10">
                            <button class="hover:text-green-500" onclick={async () => {
                                if(DBState.db.characters[$selectedCharID].type === 'character'){
                                    const da = await selectMultipleFile(['png', 'webp', 'mp4', 'mp3', 'gif', 'jpeg', 'jpg', 'ttf', 'otf', 'css', 'webm', 'woff', 'woff2', 'svg', 'avif'])
                                    DBState.db.characters[$selectedCharID].additionalAssets = DBState.db.characters[$selectedCharID].additionalAssets ?? []
                                    if(!da){
                                        return
                                    }
                                    for(const f of da){
                                        const img = f.data
                                        const name = f.name
                                        const extension = name.split('.').pop().toLowerCase()
                                        const imgp = await saveAsset(img,'', extension)
                                        DBState.db.characters[$selectedCharID].additionalAssets.push([name, imgp, extension])
                                        DBState.db.characters[$selectedCharID].additionalAssets = DBState.db.characters[$selectedCharID].additionalAssets
                                    }
                                }
                            }}>
                                <PlusIcon />
                            </button>
                        </th>
                    </tr>
                    {#if (!DBState.db.characters[$selectedCharID].additionalAssets) || DBState.db.characters[$selectedCharID].additionalAssets.length === 0}
                        <tr>
                            <td class="text-textcolor2"> No Assets</td>
                        </tr>
                    {:else}
                        {#each DBState.db.characters[$selectedCharID].additionalAssets as assets, i}
                            <tr>
                                <td class="font-medium truncate">
                                    {#if assetFilePath[i] && DBState.db.useAdditionalAssetsPreview}
                                        {#if assetFileExtensions[i] === 'mp4'}
                                        <!-- svelte-ignore a11y_media_has_caption -->
                                            <video controls class="mt-2 px-2 w-full m-1 rounded-md"><source src={assetFilePath[i]} type="video/mp4"></video>
                                        {:else if assetFileExtensions[i] === 'mp3'}
                                            <audio controls class="mt-2 px-2 w-full h-16 m-1 rounded-md" loop><source src={assetFilePath[i]} type="audio/mpeg"></audio>
                                        {:else if ['png', 'webp', 'jpeg', 'jpg', 'gif'].includes(assetFileExtensions[i])}
                                            <img src={assetFilePath[i]} class="w-16 h-16 m-1 rounded-md" alt={assets[0]}/>
                                        {/if}
                                    {/if}
                                    <TextInput size="sm" marginBottom bind:value={DBState.db.characters[$selectedCharID].additionalAssets[i][0]} placeholder="..." />
                                </td>
                                
                                <th class="font-medium cursor-pointer w-10">
                                    <button class="hover:text-blue-500" onclick={() => {
                                        if(DBState.db.characters[$selectedCharID].type === 'character'){
                                            DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].fmIndex = -1
                                            let additionalAssets = DBState.db.characters[$selectedCharID].additionalAssets
                                            additionalAssets.splice(i, 1)
                                            DBState.db.characters[$selectedCharID].additionalAssets = additionalAssets
                                        }
                                    }}>
                                        <TrashIcon />
                                    </button>
                                    {#if DBState.db.useAdditionalAssetsPreview}
                                        <button class="hover:text-blue-500" class:text-textcolor2={DBState.db.characters[$selectedCharID].prebuiltAssetExclude?.includes?.(assets[1])} onclick={() => {
                                            DBState.db.characters[$selectedCharID].prebuiltAssetExclude ??= []
                                            if(DBState.db.characters[$selectedCharID].prebuiltAssetExclude.includes(assets[1])){
                                                DBState.db.characters[$selectedCharID].prebuiltAssetExclude = DBState.db.characters[$selectedCharID].prebuiltAssetExclude.filter((e) => e !== assets[1])
                                            }
                                            else {
                                                DBState.db.characters[$selectedCharID].prebuiltAssetExclude.push(assets[1])
                                            }
                                        }}>
                                            {#if DBState.db.characters[$selectedCharID]?.prebuiltAssetExclude?.includes?.(assets[1])}
                                                <ImageOffIcon />
                                            {:else}
                                                <ImageIcon />
                                            {/if}
                                        </button>
                                    {/if}
                                </th>
                            </tr>
                        {/each}
                    {/if}
                </tbody>
                </table>
            </div>
    {/if}
{:else if $CharConfigSubMenu === 3}
    {#if !$MobileGUI}
        <h2 class="mb-2 text-2xl font-bold mt-2">{language.loreBook} <Help key="lorebook"/></h2>
    {/if}
    <LoreBook />
{:else if $CharConfigSubMenu === 4}
    {#if DBState.db.characters[$selectedCharID].type === 'character'}
        {#if !$MobileGUI}
            <h2 class="mb-2 text-2xl font-bold mt-2">{language.scripts}</h2>
        {/if}

        <span class="text-textcolor mt-2">{language.backgroundHTML} <Help key="backgroundHTML" /></span>
        <TextAreaInput highlight margin="both" autocomplete="off" bind:value={DBState.db.characters[$selectedCharID].backgroundHTML}></TextAreaInput>

        <span class="text-textcolor mt-4">{language.regexScript} <Help key="regexScript"/></span>
        <RegexList bind:value={DBState.db.characters[$selectedCharID].customscript} />
        <div class="text-textcolor2 mt-2 flex gap-2">
            <button class="font-medium cursor-pointer hover:text-green-500" onclick={() => {
                if(DBState.db.characters[$selectedCharID].type === 'character'){
                    let script = DBState.db.characters[$selectedCharID].customscript
                    script.push({
                    comment: "",
                    in: "",
                    out: "",
                    type: "editinput"
                    })
                    DBState.db.characters[$selectedCharID].customscript = script
                }
            }}><PlusIcon /></button>
            <button class="font-medium cursor-pointer hover:text-green-500" onclick={() => {
                exportRegex(DBState.db.characters[$selectedCharID].customscript)
            }}><DownloadIcon /></button>
            <button class="font-medium cursor-pointer hover:text-green-500" onclick={async () => {
                DBState.db.characters[$selectedCharID].customscript = await importRegex(DBState.db.characters[$selectedCharID].customscript)
            }}><HardDriveUploadIcon /></button>
        </div>

        <span class="text-textcolor mt-4">{language.triggerScript} <Help key="triggerScript"/></span>
        <TriggerList bind:value={(DBState.db.characters[$selectedCharID] as character).triggerscript} lowLevelAble={DBState.db.characters[$selectedCharID].lowLevelAccess} />


        {#if DBState.db.characters[$selectedCharID].virtualscript || DBState.db.showUnrecommended}
            <span class="text-textcolor mt-4">{language.charjs} <Help key="charjs" unrecommended/></span>
            <TextAreaInput margin="both" autocomplete="off" bind:value={DBState.db.characters[$selectedCharID].virtualscript}></TextAreaInput>
        {/if}
    {/if}
{:else if $CharConfigSubMenu === 6}

    {#if DBState.db.characters[$selectedCharID].license !== 'CC BY-NC-SA 4.0'
    && DBState.db.characters[$selectedCharID].license !== 'CC BY-SA 4.0'
    }
        <Button size="lg" onclick={async () => {
            if(await alertTOS()){
                $ShowRealmFrameStore = 'character'
            }
        }} className="mt-2">
            {#if DBState.db.characters[$selectedCharID].realmId}
                {language.updateRealm}
            {:else}
                {language.shareCloud}
            {/if}
        </Button>
    {/if}

    {#if DBState.db.characters[$selectedCharID].license !== 'CC BY-NC-SA 4.0'
        && DBState.db.characters[$selectedCharID].license !== 'CC BY-SA 4.0'
        && DBState.db.characters[$selectedCharID].license !== 'CC BY-ND 4.0'
        && DBState.db.characters[$selectedCharID].license !== 'CC BY-NC-ND 4.0'
        || DBState.db.tpo
        }
        <Button size="sm" onclick={async () => {
            const res = await exportChar($selectedCharID)
        }} className="mt-2">{language.exportCharacter}</Button>
    {/if}

    <Button onclick={async () => {
        removeChar($selectedCharID, DBState.db.characters[$selectedCharID].name)
    }} className="mt-2" size="sm">{ DBState.db.characters[$selectedCharID].type === 'group' ? language.removeGroup : language.removeCharacter}</Button>
    
{:else if $CharConfigSubMenu === 5}
    {#if DBState.db.characters[$selectedCharID].type === 'character'}
        {#if !$MobileGUI}
            <h2 class="mb-2 text-2xl font-bold mt-2">TTS</h2>
        {/if}
        <span class="text-textcolor">{language.provider}</span>
        <SelectInput className="mb-4 mt-2" bind:value={DBState.db.characters[$selectedCharID].ttsMode} onchange={(e) => {
            if(DBState.db.characters[$selectedCharID].type === 'character'){
                (DBState.db.characters[$selectedCharID] as character).ttsSpeech = ''
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
        

        {#if DBState.db.characters[$selectedCharID].ttsMode === 'webspeech'}
            {#if !speechSynthesis}
                <span class="text-textcolor">Web Speech isn't supported in your browser or OS</span>
            {:else}
                <span class="text-textcolor">{language.Speech}</span>
                <SelectInput className="mb-4 mt-2" bind:value={(DBState.db.characters[$selectedCharID] as character).ttsSpeech}>
                    <OptionInput value="">Auto</OptionInput>
                    {#each getWebSpeechTTSVoices() as voice}
                        <OptionInput value={voice}>{voice}</OptionInput>
                    {/each}
                </SelectInput>
                {#if (DBState.db.characters[$selectedCharID] as character).ttsSpeech !== ''}
                    <span class="text-red-400 text-sm">If you do not set it to Auto, it may not work properly when importing from another OS or browser.</span>
                {/if}
            {/if}
        {:else if DBState.db.characters[$selectedCharID].ttsMode === 'elevenlab'}
            <span class="text-sm mb-2 text-textcolor2">Please set the ElevenLabs API key in "global Settings → Bot Settings → Others → ElevenLabs API key"</span>
            {#await getElevenTTSVoices() then voices}
                <span class="text-textcolor">{language.Speech}</span>
                <SelectInput className="mb-4 mt-2" bind:value={(DBState.db.characters[$selectedCharID] as character).ttsSpeech}>
                    <OptionInput value="">Unset</OptionInput>
                        {#each voices as voice}
                            <OptionInput value={voice.voice_id}>{voice.name}</OptionInput>
                        {/each}
                </SelectInput>
            {/await}
         {:else if DBState.db.characters[$selectedCharID].ttsMode === 'VOICEVOX'}
                <span class="text-textcolor">Speaker</span>
                <SelectInput className="mb-4 mt-2" bind:value={DBState.db.characters[$selectedCharID].voicevoxConfig.speaker}>
                    {#await getVOICEVOXVoices() then voices}
                        {#each voices as voice}
                            <OptionInput value={voice.list}  selected={DBState.db.characters[$selectedCharID].voicevoxConfig.speaker === voice.list}>{voice.name}</OptionInput>
                        {/each}
                    {/await}
                </SelectInput>
                {#if DBState.db.characters[$selectedCharID].voicevoxConfig.speaker}
                <span class="text=neutral-200">Style</span>
                <SelectInput className="mb-4 mt-2" bind:value={DBState.db.characters[$selectedCharID].ttsSpeech}>
                {#each JSON.parse(DBState.db.characters[$selectedCharID].voicevoxConfig.speaker) as styles}
                        <OptionInput value={styles.id} selected={DBState.db.characters[$selectedCharID].ttsSpeech === styles.id}>{styles.name}</OptionInput>
                {/each}
                </SelectInput>
                {/if}
                <span class="text-textcolor">Speed scale</span>
                <NumberInput size={"sm"} marginBottom bind:value={DBState.db.characters[$selectedCharID].voicevoxConfig.SPEED_SCALE}/>

                <span class="text-textcolor">Pitch scale</span>
                <NumberInput size={"sm"} marginBottom bind:value={DBState.db.characters[$selectedCharID].voicevoxConfig.PITCH_SCALE}/>

                <span class="text-textcolor">Volume scale</span>
                <NumberInput size={"sm"} marginBottom bind:value={DBState.db.characters[$selectedCharID].voicevoxConfig.VOLUME_SCALE}/>

                <span class="text-textcolor">Intonation scale</span>
                <NumberInput size={"sm"} marginBottom bind:value={DBState.db.characters[$selectedCharID].voicevoxConfig.INTONATION_SCALE}/>
                <span class="text-sm mb-2 text-textcolor2">To use VOICEVOX, you need to run a colab and put the localtunnel URL in "Settings → Other Bots". https://colab.research.google.com/drive/1tyeXJSklNfjW-aZJAib1JfgOMFarAwze</span>
        {:else if DBState.db.characters[$selectedCharID].ttsMode === 'novelai'}
            <span class="text-textcolor">Custom Voice Seed</span>
            <Check bind:check={DBState.db.characters[$selectedCharID].naittsConfig.customvoice}/>
            {#if !DBState.db.characters[$selectedCharID].naittsConfig.customvoice}
                <span class="text-textcolor">Voice</span>
                <SelectInput className="mb-4 mt-2" bind:value={DBState.db.characters[$selectedCharID].naittsConfig.voice}>
                    {#await getNovelAIVoices() then voices}
                        {#each voices as voiceGroup}
                            <optgroup label={voiceGroup.gender} class="bg-darkbg appearance-none">
                                {#each voiceGroup.voices as voice}
                                    <OptionInput value={voice} selected={DBState.db.characters[$selectedCharID].naittsConfig.voice === voice}>{voice}</OptionInput>
                                {/each}
                            </optgroup>
                        {/each}
                    {/await}
                </SelectInput>
            {:else}
                <span class="text-textcolor">Voice</span>
                <TextInput size={"sm"} bind:value={DBState.db.characters[$selectedCharID].naittsConfig.voice}/>
            {/if}
            <span class="text-textcolor">Version</span>
            <SelectInput className="mb-4 mt-2" bind:value={DBState.db.characters[$selectedCharID].naittsConfig.version}>
                <OptionInput value="v1">v1</OptionInput>
                <OptionInput value="v2">v2</OptionInput>
            </SelectInput>
        {:else if DBState.db.characters[$selectedCharID].ttsMode === 'openai'}
            <SelectInput className="mb-4 mt-2" bind:value={DBState.db.characters[$selectedCharID].oaiVoice}>
                <OptionInput value="">Unset</OptionInput>
                {#each oaiVoices as voice}
                    <OptionInput value={voice}>{voice}</OptionInput>
                {/each}
            </SelectInput>
        {:else if DBState.db.characters[$selectedCharID].ttsMode === 'huggingface'}
            <span class="text-textcolor">Model</span>
            <TextInput className="mb-4 mt-2" bind:value={DBState.db.characters[$selectedCharID].hfTTS.model} />

            <span class="text-textcolor">Language</span>
            <TextInput className="mb-4 mt-2" bind:value={DBState.db.characters[$selectedCharID].hfTTS.language} placeholder="en" />
        {:else if DBState.db.characters[$selectedCharID].ttsMode === 'vits'}
            {#if DBState.db.characters[$selectedCharID].vits}
                <span class="text-textcolor">{DBState.db.characters[$selectedCharID].vits.name ?? 'Unnamed VitsModel'}</span>
            {:else}
                <span class="text-textcolor">No Model</span>
            {/if}
            <Button onclick={async () => {
                const model = await registerOnnxModel()
                if(model && DBState.db.characters[$selectedCharID].type === 'character'){
                    DBState.db.characters[$selectedCharID].vits = model
                }
            }}>{language.selectModel}</Button>
        {:else if DBState.db.characters[$selectedCharID].ttsMode === 'gptsovits'}
            <span class="text-textcolor">Volume</span>
            <SliderInput min={0.0} max={1.0} step={0.01} fixed={2} bind:value={DBState.db.characters[$selectedCharID].gptSoVitsConfig.volume}/>
            <span class="text-textcolor">URL</span>
            <TextInput className="mb-4 mt-2" bind:value={DBState.db.characters[$selectedCharID].gptSoVitsConfig.url}/>

            <span class="text-textcolor">Use Auto Path</span>
            <Check bind:check={DBState.db.characters[$selectedCharID].gptSoVitsConfig.use_auto_path}/>

            {#if !DBState.db.characters[$selectedCharID].gptSoVitsConfig.use_auto_path}
                <span class="text-textcolor">Reference Audio Path (e.g. C:/Users/user/Downloads/GPT-SoVITS-v2-240821)</span>
                <TextInput className="mb-4 mt-2" bind:value={DBState.db.characters[$selectedCharID].gptSoVitsConfig.ref_audio_path}/>
            {/if}

            <span class="text-textcolor">Use Long Audio</span>
            <Check bind:check={DBState.db.characters[$selectedCharID].gptSoVitsConfig.use_long_audio}/>

            <span class="text-textcolor">Reference Audio Data (3~10s audio file)</span>
            <Button onclick={async () => {
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
                DBState.db.characters[$selectedCharID].gptSoVitsConfig.ref_audio_data = {
                    fileName: audio.name,
                    assetId: saveId
                }

            }}
            className="h-10">
                
                {#if DBState.db.characters[$selectedCharID].gptSoVitsConfig.ref_audio_data.assetId === '' || DBState.db.characters[$selectedCharID].gptSoVitsConfig.ref_audio_data.assetId === undefined}
                    {language.selectFile}
                {:else}
                    {DBState.db.characters[$selectedCharID].gptSoVitsConfig.ref_audio_data.fileName}
                {/if}
            </Button>
            <span class="text-textcolor">Text Language</span>
            <SelectInput className="mb-4 mt-2" bind:value={DBState.db.characters[$selectedCharID].gptSoVitsConfig.text_lang}>
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

            {#if !DBState.db.characters[$selectedCharID].gptSoVitsConfig.use_long_audio}
                <span class="text-textcolor">Use Reference Audio Script</span>
                <Check bind:check={DBState.db.characters[$selectedCharID].gptSoVitsConfig.use_prompt}/>
            {/if}

            {#if DBState.db.characters[$selectedCharID].gptSoVitsConfig.use_prompt && !DBState.db.characters[$selectedCharID].gptSoVitsConfig.use_long_audio}
                <span class="text-textcolor">Reference Audio Script</span>
                <TextAreaInput className="mb-4 mt-2" bind:value={DBState.db.characters[$selectedCharID].gptSoVitsConfig.prompt}/>
            {/if}

            <span class="text-textcolor">Reference Audio Language</span>
            <SelectInput className="mb-4 mt-2" bind:value={DBState.db.characters[$selectedCharID].gptSoVitsConfig.prompt_lang}>
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
            <SliderInput min={0.0} max={1.0} step={0.05} fixed={2} bind:value={DBState.db.characters[$selectedCharID].gptSoVitsConfig.top_p}/>

            <span class="text-textcolor">Temperature</span>
            <SliderInput min={0.0} max={1.0} step={0.05} fixed={2} bind:value={DBState.db.characters[$selectedCharID].gptSoVitsConfig.temperature}/>

            <span class="text-textcolor">Speed</span>
            <SliderInput min={0.6} max={1.65} step={0.05} fixed={2} bind:value={DBState.db.characters[$selectedCharID].gptSoVitsConfig.speed}/>

            <span class="text-textcolor">Top K</span>
            <SliderInput min={1} max={100} step={1} bind:value={DBState.db.characters[$selectedCharID].gptSoVitsConfig.top_k}/>

            <span class="text-textcolor">Text Split Method</span>
            <SelectInput className="mb-4 mt-2" bind:value={DBState.db.characters[$selectedCharID].gptSoVitsConfig.text_split_method}>
                <OptionInput value="cut0">Cut 0 (No splitting)</OptionInput>
                <OptionInput value="cut1">Cut 1 (Split every 4 sentences)</OptionInput>
                <OptionInput value="cut2">Cut 2 (Split every 50 characters)</OptionInput>
                <OptionInput value="cut3">Cut 3 (Split by Chinese periods)</OptionInput>
                <OptionInput value="cut4">Cut 4 (Split by English periods)</OptionInput>
                <OptionInput value="cut5">Cut 5 (Split by various punctuation marks)</OptionInput>
            </SelectInput>        
        {:else if DBState.db.characters[$selectedCharID].ttsMode === 'fishspeech'}
            {#await getFishSpeechModels()}
                <span class="text-textcolor">Loading...</span>
            {:then}
                <span class="text-textcolor">Model</span>
                <SelectInput className="mb-4 mt-2" bind:value={DBState.db.characters[$selectedCharID].fishSpeechConfig.model._id}>
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
            <NumberInput className="mb-4 mt-2" bind:value={DBState.db.characters[$selectedCharID].fishSpeechConfig.chunk_length}/>

            <span class="mt-2 text-textcolor">Normalize</span>
            <Check className="mb-4 mt-2" bind:check={DBState.db.characters[$selectedCharID].fishSpeechConfig.normalize}/>
        {/if}
        {#if DBState.db.characters[$selectedCharID].ttsMode}
            <div class="flex items-center mt-2">
                <Check bind:check={DBState.db.characters[$selectedCharID].ttsReadOnlyQuoted} name={language.ttsReadOnlyQuoted}/>
            </div>
        {/if}
    {/if}
{:else if $CharConfigSubMenu === 2}
    {#if !$MobileGUI}
        <h2 class="mb-2 text-2xl font-bold mt-2">{language.advancedSettings}</h2>
    {/if}
        {#if DBState.db.characters[$selectedCharID].type !== 'group'}
        <span class="text-textcolor mt-2">Bias <Help key="bias"/></span>
        <div class="w-full max-w-full border border-selected rounded-md p-2 mb-2">

        <table class="w-full max-w-full tabler mt-2">
            <tbody>
            <tr>
                <th class="font-medium w-1/2">Bias</th>
                <th class="font-medium w-1/3">{language.value}</th>
                <th>
                    <button class="font-medium cursor-pointer hover:text-green-500" onclick={() => {
                        if(DBState.db.characters[$selectedCharID].type === 'character'){
                            (DBState.db.characters[$selectedCharID] as character).bias.push(['', 0])
                        }
                    }}><PlusIcon /></button>
                </th>
            </tr>
            {#if (DBState.db.characters[$selectedCharID] as character).bias.length === 0}
                <tr>
                    <td colspan="3">{language.noBias}</td>

                </tr>
            {/if}
            {#each (DBState.db.characters[$selectedCharID] as character).bias as bias, i}
                <tr class="align-middle text-center">
                    <td class="font-medium truncate w-1/2">
                        <TextInput fullh fullwidth bind:value={(DBState.db.characters[$selectedCharID] as character).bias[i][0]} placeholder="string" />
                    </td> 
                    <td class="font-medium truncate w-1/3">
                        <NumberInput fullh fullwidth bind:value={(DBState.db.characters[$selectedCharID] as character).bias[i][1]} max={100} min={-100} />
                    </td>
                    <td>
                        <button class="font-medium flex justify-center items-center w-full h-full cursor-pointer hover:text-green-500" onclick={() => {
                            if(DBState.db.characters[$selectedCharID].type === 'character'){
                                (DBState.db.characters[$selectedCharID] as character).bias.splice(i, 1)
                            }
                        }}><TrashIcon /></button>
                    </td>
                </tr>
            {/each}
            </tbody>
            
        </table>
        </div>

        <span class="text-textcolor">{language.exampleMessage} <Help key="exampleMessage"/></span>
        <TextAreaInput highlight margin="both" autocomplete="off" bind:value={DBState.db.characters[$selectedCharID].exampleMessage}></TextAreaInput>

        <span class="text-textcolor">{language.creatorNotes} <Help key="creatorQuotes"/></span>
        <MultiLangInput bind:value={DBState.db.characters[$selectedCharID].creatorNotes} className="my-2" onInput={() => {
            DBState.db.characters[$selectedCharID].removedQuotes = false
        }}></MultiLangInput>

        <span class="text-textcolor">{language.systemPrompt} <Help key="systemPrompt"/></span>
        <TextAreaInput highlight margin="both" autocomplete="off" bind:value={DBState.db.characters[$selectedCharID].systemPrompt}></TextAreaInput>

        <span class="text-textcolor">{language.replaceGlobalNote} <Help key="replaceGlobalNote"/></span>
        <TextAreaInput highlight margin="both" autocomplete="off" bind:value={DBState.db.characters[$selectedCharID].replaceGlobalNote}></TextAreaInput>

        <span class="text-textcolor mt-2">{language.additionalText} <Help key="additionalText" /></span>
        <TextAreaInput highlight margin="both" autocomplete="off" bind:value={DBState.db.characters[$selectedCharID].additionalText}></TextAreaInput>

        {#if DBState.db.showUnrecommended || DBState.db.characters[$selectedCharID].personality.length > 3}
            <span class="text-textcolor">{language.personality} <Help key="personality" unrecommended/></span>
            <TextAreaInput highlight margin="both" autocomplete="off" bind:value={DBState.db.characters[$selectedCharID].personality}></TextAreaInput>
        {/if}
        {#if DBState.db.showUnrecommended || DBState.db.characters[$selectedCharID].scenario.length > 3}
            <span class="text-textcolor">{language.scenario} <Help key="scenario" unrecommended/></span>
            <TextAreaInput highlight margin="both" autocomplete="off" bind:value={DBState.db.characters[$selectedCharID].scenario}></TextAreaInput>
        {/if}

        <span class="text-textcolor mt-2">{language.defaultVariables} <Help key="defaultVariables" /></span>
        <TextAreaInput margin="both" autocomplete="off" bind:value={DBState.db.characters[$selectedCharID].defaultVariables}></TextAreaInput>

        <span class="text-textcolor mt-2">{language.translatorNote} <Help key="translatorNote" /></span>
        <TextAreaInput margin="both" autocomplete="off" bind:value={DBState.db.characters[$selectedCharID].translatorNote}></TextAreaInput>

        <span class="text-textcolor">{language.creator}</span>
        <TextInput size="sm" autocomplete="off" bind:value={DBState.db.characters[$selectedCharID].additionalData.creator} />

        <span class="text-textcolor">{language.CharVersion}</span>
        <TextInput size="sm" bind:value={DBState.db.characters[$selectedCharID].additionalData.character_version}/>

        <span class="text-textcolor">{language.nickname} <Help key="nickname" /></span>
        <TextInput size="sm" bind:value={DBState.db.characters[$selectedCharID].nickname}/>

        <span class="text-textcolor">{language.depthPrompt}</span>
        <div class="flex justify-center items-center">
            <NumberInput size="sm" bind:value={DBState.db.characters[$selectedCharID].depth_prompt.depth} className="w-12"/>
            <TextInput size="sm" bind:value={DBState.db.characters[$selectedCharID].depth_prompt.prompt} className="flex-1"/>
        </div>

        <span class="text-textcolor mt-2">{language.altGreet}</span>
        <div class="w-full max-w-full border border-selected rounded-md p-2">
            <table class="contain w-full max-w-full tabler mt-2">
                <tbody>
                <tr>
                    <th class="font-medium">{language.value}</th>
                    <th class="font-medium cursor-pointer w-8">
                        <button class="hover:text-green-500" onclick={() => {
                            if(DBState.db.characters[$selectedCharID].type === 'character'){
                                let alternateGreetings = DBState.db.characters[$selectedCharID].alternateGreetings
                                alternateGreetings.push('')
                                DBState.db.characters[$selectedCharID].alternateGreetings = alternateGreetings
                            }
                        }}>
                            <PlusIcon />
                        </button>
                    </th>
                </tr>
                {#if DBState.db.characters[$selectedCharID].alternateGreetings.length === 0}
                    <tr>
                        <td colspan="3">{language.noData}</td>
                    </tr>
                {/if}
                {#each DBState.db.characters[$selectedCharID].alternateGreetings as bias, i}
                    <tr>
                        <td class="font-medium truncate">
                            <TextAreaInput highlight bind:value={DBState.db.characters[$selectedCharID].alternateGreetings[i]} placeholder="..." fullwidth />
                        </td>
                        <th class="font-medium cursor-pointer w-8">
                            <div class="flex flex-col items-center">
                                <button class="hover:text-blue-500 p-1" onclick={() => moveAlternateGreetingUp(i)} disabled={i === 0}>
                                    <ArrowUp size={16} />
                                </button>
                                <button class="hover:text-blue-500 p-1" onclick={() => moveAlternateGreetingDown(i)} disabled={i === DBState.db.characters[$selectedCharID].alternateGreetings.length - 1}>
                                    <ArrowDown size={16} />
                                </button>
                                <button class="hover:text-red-500 p-1" onclick={() => {
                                    if(DBState.db.characters[$selectedCharID].type === 'character'){
                                        DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].fmIndex = -1
                                        let alternateGreetings = DBState.db.characters[$selectedCharID].alternateGreetings
                                        alternateGreetings.splice(i, 1)
                                        DBState.db.characters[$selectedCharID].alternateGreetings = alternateGreetings
                                    }
                                }}>
                                    <TrashIcon size={16} />
                                </button>
                            </div>
                        </th>
                    </tr>
                {/each}
            </tbody>
            </table>
        </div>

        <div class="flex items-center mt-4">
            <Check bind:check={DBState.db.characters[$selectedCharID].lowLevelAccess} name={language.lowLevelAccess}/>
            <span> <Help key="lowLevelAccess" name={language.lowLevelAccess}/></span>
        </div>

        <div class="flex items-center mt-4">
            <Check bind:check={DBState.db.characters[$selectedCharID].hideChatIcon} name={language.hideChatIcon}/>
        </div>

        <div class="flex items-center mt-4">
            <Check bind:check={DBState.db.characters[$selectedCharID].utilityBot} name={language.utilityBot}/>
            <span> <Help key="utilityBot" name={language.utilityBot}/></span>
        </div>

        <div class="flex items-center mt-4">
            <Check bind:check={DBState.db.characters[$selectedCharID].escapeOutput} name={language.escapeOutput}/>
        </div>

        {#if DBState.db.supaModelType !== 'none' && DBState.db.hypav2}
            <Button
                onclick={() => {
                    DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].hypaV2Data ??= {
                        lastMainChunkID: 0,
                        mainChunks: [],
                        chunks: [],
                    }
                    showHypaV2Alert()
                }}
                className="mt-4"
            >
                {language.hypaMemoryV2Modal}
            </Button>
        {:else if DBState.db.hypaV3}
            <Button
                onclick={() => {
                    $hypaV3ModalOpen = true
                }}
                className="mt-4"
            >
                {language.hypaMemoryV3Modal}
            </Button>
        {:else if DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].supaMemoryData && DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].supaMemoryData.length > 4 || DBState.db.characters[$selectedCharID].supaMemory}
            <span class="text-textcolor mt-4">{language.SuperMemory}</span>
            <TextAreaInput margin="both" autocomplete="off" bind:value={DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].supaMemoryData}></TextAreaInput>
        {/if}

        <Button
            onclick={applyModule}
            className="mt-4"
        >
            {language.applyModule}
        </Button>

    {:else}
        {#if DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].supaMemoryData && DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].supaMemoryData.length > 4 || DBState.db.characters[$selectedCharID].supaMemory}
            <span class="text-textcolor mt-4">{language.SuperMemory}</span>
            <TextAreaInput margin="both" autocomplete="off" bind:value={DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].supaMemoryData}></TextAreaInput>
        {/if}

        <div class="flex items-center mt-4">
            <Check bind:check={DBState.db.characters[$selectedCharID].lowLevelAccess} name={language.lowLevelAccess}/>
            <span> <Help key="lowLevelAccess" name={language.lowLevelAccess}/></span>
        </div>
    {/if}
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