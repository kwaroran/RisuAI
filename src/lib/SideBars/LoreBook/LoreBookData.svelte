<script lang="ts">
    import { XIcon, LinkIcon, SunIcon, BookCopyIcon, FolderIcon, FolderOpen, PlusIcon } from "@lucide/svelte";
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
    import { DBState } from "src/ts/stores.svelte";
    import LoreBookList from "./LoreBookList.svelte";

    interface Props {
        value: loreBook;
        onRemove?: () => void;
        onClose?: (isDetail?: boolean) => void;
        onOpen?: (isDetail?: boolean) => void;
        lorePlus?: boolean;
        idx: number;
        externalLoreBooks?: loreBook[];
        idgroup: string;
        isOpen?: boolean;
        openFolders?: number;
        isLastInContainer?: boolean;
    }

    let {
        value = $bindable(),
        onRemove = () => {},
        onClose = (isDetail = true) => {},
        onOpen = (isDetail = true) => {},
        lorePlus = false,
        idx,
        externalLoreBooks = $bindable(),
        idgroup,
        isOpen = false,
        openFolders = 0,
        isLastInContainer = false
    }: Props = $props();
    
    let open = $derived(isOpen)

    async function getTokens(data:string){
        tokens = await tokenizeAccurate(data)
        return tokens
    }
    let tokens = $state(0)

    function isLocallyActivated(book: loreBook){
        return book.id ? getCurrentChat()?.localLore.some(e => e.id === book.id) : false
    }
    function activateLocally(book: loreBook){
        if(!book.id){
            book.id = v4()
        }
        
        const childLore: loreBook = {
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
        getCurrentChat().localLore.push(childLore)
    }
    function deactivateLocally(book: loreBook){
        if(!book.id) return
        const chat = getCurrentChat()
        const childLore = chat?.localLore?.find(e => e.id === book.id)
        if(childLore){
            chat.localLore = chat.localLore.filter(e => e.id !== book.id)
        }
    }
    function toggleLocalActive(check: boolean, book: loreBook){
        if(check){
            activateLocally(book)
        }else{
            deactivateLocally(book)
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
<div class={"w-full flex flex-col " + (
    isLastInContainer ? 
        'pb-0 mb-0 border-0' : // Last item in container: no border
        'pb-2 mb-2 border-b border-b-selected last:pb-0 last:mb-0 last:border-0'
)}
    class:no-sort={value.mode === 'folder' && openFolders > 0}
    data-risu-idx={idx} data-risu-idgroup={idgroup}
>
    <div class="flex items-center transition-colors w-full p-1">

    {#if value.mode !== 'child'}
        <button class="endflex valuer border-darkborderc flex items-center" onclick={() => {
            value.secondkey = value.secondkey ?? ''
            if(!open){
                open = true
                onOpen(value.mode !== 'folder') // If not a folder, pass true
            }
            else{
                open = false
                onClose(value.mode !== 'folder') // If not a folder, pass true
            }
        }}>
            {#if value.mode === 'folder'}
                {#if open}
                    <FolderOpen size={20} class="mr-1" />
                {:else}
                    <FolderIcon size={20} class="mr-1" />
                {/if}
            {/if}
            {#if value.mode === 'folder'}
                <span>{value.comment.length === 0 ? "Unnamed Folder" : value.comment}</span>
            {:else}
                <span>{value.comment.length === 0 ? value.key.length === 0 ? "Unnamed Lore" : value.key : value.comment}</span>
            {/if}
        </button>
        <button
            class="mr-1"
            class:text-textcolor2={!value.alwaysActive}
            class:text-textcolor={value.alwaysActive}
            onclick={async () => {
                if(value.mode === 'folder'){
                    for(let i = 0; i < externalLoreBooks.length; i++){
                        if(externalLoreBooks[i].folder === value.key){
                            externalLoreBooks[i].alwaysActive = !value.alwaysActive
                        }
                    }
                }
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
            let shouldRemove = true;
            if (value.mode === 'folder' && externalLoreBooks.some(e => e.folder === value.key)) {
                const firstConfirm = await alertConfirm(language.folderRemoveConfirm);
                if (!firstConfirm) {
                    shouldRemove = false;
                }
            }

            if (shouldRemove) {
                const secondConfirm = await alertConfirm(language.removeConfirm + (value.comment || 'Unnamed Folder'));
                if (secondConfirm) {
                    if (!open) {
                        onClose();
                    }
                    deactivateLocally(value);
                    onRemove();
                }
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
        {#if value.mode === 'folder'}
        <div class="border-0 outline-hidden w-full mt-2 flex flex-col mb-2">
            <span class="text-textcolor mt-6 mb-2">{language.folderName}</span>
            <TextInput size="sm" bind:value={value.comment}/>

            <div class="mt-4">
                <LoreBookList externalLoreBooks={externalLoreBooks} showFolder={value.key} />
            </div>
            
            <div class="mt-2 flex gap-1">
                <button class="text-textcolor2 hover:text-textcolor" onclick={() => {
                    externalLoreBooks.push({
                        key: '',
                        comment: '',
                        content: '',
                        mode: 'normal',
                        insertorder: 100,
                        alwaysActive: true,
                        secondkey: '',
                        selective: false,
                        folder: value.key,
                    })
                }}>
                    <PlusIcon size={20} />
                </button>
            </div>
        </div>
        {:else}
        <div class="border-0 outline-hidden w-full mt-2 flex flex-col mb-2">
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
            {#if !value.alwaysActive && getCurrentCharacter()?.globalLore?.includes(value) && DBState.db.localActivationInGlobalLorebook}
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

    /* Styles for SortableJS drag-and-drop feedback */
    :global(.risu-chosen-item) {
        /* The item being dragged */
        padding-bottom: 0.5rem;
        margin-bottom: 0.5rem;
        border-bottom: 1px solid;
        border-bottom-color: var(--risu-theme-selected);
        opacity: 0.7;
    }

    :global(.risu-ghost-item) {
        /* The placeholder for the drop location */
        background-color: rgba(var(--risu-theme-selected-rgb), 0.2);

    }
</style>