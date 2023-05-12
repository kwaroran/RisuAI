<script lang="ts">
  import { language } from "../../lang";
  import { tokenize } from "../../ts/tokenizer";
  import {
    DataBase,
    type Database,
    type character,
    type groupChat,
  } from "../../ts/database";
  import { selectedCharID } from "../../ts/stores";
  import {
    PlusIcon,
    SmileIcon,
    TrashIcon,
    UserIcon,
    ActivityIcon,
    BookIcon,
    LoaderIcon,
    User,
    DnaIcon,
    CurlyBracesIcon,
  } from "lucide-svelte";
  import Check from "../Others/Check.svelte";
  import {
    addCharEmotion,
    addingEmotion,
    getCharImage,
    rmCharEmotion,
    selectCharImg,
    makeGroupImage,
  } from "../../ts/characters";
  import LoreBook from "./LoreBookSetting.svelte";
  import { alertConfirm, alertError, alertSelectChar } from "../../ts/alert";
  import BarIcon from "./BarIcon.svelte";
  import { findCharacterbyId } from "../../ts/util";
  import { onDestroy } from "svelte";
  import { isEqual, cloneDeep } from "lodash";
  import Help from "../Others/Help.svelte";
  import RegexData from "./RegexData.svelte";
  import { exportChar } from "src/ts/characterCards";

  let subMenu = 0;
  let subberMenu = 0;
  let emos: [string, string][] = [];
  let tokens = {
    desc: 0,
    firstMsg: 0,
    localNote: 0,
    charaNote: 0,
  };

  let lasttokens = {
    desc: "",
    firstMsg: "",
    localNote: "",
    charaNote: "",
  };

  async function loadTokenize(chara) {
    console.log("tokenize");
    const cha = chara;
    if (cha.type !== "group") {
      if (lasttokens.desc !== cha.desc) {
        if (cha.desc) {
          lasttokens.desc = cha.desc;
          tokens.desc = await tokenize(cha.desc);
        }
      }
      if (lasttokens.firstMsg !== chara.firstMessage) {
        lasttokens.firstMsg = chara.firstMessage;
        tokens.firstMsg = await tokenize(chara.firstMessage);
      }
      if (lasttokens.charaNote !== chara.postHistoryInstructions) {
        lasttokens.charaNote = chara.postHistoryInstructions;
        tokens.charaNote = await tokenize(chara.postHistoryInstructions);
      }
    }
    if (
      lasttokens.localNote !==
      currentChar.data.chats[currentChar.data.chatPage].note
    ) {
      lasttokens.localNote =
        currentChar.data.chats[currentChar.data.chatPage].note;
      tokens.localNote = await tokenize(
        currentChar.data.chats[currentChar.data.chatPage].note
      );
    }
  }

  async function addGroupChar() {
    let group = currentChar.data;
    if (group.type === "group") {
      const res = await alertSelectChar();
      if (res) {
        if (group.characters.includes(res)) {
          alertError(language.errors.alreadyCharInGroup);
        } else {
          if (await alertConfirm(language.askLoadFirstMsg)) {
            group.chats[group.chatPage].message.push({
              role: "char",
              data: findCharacterbyId(res).firstMessage,
              saying: res,
            });
          }

          group.characters.push(res);
          currentChar.data = group;
        }
      }
    }
    currentChar = currentChar;
  }

  function rmCharFromGroup(index: number) {
    let group = currentChar.data;
    if (group.type === "group") {
      group.characters.splice(index, 1);
      currentChar.data = group;
    }
  }

  let database: Database;
  let currentChar:
    | {
        type: "character";
        data: character;
      }
    | {
        type: "group";
        data: groupChat;
      };

  const unsub = DataBase.subscribe((v) => {
    database = v;
    const cha = v.characters[$selectedCharID];
    if (!cha) {
      return;
    }
    if (!currentChar || !isEqual(currentChar.data, cha)) {
      if (cha.type === "character") {
        currentChar = {
          type: "character",
          data: cha,
        };
      } else {
        currentChar = {
          type: "group",
          data: cha,
        };
      }
    }
    emos = currentChar.data.emotionImages;
  });

  $: {
    if (database.characters[$selectedCharID].chaId === currentChar.data.chaId) {
      database.characters[$selectedCharID] = currentChar.data;
    } else {
      loadTokenize(currentChar.data);
    }
    emos = currentChar.data.emotionImages;
    DataBase.set(database);
    loadTokenize(currentChar.data);
  }

  onDestroy(unsub);
