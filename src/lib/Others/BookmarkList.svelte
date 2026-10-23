<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { XIcon, TrashIcon, PencilIcon, BookOpenCheckIcon, BookLockIcon, ArrowRightIcon, MoreVerticalIcon, HistoryIcon, ListOrderedIcon } from "@lucide/svelte";
    import Chat from "../ChatScreens/Chat.svelte";
    import { getCharImage } from "src/ts/characters";
    import { findCharacterbyId, getUserName, getUserIcon } from "src/ts/util";
    import { createSimpleCharacter, bookmarkListOpen, DBState, selectedCharID, ScrollToMessageStore } from "src/ts/stores.svelte";
    import { language } from "src/lang";
    import { alertInput } from "src/ts/alert";

    const close = () => $bookmarkListOpen = false;
    let chara = $derived(DBState.db.characters[$selectedCharID]);
    const simpleChar = $derived(createSimpleCharacter(chara));

    const messageMap = $derived.by(() => {
        if (!chara) return new Map();

        const chat = chara.chats[chara.chatPage];
        const allMessages = chat.message;
        const map = new Map();
        
        allMessages.forEach((m, index) => {
            map.set(m.chatId, { ...m, originalIndex: index, saying: m.saying ?? '' });
        });

        return map;
    });

    let sortByMessageOrder = $state(true);

    const bookmarkedMessages = $derived.by(() => {
        if (!chara) return [];

        const chat = chara.chats[chara.chatPage];
        const bookmarkIds = chat.bookmarks ?? [];
        const map = messageMap; 

        const messages = bookmarkIds
            .map(id => {
                const message = map.get(id); 
                if (!message) return null;

                let speaker = null;
                if (chara.type === 'group' && message.saying) {
                    speaker = findCharacterbyId(message.saying);
                }
                
                return { ...message, speaker };
            })
            .filter(Boolean);

        if (sortByMessageOrder) {
            messages.sort((a, b) => a.originalIndex - b.originalIndex);
        }

        return messages;
    });

    let expandedBookmarks = $state(new Set<string>());
    let expandAll = $state(false);
    let openMenuId = $state<string | null>(null);

    onMount(() => {
        const handleKeydown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                if (openMenuId) {
                    openMenuId = null;
                } else {
                    close();
                }
            }
        };
        const handleClick = () => openMenuId = null;
        window.addEventListener('keydown', handleKeydown);
        window.addEventListener('click', handleClick);
        return () => {
            window.removeEventListener('keydown', handleKeydown);
            window.removeEventListener('click', handleClick);
        };
    });

    function getExcerpt(data: string) {
        return data.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
    }

    let menuStyle = $state('');

    function toggleMenu(chatId: string, button: HTMLElement) {
        if (openMenuId === chatId) {
            openMenuId = null;
            return;
        }
        // Fixed position so the menu is not clipped by the scrolling list
        const rect = button.getBoundingClientRect();
        const right = window.innerWidth - rect.right;
        menuStyle = rect.bottom + 100 > window.innerHeight
            ? `right: ${right}px; bottom: ${window.innerHeight - rect.top + 4}px;`
            : `right: ${right}px; top: ${rect.bottom + 4}px;`;
        openMenuId = chatId;
    }

    function toggleExpand(chatId: string) {
        if (expandAll) {
            expandAll = false;
            const allIds = bookmarkedMessages.map(m => m.chatId);
            const newSet = new Set(allIds);
            newSet.delete(chatId);
            expandedBookmarks = newSet;
        } else {
            const newSet = new Set(expandedBookmarks);
            if (newSet.has(chatId)) {
                newSet.delete(chatId);
            } else {
                newSet.add(chatId);
            }
            expandedBookmarks = newSet;
        }
    }

    function toggleExpandAll() {
        expandAll = !expandAll;
        if (expandAll) {
            expandedBookmarks.clear();
        }
    }

    async function editName(chatId: string) {
        const chat = chara.chats[chara.chatPage];
        const newName = await alertInput(language.bookmarkAskNameOrCancel, [], chat.bookmarkNames?.[chatId] || '');
        if (newName && newName.trim() !== '') {
            chat.bookmarkNames[chatId] = newName;
        }
    }

    function removeBookmark(chatId: string) {
        const chat = chara.chats[chara.chatPage];
        const index = chat.bookmarks.indexOf(chatId);
        if (index > -1) {
            chat.bookmarks.splice(index, 1);
            delete chat.bookmarkNames[chatId];
        }
    }

    function goToChat(index: number) {
        ScrollToMessageStore.value = index;
        close();
    }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="fixed top-0 left-0 w-full h-full z-30 bg-black/50 flex justify-center items-center"
    onclick={(event) => {
        if (event.target === event.currentTarget) {
            close();
        }
    }}
    onkeydown={(event) => {
        if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
            close();
        }
    }}
