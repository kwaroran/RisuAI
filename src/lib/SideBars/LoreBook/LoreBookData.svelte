<script lang="ts">
    import { XIcon, LinkIcon, SunIcon, BookCopyIcon } from "lucide-svelte";
    import { v4 } from "uuid";
    import { language } from "../../../lang";
    import { getCurrentCharacter, getCurrentChat, type loreBook } from "../../../ts/storage/database.svelte";
    import { alertConfirm, alertMd } from "../../../ts/alert";
    import Check from "../../UI/GUI/CheckInput.svelte";
    import Help from "../../Others/Help.svelte";
    import TextInput from "../../UI/GUI/TextInput.svelte";
    import NumberInput from "../../UI/GUI/NumberInput.svelte";
    import TextAreaInput from "../../UI/GUI/TextAreaInput.svelte";
    import { tokenizeAccurate } from "src/ts/tokenizer";

    interface Props {
        value: loreBook;
        onRemove?: () => void;
        onClose?: () => void;
        onOpen?: () => void;
        lorePlus?: boolean;
        idx: number;
    }

    let {
        value = $bindable(),
        onRemove = () => {},
        onClose = () => {},
        onOpen = () => {},
        lorePlus = false,
        idx
    }: Props = $props();
    let open = $state(false)

    async function getTokens(data:string){
        tokens = await tokenizeAccurate(data)
        return tokens
    }
    let tokens = $state(0)

    function isLocallyActivated(book: loreBook){
        return getCurrentChat()?.localLore.some(e => 
            e.id === book.id &&
            e.alwaysActive
        )
    }
    function ActivateLocally(book: loreBook){
        const chat = getCurrentChat()
        let childLore: loreBook | undefined
        
        if(!book.id){
            book.id = v4()
        }else{
            childLore = chat.localLore.find(e => e.id === book.id)
        }
        
        if(childLore){
            childLore.alwaysActive = true
        }else{
            childLore = {
                key: '',
                comment: '',
                content: '',
                mode: 'child',
                insertorder: 100,
                alwaysActive: true,
                secondkey: '',
                selective: false,
                id: book.id,
            }
            chat.localLore.push(childLore)
        }
    }
    function DeactivateLocally(book: loreBook){
        if(!book.id) return
        const chat = getCurrentChat()
        const childLore = chat?.localLore?.find(e => e.id === book.id)
        if(childLore){
            chat.localLore = chat.localLore.filter(e => e.id !== book.id)
        }
    }
    function toggleLocalActive(check: boolean, book: loreBook){
        if(check){
            ActivateLocally(book)
        }else{
            DeactivateLocally(book)
        }
    }
    function getParentLoreName(book: loreBook){
        if(book.mode === 'child'){
            const value = getCurrentCharacter()?.globalLore.find(e => e.id === book.id)
            if(value){
                return value.comment.length === 0 ? value.key.length === 0 ? "Unnamed Lore" : value.key : value.comment
            }
        }
    }
</script>