</script>

<div class="mb-2 flex gap-2">
  <button
    class={subMenu === 0 ? "text-gray-200 " : "text-gray-500"}
    on:click={() => {
      subMenu = 0;
    }}
  >
    <UserIcon />
  </button>
  <button
    class={subMenu === 1 ? "text-gray-200" : "text-gray-500"}
    on:click={() => {
      subMenu = 1;
    }}
  >
    <SmileIcon />
  </button>
  <button
    class={subMenu === 3 ? "text-gray-200" : "text-gray-500"}
    on:click={() => {
      subMenu = 3;
      subberMenu = 0;
    }}
  >
    <BookIcon />
  </button>
  {#if currentChar.type === "character"}
    <button
      class={subMenu === 4 ? "text-gray-200" : "text-gray-500"}
      on:click={() => {
        subMenu = 4;
      }}
    >
      <CurlyBracesIcon />
    </button>
  {/if}
  <button
    class={subMenu === 2 ? "text-gray-200" : "text-gray-500"}
    on:click={() => {
      subMenu = 2;
    }}
  >
    <ActivityIcon />
  </button>
</div>

{#if subMenu === 0}
  {#if currentChar.type !== "group"}
    <input
      class="input-text mb-4 mt-2 bg-transparent p-2 text-xl text-neutral-200 focus:bg-selected"
      placeholder="Character Name"
      bind:value={currentChar.data.name}
    />
    <span class="text-neutral-200"
      >{language.description} <Help key="charDesc" /></span
    >
    <textarea
      class="input-text mb-2 mt-2 h-20 resize-none bg-transparent text-xs text-gray-200 focus:bg-selected"
      autocomplete="off"
      bind:value={currentChar.data.desc}
    />
    <span class="mb-6 text-sm text-gray-400"
      >{tokens.desc} {language.tokens}</span
    >
    <span class="text-neutral-200"
      >{language.firstMessage} <Help key="charFirstMessage" /></span
    >
    <textarea
      class="input-text mb-2 mt-2 h-20 resize-none bg-transparent text-xs text-gray-200 focus:bg-selected"
      autocomplete="off"
      bind:value={currentChar.data.firstMessage}
    />
    <span class="mb-6 text-sm text-gray-400"
      >{tokens.firstMsg} {language.tokens}</span
    >
    <span class="text-neutral-200"
      >{language.authorNote} <Help key="charNote" /></span
    >
    <textarea
      class="input-text mb-2 mt-2 h-20 resize-none bg-transparent text-xs text-gray-200 focus:bg-selected"
      autocomplete="off"
      bind:value={currentChar.data.postHistoryInstructions}
    />
    <span class="mb-6 text-sm text-gray-400"
      >{tokens.charaNote} {language.tokens}</span
    >
  {:else}
    <input
      class="input-text mb-4 mt-2 bg-transparent p-2 text-xl text-neutral-200 focus:bg-selected"
      placeholder="Group Name"
      bind:value={currentChar.data.name}
    />
    <span class="text-neutral-200">{language.character}</span>
    <div class="flex gap-2 p-2">
      {#if currentChar.data.characters.length === 0}
        <span class="text-gray-500">No Character</span>
      {:else}
        {#each currentChar.data.characters as char, i}
          {#await getCharImage(findCharacterbyId(char).image, "css")}
            <BarIcon
              onClick={() => {
                rmCharFromGroup(i);
              }}
            >
              <User />
            </BarIcon>
          {:then im}
            <BarIcon
              onClick={() => {
                rmCharFromGroup(i);
              }}
              additionalStyle={im}
            />
          {/await}
        {/each}
      {/if}
    </div>
    <div class="mb-6 mt-1 flex text-gray-500">
      <button
        on:click={addGroupChar}
        class="cursor-pointer hover:text-neutral-200"
      >
        <PlusIcon />
      </button>
    </div>

    <span class="text-neutral-200"
      >{language.chatNotes} <Help key="charNote" /></span
    >
    <textarea
      class="input-text mb-2 mt-2 h-20 resize-none bg-transparent text-xs text-gray-200 focus:bg-selected"
      autocomplete="off"
      bind:value={currentChar.data.chats[currentChar.data.chatPage].note}
    />
    <span class="mb-6 text-sm text-gray-400"
      >{tokens.localNote} {language.tokens}</span
    >
  {/if}

  <div class="mt-6 flex items-center">
    <Check bind:check={$DataBase.jailbreakToggle} />
    <span class="ml-2 text-neutral-200">{language.jailbreakToggle}</span>
  </div>
{:else if subMenu === 1}
  <h2 class="mb-2 mt-2 text-2xl font-bold">{language.characterDisplay}</h2>
  <span class="mb-2 mt-2 text-neutral-200"
    >{currentChar.type !== "group"
      ? language.charIcon
      : language.groupIcon}</span
  >
  <button
    on:click={async () => {
      await selectCharImg($selectedCharID);
      currentChar = currentChar;
    }}
  >
    {#if currentChar.data.image === ""}
      <div
        class="h-32 w-32 cursor-pointer rounded-md bg-gray-500 shadow-lg hover:text-green-500"
      />
    {:else}
      {#await getCharImage(currentChar.data.image, "css")}
        <div
          class="h-32 w-32 cursor-pointer rounded-md bg-gray-500 shadow-lg hover:text-green-500"
        />
      {:then im}
        <div
          class="h-32 w-32 cursor-pointer rounded-md bg-gray-500 shadow-lg hover:text-green-500"
          style={im}
        />
      {/await}
    {/if}
  </button>

  {#if currentChar.type === "group"}
    <button
      on:click={makeGroupImage}
      class="ml-2 mr-2 mt-2 flex items-center justify-center border-1 border-solid border-borderc p-2 drop-shadow-lg hover:bg-selected"
    >
      {language.createGroupImg}
    </button>
  {/if}

  <span class="mb-2 mt-6 text-neutral-200">{language.viewScreen}</span>
  <!-- svelte-ignore empty-block -->

  {#if currentChar.type !== "group"}
    <select
      class="input-text mb-4 appearance-none bg-transparent text-gray-200"
      bind:value={currentChar.data.viewScreen}
    >
      <option value="none" class="appearance-none bg-darkbg"
        >{language.none}</option
      >
      <option value="emotion" class="appearance-none bg-darkbg"
        >{language.emotionImage}</option
      >
      <option value="imggen" class="appearance-none bg-darkbg"
        >{language.imageGeneration}</option
      >
    </select>
  {:else}
    <select
      class="input-text mb-4 appearance-none bg-transparent text-gray-200"
      bind:value={currentChar.data.viewScreen}
    >
      <option value="none" class="appearance-none bg-darkbg"
        >{language.none}</option
      >
      <option value="single" class="appearance-none bg-darkbg"
        >{language.singleView}</option
      >
      <option value="multiple" class="appearance-none bg-darkbg"
        >{language.SpacedView}</option
      >
      <option value="emp" class="appearance-none bg-darkbg"
        >{language.emphasizedView}</option
      >
    </select>
  {/if}

  {#if currentChar.data.viewScreen === "emotion"}
    <span class="mt-6 text-neutral-200"
      >{language.emotionImage} <Help key="emotion" /></span
    >
    <span class="text-xs text-gray-400">{language.emotionWarn}</span>

    <table class="contain tabler w-full max-w-full">
      <tr>
        <th class="w-1/3 font-medium">{language.image}</th>
        <th class="w-1/2 font-medium">{language.emotion}</th>
        <th class="font-medium" />
      </tr>
      {#if currentChar.data.emotionImages.length === 0}
        <tr>
          <div class="text-gray-500">{language.noImages}</div>
        </tr>
      {:else}
        {#each emos as emo, i}
          <tr>
            {#await getCharImage(emo[1], "plain")}
              <td class="w-1/3 truncate font-medium" />
            {:then im}
              <td class="w-1/3 truncate font-medium"
                ><img src={im} alt="img" class="w-full" /></td
              >
            {/await}
            <td class="w-1/2 truncate font-medium">
              <input
                class="input-text mb-4 mt-2 bg-transparent p-2 text-xl text-neutral-200 focus:bg-selected"
                bind:value={currentChar.data.emotionImages[i][0]}
              />
            </td>
            <button
              class="cursor-pointer font-medium hover:text-green-500"
              on:click={() => {
                rmCharEmotion($selectedCharID, i);
              }}><TrashIcon /></button
            >
          </tr>
        {/each}
      {/if}
    </table>

    <div class="mt-2 flex text-gray-500 hover:text-neutral-200">
      {#if !$addingEmotion}
        <button
          class="cursor-pointer hover:text-green-500"
          on:click={() => {
            addCharEmotion($selectedCharID);
          }}
        >
          <PlusIcon />
        </button>
      {:else}
        <span>Loading...</span>
      {/if}
    </div>
  {/if}
  {#if currentChar.data.viewScreen === "imggen"}
    <span class="mt-6 text-neutral-200"
      >{language.imageGeneration} <Help key="imggen" /></span
    >
    <span class="text-xs text-gray-400">{language.emotionWarn}</span>

    <table class="contain tabler w-full max-w-full">
      <tr>
        <th class="w-1/3 font-medium">{language.key}</th>
        <th class="w-1/2 font-medium">{language.value}</th>
        <th class="font-medium" />
      </tr>
      {#if currentChar.data.sdData.length === 0}
        <tr>
          <div class="text-gray-500">{language.noData}</div>
        </tr>
      {/if}
      {#each currentChar.data.sdData as emo, i}
        <tr>
          <td class="w-1/3 truncate font-medium">
            <input
              class="input-text mb-4 mt-2 bg-transparent p-2 text-sm text-neutral-200 focus:bg-selected"
              bind:value={currentChar.data.sdData[i][0]}
            />
          </td>
          <td class="w-1/2 truncate font-medium">
            <input
              class="input-text mb-4 mt-2 bg-transparent p-2 text-sm text-neutral-200 focus:bg-selected"
              bind:value={currentChar.data.sdData[i][1]}
            />
          </td>
          {#if !["always", "negative"].includes(currentChar.data.sdData[i][0])}
            <button
              class="flex h-full cursor-pointer items-center justify-center font-medium hover:text-green-500"
              on:click={() => {
                let db = $DataBase;
                let charId = $selectedCharID;
                let dbChar = db.characters[charId];
                if (dbChar.type !== "group") {
                  dbChar.sdData.splice(i, 1);
                  db.characters[charId] = dbChar;
                }
                $DataBase = db;
              }}><TrashIcon /></button
            >
          {:else}
            <td />
          {/if}
        </tr>
      {/each}
    </table>
    <div class="mt-2 flex text-gray-500 hover:text-neutral-200">
      {#if !$addingEmotion}
        <button
          class="cursor-pointer hover:text-green-500"
          on:click={() => {
            let db = $DataBase;
            let charId = $selectedCharID;
            let dbChar = db.characters[charId];
            if (dbChar.type !== "group") {
              dbChar.sdData.push(["", ""]);
              db.characters[charId] = dbChar;
            }
            $DataBase = db;
          }}
        >
          <PlusIcon />
        </button>
      {:else}
        <span>Loading...</span>
      {/if}
    </div>
    <span class="mt-6 text-neutral-200">{language.currentImageGeneration}</span>
    {#if currentChar.data.chats[currentChar.data.chatPage].sdData}
      <textarea
        class="input-text mb-2 mt-2 h-20 resize-none bg-transparent text-gray-200 focus:bg-selected"
        autocomplete="off"
        bind:value={currentChar.data.chats[currentChar.data.chatPage].sdData}
      />
    {:else}
      <span><div class="text-gray-500">{language.noData}</div></span>
    {/if}
  {/if}
{:else if subMenu === 3}
  <h2 class="mb-2 mt-2 text-2xl font-bold">
    {language.loreBook}
    <Help key="lorebook" />
  </h2>
  <LoreBook />
{:else if subMenu === 4}
  {#if currentChar.type === "character"}
    <h2 class="mb-2 mt-2 text-2xl font-bold">{language.scripts}</h2>

    <span class="mt-2 text-neutral-200">Bias <Help key="bias" /></span>
    <table class="contain tabler mt-2 w-full max-w-full">
      <tr>
        <th class="w-1/2 font-medium">Bias</th>
        <th class="w-1/3 font-medium">{language.value}</th>
        <th
          class="cursor-pointer font-medium hover:text-green-500"
          on:click={() => {
            if (currentChar.type === "character") {
              let bia = currentChar.data.bias;
              bia.push(["", 0]);
              currentChar.data.bias = bia;
            }
          }}><PlusIcon /></th
        >
      </tr>
      {#if currentChar.data.bias.length === 0}
        <tr>
          <div class="text-gray-500">{language.noBias}</div>
        </tr>
      {/if}
      {#each currentChar.data.bias as bias, i}
        <tr>
          <td class="w-1/2 truncate font-medium">
            <input
              class="input-text mb-4 mt-2 bg-transparent p-2 text-neutral-200 focus:bg-selected"
              bind:value={currentChar.data.bias[i][0]}
              placeholder="string"
            />
          </td>
          <td class="w-1/3 truncate font-medium">
            <input
              class="input-text mb-4 mt-2 w-full bg-transparent p-2 text-neutral-200 focus:bg-selected"
              bind:value={currentChar.data.bias[i][1]}
              type="number"
              max="100"
              min="-100"
            />
          </td>
          <button
            class="flex h-full cursor-pointer items-center justify-center font-medium hover:text-green-500"
            on:click={() => {
              if (currentChar.type === "character") {
                let bia = currentChar.data.bias;
                bia.splice(i, 1);
                currentChar.data.bias = bia;
              }
            }}><TrashIcon /></button
          >
        </tr>
      {/each}
    </table>

    <span class="mt-4 text-neutral-200"
      >{language.regexScript} <Help key="regexScript" /></span
    >
    <table
      class="contain tabler mt-2 flex w-full max-w-full flex-col gap-2 p-2"
    >
      {#if currentChar.data.customscript.length === 0}
        <div class="text-gray-500">No Scripts</div>
      {/if}
      {#each currentChar.data.customscript as customscript, i}
        <RegexData
          bind:value={currentChar.data.customscript[i]}
          onRemove={() => {
            if (currentChar.type === "character") {
              let customscript = currentChar.data.customscript;
              customscript.splice(i, 1);
              currentChar.data.customscript = customscript;
            }
          }}
        />
      {/each}
    </table>
    <button
      class="mb-2 cursor-pointer font-medium hover:text-green-500"
      on:click={() => {
        if (currentChar.type === "character") {
          let script = currentChar.data.customscript;
          script.push({
            comment: "",
            in: "",
            out: "",
            type: "editinput",
          });
          currentChar.data.customscript = script;
        }
      }}><PlusIcon /></button
    >
  {/if}
{:else if subMenu === 2}
  <h2 class="mb-2 mt-2 text-2xl font-bold">{language.advancedSettings}</h2>
  {#if currentChar.type !== "group"}
    <span class="text-neutral-200"
      >{language.exampleMessage} <Help key="exampleMessage" /></span
    >
    <textarea
      class="input-text mb-2 mt-2 h-20 resize-none bg-transparent text-xs text-gray-200 focus:bg-selected"
      autocomplete="off"
      bind:value={currentChar.data.exampleMessage}
    />

    <span class="text-neutral-200"
      >{language.creatorNotes} <Help key="creatorQuotes" /></span
    >
    <textarea
      class="input-text mb-2 mt-2 h-20 resize-none bg-transparent text-xs text-gray-200 focus:bg-selected"
      autocomplete="off"
      bind:value={currentChar.data.creatorNotes}
      on:input={() => {
        currentChar.data.removedQuotes = false;
      }}
    />

    <span class="text-neutral-200"
      >{language.systemPrompt} <Help key="systemPrompt" /></span
    >
    <textarea
      class="input-text mb-2 mt-2 h-20 resize-none bg-transparent text-xs text-gray-200 focus:bg-selected"
      autocomplete="off"
      bind:value={currentChar.data.systemPrompt}
    />

    <span class="text-neutral-200"
      >{language.chatNotes} <Help key="chatNote" /></span
    >
    <textarea
      class="input-text mb-2 mt-2 h-20 resize-none bg-transparent text-xs text-gray-200 focus:bg-selected"
      autocomplete="off"
      bind:value={currentChar.data.chats[currentChar.data.chatPage].note}
    />
    <span class="mb-6 text-sm text-gray-400"
      >{tokens.localNote} {language.tokens}</span
    >

    {#if $DataBase.showUnrecommended || currentChar.data.personality.length > 3}
      <span class="text-neutral-200"
        >{language.personality} <Help key="personality" unrecommended /></span
      >
      <textarea
        class="input-text mb-2 mt-2 h-20 resize-none bg-transparent text-xs text-gray-200 focus:bg-selected"
        autocomplete="off"
        bind:value={currentChar.data.personality}
      />
    {/if}
    {#if $DataBase.showUnrecommended || currentChar.data.scenario.length > 3}
      <span class="text-neutral-200"
        >{language.scenario} <Help key="scenario" unrecommended /></span
      >
      <textarea
        class="input-text mb-2 mt-2 h-20 resize-none bg-transparent text-xs text-gray-200 focus:bg-selected"
        autocomplete="off"
        bind:value={currentChar.data.scenario}
      />
    {/if}

    <span class="mt-2 text-neutral-200">{language.altGreet}</span>
    <table class="contain tabler mt-2 w-full max-w-full">
      <tr>
        <th class="font-medium">{language.value}</th>
        <th class="w-10 cursor-pointer font-medium">
          <button
            class="hover:text-green-500"
            on:click={() => {
              if (currentChar.type === "character") {
                let alternateGreetings = currentChar.data.alternateGreetings;
                alternateGreetings.push("");
                currentChar.data.alternateGreetings = alternateGreetings;
              }
            }}
          >
            <PlusIcon />
          </button>
        </th>
      </tr>
      {#if currentChar.data.alternateGreetings.length === 0}
        <tr>
          <div class="text-gray-500">No Messages</div>
        </tr>
      {/if}
      {#each currentChar.data.alternateGreetings as bias, i}
        <tr>
          <td class="truncate font-medium">
            <textarea
              class="input-text mb-4 mt-2 w-full resize-none bg-transparent p-2 text-neutral-200 focus:bg-selected"
              bind:value={currentChar.data.alternateGreetings[i]}
              placeholder="..."
            />
          </td>
          <th class="w-10 cursor-pointer font-medium">
            <button
              class="hover:text-green-500"
              on:click={() => {
                if (currentChar.type === "character") {
                  currentChar.data.firstMsgIndex = -1;
                  let alternateGreetings = currentChar.data.alternateGreetings;
                  alternateGreetings.splice(i, 1);
                  currentChar.data.alternateGreetings = alternateGreetings;
                }
              }}
            >
              <TrashIcon />
            </button>
          </th>
        </tr>
      {/each}
    </table>

    {#if $DataBase.showUnrecommended || currentChar.data.utilityBot}
      <div class="mt-4 flex items-center">
        <Check bind:check={currentChar.data.utilityBot} />
        <span
          >{language.utilityBot} <Help key="utilityBot" unrecommended /></span
        >
      </div>
    {/if}

    <button
      on:click={async () => {
        exportChar($selectedCharID);
      }}
      class="mt-6 cursor-pointer border-1 border-solid border-borderc bg-transparent p-4 text-lg text-neutral-200 transition-colors hover:bg-green-500"
      >{language.exportCharacter}</button
    >
  {:else}
    <div class="mb-2 flex items-center">
      <Check bind:check={currentChar.data.useCharacterLore} />
      <span class="ml-2 text-neutral-200"
        >{language.useCharLorebook} <Help key="experimental" /></span
      >
    </div>
  {/if}
  <button
    on:click={async () => {
      const conf = await alertConfirm(
        language.removeConfirm + currentChar.data.name
      );
      if (!conf) {
        return;
      }
      const conf2 = await alertConfirm(
        language.removeConfirm2 + currentChar.data.name
      );
      if (!conf2) {
        return;
      }
      let chars = $DataBase.characters;
      chars.splice($selectedCharID, 1);
      $selectedCharID = -1;
      $DataBase.characters = chars;
    }}
    class="mt-2 cursor-pointer border-1 border-solid border-borderc bg-transparent p-2 text-neutral-200 transition-colors hover:bg-draculared"
    >{currentChar.type === "group"
      ? language.removeGroup
      : language.removeCharacter}</button
  >
{/if}

<style>
  .contain {
    border: #6272a4 1px solid;
  }

  .tabler {
    table-layout: fixed;
  }

  .tabler td {
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
