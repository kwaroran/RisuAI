<script lang="ts">
  import { Trash2Icon, XIcon, StarIcon, RefreshCw } from "lucide-svelte";
  import TextAreaInput from "../UI/GUI/TextAreaInput.svelte";
  import { alertConfirm } from "../../ts/alert";
  import { DBState, alertStore, selectedCharID } from "src/ts/stores.svelte";
  import { summarize } from "src/ts/process/memory/hypav3";

  let hypaV3IsResummarizing = $state(false);
  let hypaV3ExpandedChatMemo = $state<{
    summaryChatMemos: string[];
    summaryChatMemo: string;
  }>({
    summaryChatMemos: [],
    summaryChatMemo: "",
  });
</script>

<div class="fixed inset-0 z-50 bg-black bg-opacity-50 p-4">
  <div class="h-full w-full flex justify-center">
    <div
      class="bg-darkbg p-4 break-any rounded-md flex flex-col w-full max-w-3xl {DBState
        .db.characters[$selectedCharID].chats[
        DBState.db.characters[$selectedCharID].chatPage
      ].hypaV3Data.summaries.length === 0
        ? 'h-48'
        : 'max-h-full'}"
    >
      <div class="flex justify-between items-center w-full mb-4">
        <h1 class="text-xl font-bold">HypaV3 Data</h1>
        <div class="flex items-center gap-2">
          <!-- Reset Button -->
          <button
            class="p-2 hover:text-red-500 transition-colors"
            onclick={async () => {
              let confirmed = await alertConfirm(
                "This action cannot be undone. Do you want to reset HypaV3 data?"
              );

              if (confirmed) {
                confirmed = await alertConfirm(
                  "This action is irreversible. Do you really, really want to reset HypaV3 data?"
                );

                if (confirmed) {
                  DBState.db.characters[$selectedCharID].chats[
                    DBState.db.characters[$selectedCharID].chatPage
                  ].hypaV3Data = {
                    summaries: [],
                  };
                }
              }
            }}
          >
            <Trash2Icon size={24} />
          </button>
          <!-- Close Button -->
          <button
            class="p-2 hover:text-red-500 transition-colors"
            onclick={() => {
              alertStore.set({
                type: "none",
                msg: "",
              });
            }}
          >
            <XIcon size={24} />
          </button>
        </div>
      </div>
      <div class="flex flex-col gap-4 w-full overflow-y-auto">
        {#each DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].hypaV3Data.summaries as summary, i}
          <div
            class="flex flex-col p-4 rounded-md border-darkborderc border bg-bgcolor"
          >
            <!-- Summary Area -->
            <div class="mb-4">
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm text-textcolor2">Summary #{i + 1}</span>
                <div class="flex items-center gap-4">
                  <!-- Important Button -->
                  <button
                    class="p-1 hover:text-yellow-500 transition-colors {summary.isImportant
                      ? 'text-yellow-500'
                      : 'text-textcolor2'}"
                    onclick={() => {
                      summary.isImportant = !summary.isImportant;
                    }}
                  >
                    <StarIcon size={16} />
                  </button>
                  <!-- Resummarize Button -->
                  <button
                    class="p-1 hover:text-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    onclick={async () => {
                      hypaV3IsResummarizing = true;

                      try {
                        const char = DBState.db.characters[$selectedCharID];
                        const chat =
                          char.chats[
                            DBState.db.characters[$selectedCharID].chatPage
                          ];
                        const firstMessage =
                          chat.fmIndex === -1
                            ? char.firstMessage
                            : char.alternateGreetings?.[chat.fmIndex ?? 0];
                        const toSummarize = summary.chatMemos.map(
                          (chatMemo) => {
                            if (chatMemo == null) {
                              return {
                                role: "assistant",
                                data: firstMessage,
                              };
                            }

                            const msg = chat.message.find(
                              (m) => m.chatId === chatMemo
                            );
                            return msg
                              ? {
                                  role:
                                    msg.role === "char"
                                      ? "assistant"
                                      : msg.role,
                                  data: msg.data,
                                }
                              : null;
                          }
                        );
                        const stringifiedChats = toSummarize
                          .map((m) => `${m.role}: ${m.data}`)
                          .join("\n");
                        const summarizeResult =
                          await summarize(stringifiedChats);

                        if (summarizeResult.success) {
                          summary.text = summarizeResult.data;
                        }
                      } finally {
                        hypaV3IsResummarizing = false;
                      }
                    }}
                    disabled={hypaV3IsResummarizing}
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>
              </div>
              <!-- Editable Summary -->
              <TextAreaInput bind:value={summary.text} className="bg-darkbg" />
            </div>

            <!-- Connected Messages -->
            <div class="mt-2">
              <span class="text-sm text-textcolor2 mb-2 block">
                Connected Messages ({summary.chatMemos.length})
              </span>
              <div class="flex flex-col gap-2">
                <!-- Message ID -->
                <div class="flex flex-wrap gap-1">
                  {#each summary.chatMemos as chatMemo}
                    <button
                      class="text-xs px-2 py-1 bg-darkbg rounded-full text-textcolor2 hover:bg-opacity-80 cursor-pointer {hypaV3ExpandedChatMemo.summaryChatMemos ===
                        summary.chatMemos &&
                      hypaV3ExpandedChatMemo.summaryChatMemo === chatMemo
                        ? 'ring-1 ring-blue-500'
                        : ''}"
                      onclick={() => {
                        hypaV3ExpandedChatMemo =
                          hypaV3ExpandedChatMemo.summaryChatMemos ===
                            summary.chatMemos &&
                          hypaV3ExpandedChatMemo.summaryChatMemo === chatMemo
                            ? { summaryChatMemos: [], summaryChatMemo: "" }
                            : {
                                summaryChatMemos: summary.chatMemos,
                                summaryChatMemo: chatMemo,
                              };
                      }}
                    >
                      {chatMemo == null ? "First Message" : chatMemo}
                    </button>
                  {/each}
                </div>

                <!-- Message Content Area -->
                {#if hypaV3ExpandedChatMemo.summaryChatMemos === summary.chatMemos && hypaV3ExpandedChatMemo.summaryChatMemo !== ""}
                  <div
                    class="text-sm bg-darkbg/50 rounded border border-darkborderc"
                  >
                    <div
                      class="p-2 max-h-48 overflow-y-auto"
                      style="white-space: pre-wrap;"
                    >
                      {(() => {
                        const char = DBState.db.characters[$selectedCharID];
                        const chat =
                          char.chats[
                            DBState.db.characters[$selectedCharID].chatPage
                          ];
                        const firstMessage =
                          chat.fmIndex === -1
                            ? char.firstMessage
                            : char.alternateGreetings?.[chat.fmIndex ?? 0];
                        const targetMessage =
                          hypaV3ExpandedChatMemo.summaryChatMemo == null
                            ? { role: "char", data: firstMessage }
                            : chat.message.find(
                                (m) =>
                                  m.chatId ===
                                  hypaV3ExpandedChatMemo.summaryChatMemo
                              );

                        if (targetMessage) {
                          const displayRole =
                            targetMessage.role === "char"
                              ? char.name
                              : targetMessage.role;
                          return `${displayRole}:\n${targetMessage.data}`;
                        }

                        return "Message not found";
                      })()}
                    </div>
                  </div>
                {/if}
              </div>
            </div>
          </div>
        {/each}
        {#if DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].hypaV3Data.summaries.length === 0}
          <span class="text-textcolor2 text-center p-4">No summaries yet</span>
        {/if}
      </div>
    </div>
  </div>
</div>
