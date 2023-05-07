<script lang="ts">
    import { language } from "../../lang";
    import { tokenize } from "../../ts/tokenizer";
    import { DataBase, type Database, type character, type groupChat } from "../../ts/database";
    import { selectedCharID } from "../../ts/stores";
    import { PlusIcon, SmileIcon, TrashIcon, UserIcon, ActivityIcon, BookIcon, LoaderIcon, User } from 'lucide-svelte'
    import Check from "../Others/Check.svelte";
    import { addCharEmotion, addingEmotion, exportChar, getCharImage, rmCharEmotion, selectCharImg, makeGroupImage } from "../../ts/characters";
    import LoreBook from "./LoreBookSetting.svelte";
    import { alertConfirm, alertError, alertSelectChar } from "../../ts/alert";
    import BarIcon from "./BarIcon.svelte";
    import { findCharacterbyId } from "../../ts/util";
    import { onDestroy } from "svelte";
    import {isEqual, cloneDeep} from 'lodash'
    import Help from "../Others/Help.svelte";
  import RegexData from "./RegexData.svelte";

    let subMenu = 0
    let subberMenu = 0
    let emos:[string, string][] = []
    let tokens = {
        desc: 0,
        firstMsg: 0,
        localNote: 0
    }

    let lasttokens = {
        desc: '',
        firstMsg: '',
        localNote: ''
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

    $:{
        loadTokenize(currentChar.data)
    }

    async function addGroupChar(){
        let group = currentChar.data
        if(group.type === 'group'){
            const res = await alertSelectChar()
            if(res){
                if(group.characters.includes(res)){
                    alertError(language.errors.alreadyCharInGroup)
                }
                else{
                    if(await alertConfirm(language.askLoadFirstMsg)){
                        group.chats[group.chatPage].message.push({
                            role:'char',
                            data: findCharacterbyId(res).firstMessage,
                            saying: res,
                        })
                    }

                    group.characters.push(res)
                    currentChar.data = group
                }
            }
        }
    }


    function rmCharFromGroup(index:number){
        let group = currentChar.data
        if(group.type === 'group'){
            group.characters.splice(index, 1)
            currentChar.data = group
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
        const cha = v.characters[$selectedCharID]
        if(!cha){
            return
        }
        if((!currentChar) || (!isEqual(currentChar.data, cha))){
            if(cha.type === 'character'){
                currentChar = {
                    type: 'character',
                    data: (cha)
                }
            }
            else{
                currentChar = {
                    type: 'group',
                    data: (cha)
                }
            }
        }
        emos = currentChar.data.emotionImages
    })

    
    $: {
        if(database.characters[$selectedCharID].chaId === currentChar.data.chaId){
            database.characters[$selectedCharID] = currentChar.data
        }
        else{
            loadTokenize(currentChar.data)
        }
        emos = currentChar.data.emotionImages
        DataBase.set(database)
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
    <button class={subMenu === 3 ? 'text-gray-200' : 'text-gray-500'} on:click={() => {subMenu = 3;subberMenu = 0}}>
        <BookIcon />
    </button>
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
        <div class="p-2 flex gap-2">
            {#if currentChar.data.characters.length === 0}
                <span class="text-gray-500">No Character</span>
            {:else}
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
                {/each}
            {/if}
        </div>
        <div class="text-gray-500 mt-1 flex mb-6">
            <button on:click={addGroupChar} class="hover:text-neutral-200 cursor-pointer">
                <PlusIcon />
            </button>
        </div>

    {/if}
    <span class="text-neutral-200">{language.authorNote} <Help key="charNote"/></span>
    <textarea class="bg-transparent input-text mt-2 mb-2 text-gray-200 resize-none h-20 focus:bg-selected text-xs" autocomplete="off" bind:value={currentChar.data.chats[currentChar.data.chatPage].note}></textarea>
    <span class="text-gray-400 mb-6 text-sm">{tokens.localNote} {language.tokens}</span>

    <div class="flex mt-6 items-center">
        <Check bind:check={$DataBase.jailbreakToggle}/>
        <span class="text-neutral-200 ml-2">{language.jailbreakToggle}</span>
    </div>
{:else if subMenu === 1}
    <h2 class="mb-2 text-2xl font-bold mt-2">{language.characterDisplay}</h2>
    <span class="text-neutral-200 mt-2 mb-2">{currentChar.type !== 'group' ? language.charIcon : language.groupIcon}</span>
    <button on:click={() => {selectCharImg($selectedCharID)}}>
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
{:else if subMenu === 2}
    <h2 class="mb-2 text-2xl font-bold mt-2">{language.advancedSettings}</h2>
    {#if currentChar.type !== 'group'}
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
                    <div class="text-gray-500">{language.noBias}</div>
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
        <span class="text-neutral-200 mt-4">{language.regexScript} <Help key="experimental"/></span>
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
        <th class="font-medium cursor-pointer hover:text-green-500" on:click={() => {
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
        }}><PlusIcon /></th>
        <div class="flex items-center mt-4">
            <Check bind:check={currentChar.data.utilityBot}/>
            <span>{language.utilityBot}</span>
        </div>
        <button on:click={async () => {
            exportChar($selectedCharID)
        }} class="text-neutral-200 mt-6 text-lg bg-transparent border-solid border-1 border-borderc p-4 hover:bg-green-500 transition-colors cursor-pointer">{language.exportCharacter}</button>
    
    {:else}

    <div class="flex mb-2 items-center">
        <Check bind:check={currentChar.data.useCharacterLore}/>
        <span class="text-neutral-200 ml-2">{language.useCharLorebook} <Help key="experimental"/></span>
    </div>
    
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
</style>