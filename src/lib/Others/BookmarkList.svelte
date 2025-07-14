<script lang="ts">
    import { XIcon, TrashIcon } from "lucide-svelte";
    import type { character, groupChat } from "src/ts/storage/database.svelte";
    import Chat from "../ChatScreens/Chat.svelte";
    import { getCharImage } from "src/ts/characters";
    import { findCharacterbyId, getUserName, getUserIcon } from "src/ts/util";
    import { createSimpleCharacter } from "src/ts/stores.svelte";
    import { language } from "src/lang";

    interface Props {
        chara: character | groupChat;
        close: () => void;
    }

    let { chara, close }: Props = $props();

    const simpleChar = $derived(createSimpleCharacter(chara));

    const bookmarkedMessages = $derived(
        chara.chats[chara.chatPage].bookmarks
            ?.map(id => {
                const message = chara.chats[chara.chatPage].message.find(m => m.chatId === id);
                const index = chara.chats[chara.chatPage].message.findIndex(m => m.chatId === id);
                return message ? { ...message, originalIndex: index, saying: message.saying ?? '' } : null;
            })
            .filter(Boolean) ?? []
    );

    function removeBookmark(chatId: string) {
        const chat = chara.chats[chara.chatPage];
        const index = chat.bookmarks.indexOf(chatId);
        if (index > -1) {
            chat.bookmarks.splice(index, 1);
            chat.bookmarks = [...chat.bookmarks];
        }
    }
</script>

<div class="absolute w-full h-full z-50 bg-black bg-opacity-50 flex justify-center items-center">
    <div class="bg-darkbg p-4 rounded-md flex flex-col max-w-3xl w-full max-h-[80%] overflow-y-auto">
        <div class="flex items-center text-textcolor mb-4">
            <h2 class="text-xl font-bold">{language.bookmarks}</h2>
            <button class="ml-auto text-textcolor2 hover:text-green-500" onclick={close}>
                <XIcon size={24}/>
            </button>
        </div>
        {#if bookmarkedMessages.length === 0}
            <p class="text-textcolor2">{language.noBookmarks}</p>
        {:else}
            {#each bookmarkedMessages as msg (msg.chatId)}
                <div class="flex items-start my-2">
                    <div class="flex-grow">
                        {#if chara.type === 'group'}
                            {@const speaker = findCharacterbyId(msg.saying)}
                            <Chat
                                idx={msg.originalIndex}
                                message={msg.data}
                                name={speaker.name}
                                img={getCharImage(speaker.image, 'css')}
                                role={msg.role}
                                messageGenerationInfo={msg.generationInfo}
                                rerollIcon={false}
                                largePortrait={speaker.largePortrait}
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
                    <button class="ml-2 mt-4 text-textcolor2 hover:text-red-500" onclick={() => removeBookmark(msg.chatId)}>
                        <TrashIcon size={18}/>
                    </button>
                </div>
            {/each}
        {/if}
    </div>
</div>