<script lang="ts">
    import { language } from "../../lang";
    import { tokenize } from "../../ts/tokenizer";
    import { DataBase, saveImage as saveAsset, type Database, type character, type groupChat } from "../../ts/storage/database";
    import { selectedCharID } from "../../ts/stores";
    import { PlusIcon, SmileIcon, TrashIcon, UserIcon, ActivityIcon, BookIcon, LoaderIcon, User, DnaIcon, CurlyBracesIcon, Volume2Icon, XIcon } from 'lucide-svelte'
    import Check from "../Others/Check.svelte";
    import { addCharEmotion, addingEmotion, getCharImage, rmCharEmotion, selectCharImg, makeGroupImage } from "../../ts/characters";
    import LoreBook from "./LoreBookSetting.svelte";
    import { alertConfirm, alertError, alertSelectChar } from "../../ts/alert";
    import BarIcon from "./BarIcon.svelte";
    import { findCharacterbyId, selectMultipleFile } from "../../ts/util";
    import { onDestroy } from "svelte";
    import {isEqual, cloneDeep} from 'lodash'
    import Help from "../Others/Help.svelte";
    import RegexData from "./RegexData.svelte";
    import { exportChar, shareRisuHub } from "src/ts/characterCards";
    import { getElevenTTSVoices, getWebSpeechTTSVoices, getVOICEVOXVoices } from "src/ts/process/tts";
    import { checkCharOrder, getFileSrc } from "src/ts/storage/globalApi";
    import { addGroupChar, rmCharFromGroup } from "src/ts/process/group";
  import HubUpload from "../UI/HubUpload.svelte";

    let subMenu = 0
    let openHubUpload = false
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
        console.log('tokenize')
        const cha = chara
        if(cha.type !== 'group'){
            if(lasttokens.desc !== cha.desc){
                if(cha.desc){
                    lasttokens.desc = cha.desc
                    tokens.desc = await tokenize(cha.desc)
                }
            }
            if(lasttokens.firstMsg !==chara.firstMessage){
                lasttokens.firstMsg = chara.firstMessage
                tokens.firstMsg = await tokenize(chara.firstMessage)
            }
        }
        if(lasttokens.localNote !== currentChar.data.chats[currentChar.data.chatPage].note){
            lasttokens.localNote = currentChar.data.chats[currentChar.data.chatPage].note
            tokens.localNote = await tokenize(currentChar.data.chats[currentChar.data.chatPage].note)
        
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


    const unsub = DataBase.subscribe((v) => {
        database = v
        const cha = (v.characters[$selectedCharID])
        if(!cha){
            return
        }
        if((!currentChar) || (!isEqual(currentChar.data, cha))){
            console.log("updated")
            if(cha.type === 'character'){
                currentChar = {
                    type: 'character',
                    data: cloneDeep(cha)
                }
            }
            else{
                currentChar = {
                    type: 'group',
                    data: cloneDeep(cha)
                }
            }
        }
        emos = currentChar.data.emotionImages
        currentChar = currentChar
    })

    let assetFileExtensions:string[] = []
    let assetFilePath:string[] = []

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

</script>

<div class="flex gap-2 mb-2">
    <button class={subMenu === 0 ? 'text-gray-200 ' : 'text-gray-500'} on:click={() => {subMenu = 0}}>
        <UserIcon />
    </button>
    <button class={subMenu === 1 ? 'text-gray-200' : 'text-gray-500'} on:click={() => {subMenu = 1}}>
        <SmileIcon />
    </button>
    <button class={subMenu === 3 ? 'text-gray-200' : 'text-gray-500'} on:click={() => {subMenu = 3}}>
        <BookIcon />
    </button>
    {#if currentChar.type === 'character'}
        <button class={subMenu === 5 ? 'text-gray-200' : 'text-gray-500'} on:click={() => {subMenu = 5}}>
            <Volume2Icon />
        </button>
        <button class={subMenu === 4 ? 'text-gray-200' : 'text-gray-500'} on:click={() => {subMenu = 4}}>
            <CurlyBracesIcon />
        </button>
    {/if}
    <button class={subMenu === 2 ? 'text-gray-200' : 'text-gray-500'} on:click={() => {subMenu = 2}}>
        <ActivityIcon />
    </button>
</div>


{#if subMenu === 0}
    {#if currentChar.type !== 'group'}
        <input class="text-neutral-200 mt-2 mb-4 p-2 bg-transparent input-text text-xl focus:bg-selected" placeholder="Character Name" bind:value={currentChar.data.name}>
        <span class="text-neutral-200">{language.description} <Help key="charDesc"/></span>
        <textarea class="bg-transparent input-text mt-2 mb-2 text-gray-200 text-xs resize-none h-20 focus:bg-selected" autocomplete="off" bind:value={currentChar.data.desc}></textarea>
        <span class="text-gray-400 mb-6 text-sm">{tokens.desc} {language.tokens}</span>
        <span class="text-neutral-200">{language.firstMessage} <Help key="charFirstMessage"/></span>
        <textarea class="bg-transparent input-text mt-2 mb-2 text-gray-200 text-xs resize-none h-20 focus:bg-selected" autocomplete="off" bind:value={currentChar.data.firstMessage}></textarea>
        <span class="text-gray-400 mb-6 text-sm">{tokens.firstMsg} {language.tokens}</span>

    {:else}
        <input class="text-neutral-200 mt-2 mb-4 p-2 bg-transparent input-text text-xl focus:bg-selected" placeholder="Group Name" bind:value={currentChar.data.name}>
        <span class="text-neutral-200">{language.character}</span>
        <div class="p-4 gap-2 bg-bgcolor rounded-lg char-grid">
            {#if currentChar.data.characters.length === 0}
                <span class="text-gray-500">No Character</span>
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
        <div class="text-gray-500 mt-1 flex mb-6">
            <button on:click={addGroupChar} class="hover:text-neutral-200 cursor-pointer">
                <PlusIcon />
            </button>
        </div>

    {/if}
    <span class="text-neutral-200">{language.authorNote} <Help key="chatNote"/></span>
    <textarea class="bg-transparent input-text mt-2 mb-2 text-gray-200 resize-none h-20 focus:bg-selected text-xs" autocomplete="off" bind:value={currentChar.data.chats[currentChar.data.chatPage].note}></textarea>
    <span class="text-gray-400 mb-6 text-sm">{tokens.localNote} {language.tokens}</span>     
    <div class="flex mt-6 items-center">
        <Check bind:check={$DataBase.jailbreakToggle} name={language.jailbreakToggle}/>
    </div>
    
    {#if $DataBase.supaMemoryType !== 'none'}
        <div class="flex mt-2 items-center">
            <Check bind:check={currentChar.data.supaMemory} name={language.ToggleSuperMemory}/>
        </div>
    {/if}

    {#if currentChar.type === 'group'}
        <div class="flex mt-2 items-center">
            <Check bind:check={currentChar.data.orderByOrder} name={language.orderByOrder}/>
        </div>
    {/if}
{:else if subMenu === 1}
    <h2 class="mb-2 text-2xl font-bold mt-2">{language.characterDisplay}</h2>
    <span class="text-neutral-200 mt-2 mb-2">{currentChar.type !== 'group' ? language.charIcon : language.groupIcon}</span>
    <button on:click={async () => {await selectCharImg($selectedCharID);currentChar = currentChar}}>
        {#if currentChar.data.image === ''}
            <div class="rounded-md h-32 w-32 shadow-lg bg-gray-500 cursor-pointer hover:text-green-500" />
        {:else}
            {#await getCharImage(currentChar.data.image, 'css')}
                <div class="rounded-md h-32 w-32 shadow-lg bg-gray-500 cursor-pointer hover:text-green-500"></div>
            {:then im}
                <div class="rounded-md h-32 w-32 shadow-lg bg-gray-500 cursor-pointer hover:text-green-500" style={im} />                
            {/await}
        {/if}
    </button>

    {#if currentChar.type === 'group'}
        <button
            on:click={makeGroupImage}
            class="drop-shadow-lg p-2 border-borderc border-solid mt-2 flex justify-center items-center ml-2 mr-2 border-1 hover:bg-selected">
            {language.createGroupImg}
        </button>
    {/if}


    <span class="text-neutral-200 mt-6 mb-2">{language.viewScreen}</span>
    <!-- svelte-ignore empty-block -->

    {#if currentChar.type !== 'group'}
        <select class="bg-transparent input-text mb-4 text-gray-200 appearance-none" bind:value={currentChar.data.viewScreen}>
            <option value="none" class="bg-darkbg appearance-none">{language.none}</option>
            <option value="emotion" class="bg-darkbg appearance-none">{language.emotionImage}</option>
            <option value="imggen" class="bg-darkbg appearance-none">{language.imageGeneration}</option>
        </select>
    {:else}
    <select class="bg-transparent input-text mb-4 text-gray-200 appearance-none" bind:value={currentChar.data.viewScreen}>
        <option value="none" class="bg-darkbg appearance-none">{language.none}</option>
        <option value="single" class="bg-darkbg appearance-none">{language.singleView}</option>
        <option value="multiple" class="bg-darkbg appearance-none">{language.SpacedView}</option>
        <option value="emp" class="bg-darkbg appearance-none">{language.emphasizedView}</option>

    </select>
    {/if}

    {#if currentChar.data.viewScreen === 'emotion'}
        <span class="text-neutral-200 mt-6">{language.emotionImage} <Help key="emotion"/></span>
        <span class="text-gray-400 text-xs">{language.emotionWarn}</span>

        <table class="contain w-full max-w-full tabler">
            <tr>
                <th class="font-medium w-1/3">{language.image}</th>
                <th class="font-medium w-1/2">{language.emotion}</th>
                <th class="font-medium"></th>
            </tr>
            {#if currentChar.data.emotionImages.length === 0}
                <tr>
                    <div class="text-gray-500">{language.noImages}</div>
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
                            <input class="text-neutral-200 mt-2 mb-4 p-2 bg-transparent input-text text-xl focus:bg-selected" bind:value={currentChar.data.emotionImages[i][0]}>
                        </td>
                        <button class="font-medium cursor-pointer hover:text-green-500" on:click={() => {
                            rmCharEmotion($selectedCharID,i)
                        }}><TrashIcon /></button>
                    </tr>
                {/each}
            {/if}
        </table>

        <div class="text-gray-500 hover:text-neutral-200 mt-2 flex">
            {#if !$addingEmotion}
                <button class="cursor-pointer hover:text-green-500" on:click={() => {addCharEmotion($selectedCharID)}}>
                    <PlusIcon />
                </button>
            {:else}
                <span>Loading...</span>
            {/if}
        </div>
    {/if}
    {#if currentChar.data.viewScreen === 'imggen'}
        <span class="text-neutral-200 mt-6">{language.imageGeneration} <Help key="imggen"/></span>
        <span class="text-gray-400 text-xs">{language.emotionWarn}</span>
        
        
        <table class="contain w-full max-w-full tabler">
            <tr>
                <th class="font-medium w-1/3">{language.key}</th>
                <th class="font-medium w-1/2">{language.value}</th>
                <th class="font-medium"></th>
            </tr>
            {#if currentChar.data.sdData.length === 0}
                <tr>
                    <div class="text-gray-500">{language.noData}</div>
                </tr>
            {/if}
            {#each currentChar.data.sdData as emo, i}
                <tr>
                    <td class="font-medium truncate w-1/3">
                        <input class="text-neutral-200 mt-2 mb-4 p-2 bg-transparent input-text focus:bg-selected text-sm" bind:value={currentChar.data.sdData[i][0]}>
                    </td>
                    <td class="font-medium truncate w-1/2">
                        <input class="text-neutral-200 mt-2 mb-4 p-2 bg-transparent input-text focus:bg-selected text-sm" bind:value={currentChar.data.sdData[i][1]}>
                    </td>
                    {#if (!['always','negative'].includes(currentChar.data.sdData[i][0]))}
                    <button class="font-medium flex justify-center items-center h-full cursor-pointer hover:text-green-500" on:click={() => {
                            let db = ($DataBase)
                            let charId = $selectedCharID
                            let dbChar = db.characters[charId]
                            if(dbChar.type !== 'group'){
                                dbChar.sdData.splice(i, 1)
                                db.characters[charId] = dbChar
                            }
                            $DataBase = (db)
                    }}><TrashIcon /></button>
                    {:else}
                    <td></td>
                    {/if}
                </tr>
            {/each}
            
        </table>
        <div class="text-gray-500 hover:text-neutral-200 mt-2 flex">
            {#if !$addingEmotion}
                <button class="cursor-pointer hover:text-green-500" on:click={() => {
                    let db = ($DataBase)
                    let charId = $selectedCharID
                    let dbChar = db.characters[charId]
                    if(dbChar.type !== 'group'){
                        dbChar.sdData.push(['', ''])
                        db.characters[charId] = dbChar
                    }
                    $DataBase = (db)
                }}>
                    <PlusIcon />
                </button>
            {:else}
                <span>Loading...</span>
            {/if}
        </div>
        <span class="text-neutral-200 mt-6">{language.currentImageGeneration}</span>
        {#if currentChar.data.chats[currentChar.data.chatPage].sdData}
            <textarea class="bg-transparent input-text mt-2 mb-2 text-gray-200 resize-none h-20 focus:bg-selected" autocomplete="off" bind:value={currentChar.data.chats[currentChar.data.chatPage].sdData}></textarea>
        {:else}
            <span><div class="text-gray-500">{language.noData}</div></span>
        {/if}
    {/if}
{:else if subMenu === 3}
    <h2 class="mb-2 text-2xl font-bold mt-2">{language.loreBook} <Help key="lorebook"/></h2>
    <LoreBook />
{:else if subMenu === 4}
    {#if currentChar.type === 'character'}
        <h2 class="mb-2 text-2xl font-bold mt-2">{language.scripts}</h2>

        <span class="text-neutral-200 mt-2">Bias <Help key="bias"/></span>
        <table class="contain w-full max-w-full tabler mt-2">
            <tr>
                <th class="font-medium w-1/2">Bias</th>
                <th class="font-medium w-1/3">{language.value}</th>
                <th class="font-medium cursor-pointer hover:text-green-500" on:click={() => {
                    if(currentChar.type === 'character'){
                        let bia = currentChar.data.bias
                        bia.push(['', 0])
                        currentChar.data.bias = bia
                    }
                }}><PlusIcon /></th>
            </tr>
            {#if currentChar.data.bias.length === 0}
                <tr>
                    <div class="text-gray-500"> {language.noBias}</div>
                </tr>
            {/if}
            {#each currentChar.data.bias as bias, i}
                <tr>
                    <td class="font-medium truncate w-1/2">
                        <input class="text-neutral-200 mt-2 mb-4 p-2 bg-transparent input-text focus:bg-selected" bind:value={currentChar.data.bias[i][0]} placeholder="string">
                    </td>
                    <td class="font-medium truncate w-1/3">
                        <input class="text-neutral-200 mt-2 mb-4 w-full p-2 bg-transparent input-text focus:bg-selected" bind:value={currentChar.data.bias[i][1]} type="number" max="100" min="-100">
                    </td>
                    <button class="font-medium flex justify-center items-center h-full cursor-pointer hover:text-green-500" on:click={() => {
                        if(currentChar.type === 'character'){
                            let bia = currentChar.data.bias
                            bia.splice(i, 1)
                            currentChar.data.bias = bia
                        }
                    }}><TrashIcon /></button>
                </tr>
            {/each}
            
        </table>

        <span class="text-neutral-200 mt-4">{language.regexScript} <Help key="regexScript"/></span>
        <table class="contain w-full max-w-full tabler mt-2 flex flex-col p-2 gap-2">
            {#if currentChar.data.customscript.length === 0}
                    <div class="text-gray-500">No Scripts</div>
            {/if}
            {#each currentChar.data.customscript as customscript, i}
                <RegexData bind:value={currentChar.data.customscript[i]}  onRemove={() => {
                    if(currentChar.type === 'character'){
                        let customscript = currentChar.data.customscript
                        customscript.splice(i, 1)
                        currentChar.data.customscript = customscript
                    }
                }}/>
            {/each}
        </table>
        <button class="font-medium cursor-pointer hover:text-green-500 mb-2" on:click={() => {
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
    {/if}
{:else if subMenu === 5}
    {#if currentChar.type === 'character'}
        <h2 class="mb-2 text-2xl font-bold mt-2">TTS</h2>
        <span class="text-neutral-200">{language.provider}</span>
        <select class="bg-transparent input-text mt-2 mb-4 text-gray-200 appearance-none text-sm" bind:value={currentChar.data.ttsMode} on:change={() => {
            if(currentChar.type === 'character'){
                currentChar.data.ttsSpeech = ''
            }
        }}>
            <option value="" class="bg-darkbg appearance-none">{language.disabled}</option>
            <option value="elevenlab" class="bg-darkbg appearance-none">ElevenLabs</option>
            <option value="webspeech" class="bg-darkbg appearance-none">Web Speech</option>
            <option value="VOICEVOX" class="bg-darkbg appearance-none">VOICEVOX</option>
        </select>
        

        {#if currentChar.data.ttsMode === 'webspeech'}
            {#if !speechSynthesis}
                <span class="text-neutral-200">Web Speech isn't supported in your browser or OS</span>
            {:else}
                <span class="text-neutral-200">{language.Speech}</span>
                <select class="bg-transparent input-text mt-2 mb-4 text-gray-200 appearance-none text-sm" bind:value={currentChar.data.ttsSpeech}>
                    <option value="" class="bg-darkbg appearance-none">Auto</option>
                    {#each getWebSpeechTTSVoices() as voice}
                        <option value={voice} class="bg-darkbg appearance-none">{voice}</option>
                    {/each}
                </select>
                {#if currentChar.data.ttsSpeech !== ''}
                    <span class="text-red-400 text-sm">If you do not set it to Auto, it may not work properly when importing from another OS or browser.</span>
                {/if}
            {/if}
        {:else if currentChar.data.ttsMode === 'elevenlab'}
            <span class="text-sm mb-2 text-gray-400">Please set the ElevenLabs API key in "global Settings → Bot Settings → Others → ElevenLabs API key"</span>
            {#await getElevenTTSVoices() then voices}
                <span class="text-neutral-200">{language.Speech}</span>
                <select class="bg-transparent input-text mt-2 mb-4 text-gray-200 appearance-none text-sm" bind:value={currentChar.data.ttsSpeech}>
                    <option value="" class="bg-darkbg appearance-none">Unset</option>
                        {#each voices as voice}
                            <option value={voice.voice_id} class="bg-darkbg appearance-none">{voice.name}</option>
                        {/each}
                </select>
            {/await}
         {:else if currentChar.data.ttsMode === 'VOICEVOX'}
                <span class="text-neutral-200">Speaker</span>
                <select class="bg-transparent input-text mt-2 mb-4 text-gray-200 appearance-none text-sm" bind:value={currentChar.data.voicevoxConfig.speaker}>
                    {#await getVOICEVOXVoices() then voices}
                        {#each voices as voice}
                            <option value={voice.list} class="bg-darkbg appearance-none"  selected={currentChar.data.voicevoxConfig.speaker === voice.list}>{voice.name}</option>
                        {/each}
                    {/await}
                </select>
                {#if currentChar.data.voicevoxConfig.speaker}
                <span class="text=neutral-200">Style</span>
                <select class="bg-transparent input-text mt-2 mb-4 text-gray-200 appearance-none text-sm" bind:value={currentChar.data.ttsSpeech}>
                {#each JSON.parse(currentChar.data.voicevoxConfig.speaker) as styles}
                        <option value={styles.id} class="bg-darkbg appearance-none" selected={currentChar.data.ttsSpeech === styles.id}>{styles.name}</option>
                {/each}
                </select>
                {/if}
                <span class="text-neutral-200">Speed scale</span>
                <input class="bg-transparent input-text mt-2 mb-2 text-gray-200 text-xs resize-none h-5 focus:bg-selected" autocomplete="off" bind:value={currentChar.data.voicevoxConfig.SPEED_SCALE}/>

                <span class="text-neutral-200">Pitch scale</span>
                <input class="bg-transparent input-text mt-2 mb-2 text-gray-200 text-xs resize-none h-5 focus:bg-selected" autocomplete="off" bind:value={currentChar.data.voicevoxConfig.PITCH_SCALE}/>

                <span class="text-neutral-200">Volume scale</span>
                <input class="bg-transparent input-text mt-2 mb-2 text-gray-200 text-xs resize-none h-5 focus:bg-selected" autocomplete="off" bind:value={currentChar.data.voicevoxConfig.VOLUME_SCALE}/>

                <span class="text-neutral-200">Intonation scale</span>
                <input class="bg-transparent input-text mt-2 mb-2 text-gray-200 text-xs resize-none h-5 focus:bg-selected" autocomplete="off" bind:value={currentChar.data.voicevoxConfig.INTONATION_SCALE}/>
                <span class="text-sm mb-2 text-gray-400">To use VOICEVOX, you need to run a colab and put the localtunnel URL in "Settings → Other Bots". https://colab.research.google.com/drive/1tyeXJSklNfjW-aZJAib1JfgOMFarAwze</span>
        {/if}
        {#if currentChar.data.ttsMode === 'webspeech' || currentChar.data.ttsMode === 'elevenlab' || currentChar.data.ttsMode === 'VOICEVOX'}
            <div class="flex items-center mt-2">
                <Check bind:check={currentChar.data.ttsReadOnlyQuoted} name={language.ttsReadOnlyQuoted}/>
            </div>
        {/if}
    {/if}
{:else if subMenu === 2}
    <h2 class="mb-2 text-2xl font-bold mt-2">{language.advancedSettings}</h2>
    {#if currentChar.type !== 'group'}
        <span class="text-neutral-200">{language.exampleMessage} <Help key="exampleMessage"/></span>
        <textarea class="bg-transparent input-text mt-2 mb-2 text-gray-200 text-xs resize-none h-20 focus:bg-selected" autocomplete="off" bind:value={currentChar.data.exampleMessage}></textarea>

        <span class="text-neutral-200">{language.creatorNotes} <Help key="creatorQuotes"/></span>
        <textarea class="bg-transparent input-text mt-2 mb-2 text-gray-200 text-xs resize-none h-20 focus:bg-selected" autocomplete="off" bind:value={currentChar.data.creatorNotes} on:input={() => {
            currentChar.data.removedQuotes = false
        }}></textarea>

        <span class="text-neutral-200">{language.systemPrompt} <Help key="systemPrompt"/></span>
        <textarea class="bg-transparent input-text mt-2 mb-2 text-gray-200 text-xs resize-none h-20 focus:bg-selected" autocomplete="off" bind:value={currentChar.data.systemPrompt}></textarea>

        <span class="text-neutral-200">{language.replaceGlobalNote} <Help key="replaceGlobalNote"/></span>
        <textarea class="bg-transparent input-text mt-2 mb-2 text-gray-200 text-xs resize-none h-20 focus:bg-selected" autocomplete="off" bind:value={currentChar.data.replaceGlobalNote}></textarea>


        {#if currentChar.data.chats[currentChar.data.chatPage].supaMemoryData && currentChar.data.chats[currentChar.data.chatPage].supaMemoryData.length > 4}
            <span class="text-neutral-200">{language.SuperMemory}</span>
            <textarea class="bg-transparent input-text mt-2 mb-2 text-gray-200 text-xs resize-none h-20 focus:bg-selected" autocomplete="off" bind:value={currentChar.data.chats[currentChar.data.chatPage].supaMemoryData}></textarea>
        {/if}
        {#if $DataBase.showUnrecommended || currentChar.data.personality.length > 3}
            <span class="text-neutral-200">{language.personality} <Help key="personality" unrecommended/></span>
            <textarea class="bg-transparent input-text mt-2 mb-2 text-gray-200 text-xs resize-none h-20 focus:bg-selected" autocomplete="off" bind:value={currentChar.data.personality}></textarea>
        {/if}
        {#if $DataBase.showUnrecommended || currentChar.data.scenario.length > 3}
            <span class="text-neutral-200">{language.scenario} <Help key="scenario" unrecommended/></span>
            <textarea class="bg-transparent input-text mt-2 mb-2 text-gray-200 text-xs resize-none h-20 focus:bg-selected" autocomplete="off" bind:value={currentChar.data.scenario}></textarea>
        {/if}

        <span class="text-neutral-200 mt-2">{language.backgroundHTML} <Help key="backgroundHTML" /></span>
        <textarea class="bg-transparent input-text mt-2 mb-2 text-gray-200 text-xs resize-none h-20 focus:bg-selected" autocomplete="off" bind:value={currentChar.data.backgroundHTML}></textarea>

        <span class="text-neutral-200">{language.creator}</span>
        <input class="bg-transparent input-text mt-2 mb-2 text-gray-200 text-xs resize-none h-20 focus:bg-selected" autocomplete="off" bind:value={currentChar.data.additionalData.creator} />

        <span class="text-neutral-200">{language.CharVersion}</span>
        <input class="bg-transparent input-text mt-2 mb-2 text-gray-200 text-xs resize-none h-20 focus:bg-selected" autocomplete="off" bind:value={currentChar.data.additionalData.character_version} type="number" />

        <span class="text-neutral-200 mt-2">{language.altGreet}</span>
        <table class="contain w-full max-w-full tabler mt-2">
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
                    <div class="text-gray-500"> No Messages</div>
                </tr>
            {/if}
            {#each currentChar.data.alternateGreetings as bias, i}
                <tr>
                    <td class="font-medium truncate">
                        <textarea class="text-neutral-200 mt-2 mb-4 p-2 bg-transparent input-text focus:bg-selected w-full resize-none" bind:value={currentChar.data.alternateGreetings[i]} placeholder="..." />
                    </td>
                    <th class="font-medium cursor-pointer w-10">
                        <button class="hover:text-green-500" on:click={() => {
                            if(currentChar.type === 'character'){
                                currentChar.data.firstMsgIndex = -1
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
        </table>
      
        <span class="text-neutral-200 mt-2">{language.additionalAssets} <Help key="additionalAssets" /></span>
        <table class="contain w-full max-w-full tabler mt-2">
            <tr>
                <th class="font-medium">{language.value}</th>
                <th class="font-medium cursor-pointer w-10">
                    <button class="hover:text-green-500" on:click={async () => {
                        if(currentChar.type === 'character'){
                            const da = await selectMultipleFile(['png', 'webp', 'mp4', 'mp3', 'gif'])
                            currentChar.data.additionalAssets = currentChar.data.additionalAssets ?? []
                            if(!da){
                                return
                            }
                            for(const f of da){
                                console.log(f)
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
                    <div class="text-gray-500"> No Assets</div>
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
                                {:else}
                                    <img src={assetFilePath[i]} class="w-16 h-16 m-1 rounded-md" alt={assets[0]}/>
                                {/if}
                            {/if}
                            <input class="text-neutral-200 mt-2 mb-4 p-2 bg-transparent input-text focus:bg-selected w-full resize-none" bind:value={currentChar.data.additionalAssets[i][0]} placeholder="..." />
                        </td>
                        
                        <th class="font-medium cursor-pointer w-10">
                            <button class="hover:text-green-500" on:click={() => {
                                if(currentChar.type === 'character'){
                                    currentChar.data.firstMsgIndex = -1
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
        </table>

        {#if $DataBase.showUnrecommended || currentChar.data.utilityBot}
            <div class="flex items-center mt-4">
                <Check bind:check={currentChar.data.utilityBot} name={language.utilityBot}/>
                <span> <Help key="utilityBot" unrecommended name={language.utilityBot}/></span>
            </div>
        {/if}

        <button on:click={async () => {
            exportChar($selectedCharID)
        }} class="text-neutral-200 mt-6 text-lg bg-transparent border-solid border-1 border-borderc p-4 hover:bg-green-500 transition-colors cursor-pointer">{language.exportCharacter}</button>
        <button on:click={async () => {
            openHubUpload = true
        }} class="text-neutral-200 mt-2 text-lg bg-transparent border-solid border-1 border-borderc p-4 hover:bg-green-500 transition-colors cursor-pointer">{language.shareCloud}</button>
        {#if openHubUpload}
            <HubUpload bind:char={currentChar.data} close={() => {openHubUpload=false}}/>
        {/if}
    {:else}
        {#if currentChar.data.chats[currentChar.data.chatPage].supaMemoryData && currentChar.data.chats[currentChar.data.chatPage].supaMemoryData.length > 4}
            <span class="text-neutral-200">{language.SuperMemory}</span>
            <textarea class="bg-transparent input-text mt-2 mb-2 text-gray-200 text-xs resize-none h-20 focus:bg-selected" autocomplete="off" bind:value={currentChar.data.chats[currentChar.data.chatPage].supaMemoryData}></textarea>
        {/if}
        {#if $DataBase.useExperimental}
            <div class="flex mb-2 items-center">
                <Check bind:check={currentChar.data.useCharacterLore} name={language.useCharLorebook}/>
                <Help key="experimental" name={language.useCharLorebook}/>
            </div>
        {/if}
    {/if}
    <button on:click={async () => {
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

    }} class="text-neutral-200 mt-2 bg-transparent border-solid border-1 border-borderc p-2 hover:bg-draculared transition-colors cursor-pointer">{ currentChar.type === 'group' ? language.removeGroup : language.removeCharacter}</button>
{/if}


<style>
    .contain{
        border: #6272a4 1px solid
    }

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