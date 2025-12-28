<script lang="ts">
  import {
    type SerializableHypaV3Data,
    getCurrentHypaV3Preset,
  } from "src/ts/process/memory/hypav3";
  import { type Message } from "src/ts/storage/database.svelte";
  import { DBState, selectedCharID } from "src/ts/stores.svelte";
  import { language } from "src/lang";
  import { getFirstMessage, processRegexScript } from "./utils";

  interface Props {
    hypaV3Data: SerializableHypaV3Data;
  }

  let { hypaV3Data }: Props = $props();

  async function getNextSummarizationTarget(): Promise<Message | null> {
    const char = DBState.db.characters[$selectedCharID];
    const chat = char.chats[DBState.db.characters[$selectedCharID].chatPage];
    const shouldProcess = getCurrentHypaV3Preset().settings.processRegexScript;

    // Summaries exist
    if (hypaV3Data.summaries.length > 0) {
      const lastSummary = hypaV3Data.summaries.at(-1);
      const lastMessageIndex = chat.message.findIndex(
        (m) => m.chatId === lastSummary.chatMemos.at(-1)
      );

      if (lastMessageIndex !== -1) {
        const next = chat.message[lastMessageIndex + 1] ?? null;

        return next && shouldProcess
          ? await processRegexScript(next, lastMessageIndex + 1)
          : next;
      }
    }

    // When no summaries exist OR couldn't find last connected message,
    // check if first message is available
    const firstMessage = getFirstMessage();

    if (!firstMessage) {
      const next = chat.message[0] ?? null;

      return next && shouldProcess ? await processRegexScript(next, 0) : next;
    }

    // Will summarize first message
    const next: Message = { role: "char", chatId: "first", data: firstMessage };

    return shouldProcess ? await processRegexScript(next) : next;
  }
</script>

<!-- Next Summarization Target -->
<div class="mt-2 sm:mt-4">
  {#await getNextSummarizationTarget() then nextMessage}
    {#if nextMessage}
      {@const chatId =
        nextMessage.chatId === "first"
          ? language.hypaV3Modal.nextSummarizationFirstMessageLabel
          : nextMessage.chatId == null
            ? language.hypaV3Modal.nextSummarizationNoMessageIdLabel
            : nextMessage.chatId}
      <div class="mb-2 text-sm sm:mb-4 text-zinc-400">
        {language.hypaV3Modal.nextSummarizationLabel.replace("{0}", chatId)}
      </div>

      <textarea
        class="w-full p-2 overflow-y-auto transition-colors border rounded-sm resize-none sm:p-4 min-h-40 sm:min-h-56 border-zinc-700 focus:outline-hidden text-zinc-200 bg-zinc-900"
        readonly
        value={nextMessage.data}
      ></textarea>
    {:else}
      <span class="text-sm text-red-400"
        >{language.hypaV3Modal.nextSummarizationNoMessagesFoundLabel}</span
      >
    {/if}
  {:catch error}
    <span class="text-sm text-red-400"
      >{language.hypaV3Modal.nextSummarizationLoadingError.replace(
        "{0}",
        error.message
      )}</span
    >
  {/await}
</div>

<div class="mt-2 sm:mt-4">
  <div class="mb-2 text-sm sm:mb-4 text-zinc-400">
    {language.hypaV3Modal.summarizationConditionLabel}
  </div>

  <!-- No First Message -->
  {#if !getFirstMessage()}
    <span class="text-sm text-red-400"
      >{language.hypaV3Modal.emptySelectedFirstMessageLabel}</span
    >
  {/if}
</div>