>
    <div class="bg-darkbg p-2 sm:p-3 rounded-md flex flex-col max-w-4xl w-full max-h-[90%] overflow-y-auto" onscroll={() => openMenuId = null}>
        <div class="flex items-center text-textcolor mb-4">
            <h2 class="text-xl font-bold">{language.bookmarks}</h2>
            <div class="ml-auto flex items-center gap-2">
                <button
                    class="text-textcolor2 hover:text-green-500"
                    onclick={() => sortByMessageOrder = !sortByMessageOrder}
                    title={sortByMessageOrder ? language.sortByAddedOrder : language.sortByMessageOrder}
                >
                    {#if sortByMessageOrder}
                        <HistoryIcon size={20} />
                    {:else}
                        <ListOrderedIcon size={20} />
                    {/if}
                </button>
                <button
                    class="text-textcolor2 hover:text-green-500" 
                    onclick={toggleExpandAll}
                    title={expandAll ? language.collapseAll : language.expandAll}
                >
                    {#if expandAll}
                        <BookLockIcon size={20} />
                    {:else}
                        <BookOpenCheckIcon size={20} />
                    {/if}   
                </button>
                <button class="text-textcolor2 hover:text-green-500" onclick={close}>
                    <XIcon size={24}/>
                </button>
            </div>
        </div>
        
        {#if bookmarkedMessages.length === 0}
            <p class="text-textcolor2">{language.noBookmarks}</p>
        {:else}
            <div class="flex flex-col gap-2">
                {#each bookmarkedMessages as msg (msg.chatId)}
                    <div class="border border-darkborderc rounded-lg">
                        <div 
                            class="flex items-center px-2.5 py-2 sm:p-3 cursor-pointer hover:bg-selected transition-colors"
                            onclick={() => toggleExpand(msg.chatId)}
                            onkeydown={(e) => e.key === 'Enter' && toggleExpand(msg.chatId)}
                            role="button"
                            tabindex="0"
                        >
                            <div class="grow min-w-0 text-left line-clamp-2 wrap-break-word"><span class="mr-1.5 text-xs text-textcolor2 tabular-nums">#{msg.originalIndex}</span>{chara.chats[chara.chatPage].bookmarkNames?.[msg.chatId] || getExcerpt(msg.data)}</div>
                            <div class="shrink-0 flex items-center gap-1 ml-2">
                                <button class="p-1 text-textcolor2 hover:text-blue-500" title={language.goToChat} onclick={(e) => { e.stopPropagation(); goToChat(msg.originalIndex); }}>
                                    <ArrowRightIcon size={20} />
                                </button>
                                <div>
                                    <button class="p-1 text-textcolor2 hover:text-textcolor" onclick={(e) => { e.stopPropagation(); toggleMenu(msg.chatId, e.currentTarget); }}>
                                        <MoreVerticalIcon size={20} />
                                    </button>
                                    {#if openMenuId === msg.chatId}
                                        <div class="fixed z-40 min-w-28 py-1 bg-darkbg border border-darkborderc rounded-md shadow-lg" style={menuStyle}>
                                            <button class="w-full flex items-center gap-2 px-3 py-2 text-left text-textcolor hover:bg-selected" onclick={(e) => { e.stopPropagation(); openMenuId = null; editName(msg.chatId); }}>
                                                <PencilIcon size={16} />
                                                <span>{language.edit}</span>
                                            </button>
                                            <button class="w-full flex items-center gap-2 px-3 py-2 text-left text-draculared hover:bg-selected" onclick={(e) => { e.stopPropagation(); openMenuId = null; removeBookmark(msg.chatId); }}>
                                                <TrashIcon size={16} />
                                                <span>{language.remove}</span>
                                            </button>
                                        </div>
                                    {/if}
                                </div>
                            </div>
                        </div>

                        {#if expandAll || expandedBookmarks.has(msg.chatId)}
                            <div class="p-1 border-t border-darkborderc">
                                {#if chara.type === 'group'}
                                    <Chat
                                        idx={msg.originalIndex}
                                        message={msg.data}
                                        name={msg.speaker?.name}
                                        img={getCharImage(msg.speaker?.image, 'css')}
                                        role={msg.role}
                                        messageGenerationInfo={msg.generationInfo}
                                        rerollIcon={false}
                                        largePortrait={msg.speaker?.largePortrait}
                                        character={msg.saying}
                                        isLastMemory={false}
                                    />
                                {:else}
                                    <Chat
                                        idx={msg.originalIndex}
                                        message={msg.data}
                                        name={msg.role === 'user' ? getUserName() : chara.name}
                                        img={msg.role === 'user' ? getCharImage(getUserIcon(), 'css') : getCharImage(chara.image, 'css')}
                                        role={msg.role}
                                        messageGenerationInfo={msg.generationInfo}
                                        rerollIcon={false}
                                        largePortrait={chara.largePortrait}
                                        character={simpleChar}
                                        isLastMemory={false}
                                    />
                                {/if}
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>