<div class="w-full flex flex-col pt-2 mt-2 border-t border-t-selected first:pt-0 first:mt-0 first:border-0" data-risu-idx={idx}>
    <div class="flex items-center transition-colors w-full p-1">
    {#if value.mode !== 'child'}
        <button class="endflex valuer border-darkborderc" onclick={() => {
            value.secondkey = value.secondkey ?? ''
            open = !open
            if(open){
                onOpen()
            }
            else{
                onClose()
            }
        }}>
            <span>{value.comment.length === 0 ? value.key.length === 0 ? "Unnamed Lore" : value.key : value.comment}</span>
        </button>
        <button
            class="mr-1"
            class:text-textcolor2={!value.alwaysActive}
            class:text-textcolor={value.alwaysActive}
            onclick={async () => {
                value.alwaysActive = !value.alwaysActive
            }}
        >
            {#if value.alwaysActive}
                <SunIcon size={20} />
            {:else}
                <LinkIcon size={20} />
            {/if}
        </button>
        <button class="valuer" onclick={async () => {
            const d = await alertConfirm(language.removeConfirm + value.comment)
            if(d){
                if(!open){
                    onClose()
                }
                DeactivateLocally(value)
                onRemove()
            }
        }}>
            <XIcon size={20} />
        </button>
    {:else}
        <button class="endflex valuer border-darkborderc" onclick={() => alertMd(language.childLoreDesc)}>
            <BookCopyIcon size={20} class="mr-1" />
            <span>{getParentLoreName(value)}</span>
        </button>
        <button class="valuer" onclick={async () => {
            const d = await alertConfirm(language.removeConfirm + getParentLoreName(value))
            if(d){
                if(!open){
                    onClose()
                }
                onRemove()
            }
        }}>
            <XIcon size={20} />
        </button>
    {/if}
    </div>
    {#if open}
        <div class="border-0 outline-none w-full mt-2 flex flex-col mb-2">
            <span class="text-textcolor mt-6">{language.name} <Help key="loreName"/></span>
            <TextInput size="sm" bind:value={value.comment}/>
            {#if !lorePlus}
                {#if !value.alwaysActive}
                    <span class="text-textcolor mt-6">{language.activationKeys} <Help key="loreActivationKey"/></span>
                    <span class="text-xs text-textcolor2">{language.activationKeysInfo}</span>
                    <TextInput size="sm" bind:value={value.key}/>

                    {#if value.selective}
                        <span class="text-textcolor mt-6">{language.SecondaryKeys}</span>
                        <span class="text-xs text-textcolor2">{language.activationKeysInfo}</span>
                        <TextInput size="sm" bind:value={value.secondkey}/>
                    {/if}
                {/if}
            {/if}
            {#if !lorePlus}
                {#if !(value.activationPercent === undefined || value.activationPercent === null)}
                    <span class="text-textcolor mt-6">{language.activationProbability}</span>
                    <NumberInput size="sm" bind:value={value.activationPercent} onChange={() => {
                        if(isNaN(value.activationPercent) || !value.activationPercent || value.activationPercent < 0){
                            value.activationPercent = 0
                        }
                        if(value.activationPercent > 100){
                            value.activationPercent = 100
                        }
                    }} />
                {/if}
            {/if}
            {#if !lorePlus}
                <span class="text-textcolor mt-4">{language.insertOrder} <Help key="loreorder"/></span>
                <NumberInput size="sm" bind:value={value.insertorder} min={0} max={1000}/>
            {/if}
            <span class="text-textcolor mt-4 mb-2">{language.prompt}</span>
            <TextAreaInput highlight autocomplete="off" bind:value={value.content} />
            {#await getTokens(value.content)}
                <span class="text-textcolor2 mt-2 mb-2 text-sm">{tokens} {language.tokens}</span>
            {:then e}
                <span class="text-textcolor2 mt-2 mb-2 text-sm">{e} {language.tokens}</span>
            {/await}
            <div class="flex items-center mt-4">
                <Check bind:check={value.alwaysActive} name={language.alwaysActive}/>
            </div>
            {#if !value.alwaysActive && getCurrentCharacter()?.globalLore?.includes(value)}
                <div class="flex items-center mt-2">
                    <Check check={isLocallyActivated(value)} onChange={(check: boolean) => toggleLocalActive(check, value)} name={language.alwaysActiveInChat}/>
                </div>
            {/if}
            {#if !lorePlus && !value.useRegex}
                <div class="flex items-center mt-2">
                    <Check bind:check={value.selective} name={language.selective}/>
                    <Help key="loreSelective" name={language.selective}/>
                </div>
            {/if}
            {#if !lorePlus && !value.alwaysActive}
                <div class="flex items-center mt-2">
                    <Check bind:check={value.useRegex} name={language.useRegexLorebook}/>
                    <Help key="useRegexLorebook" name={language.useRegexLorebook}/>
                </div>
            {/if}
        </div>
    {/if}
</div>



<style>
    .valuer:hover{
        color: rgba(16, 185, 129, 1);
        cursor: pointer;
    }

    .endflex{
        display: flex;
        flex-grow: 1;
        cursor: pointer;
    }
    
</style>