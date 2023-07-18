<script lang="ts">
  import {
    CharEmotion,
    SizeStore,
    selectedCharID,
    settingsOpen,
    sideBarStore,
  } from "../../ts/stores";
  import { DataBase, setDatabase, type folder } from "../../ts/storage/database";
  import BarIcon from "./BarIcon.svelte";
  import SidebarIndicator from "./SidebarIndicator.svelte";
  import {
    X,
    Settings,
    ListIcon,
    LayoutGridIcon,
    FolderIcon,
    FolderOpenIcon,
    HomeIcon,
  } from "lucide-svelte";
  import {
    characterFormatUpdate,
    createNewCharacter,
    createNewGroup,
    getCharImage,
  } from "../../ts/characters";
  import { importCharacter } from "src/ts/characterCards";
  import CharConfig from "./CharConfig.svelte";
  import { language } from "../../lang";
  import Botpreset from "../Setting/botpreset.svelte";
  import { onDestroy } from "svelte";
  import { cloneDeep, isEqual } from "lodash";
  import SidebarAvatar from "./SidebarAvatar.svelte";
  import BaseRoundedButton from "../UI/BaseRoundedButton.svelte";
  import { get } from "svelte/store";
  import { findCharacterIndexbyId, findCharacterbyId, getCharacterIndexObject } from "src/ts/util";
  import { v4 } from "uuid";
  import { checkCharOrder } from "src/ts/storage/globalApi";
  import { doingChat } from "src/ts/process";
  import { BotCreator } from "src/ts/creator/creator";
  import Button from "../UI/GUI/Button.svelte";
  let openPresetList = false;
  let sideBarMode = 0;
  let editMode = false;
  let menuMode = 0;
  let dragable = navigator.maxTouchPoints <= 1
  export let openGrid = () => {};

  function createScratch() {
    reseter();
    createNewCharacter();
    let db = get(DataBase)
    if(db.characters[db.characters.length-1]){
        changeChar(db.characters.length-1)
    }
  }
  function createGroup() {
    reseter();
    createNewGroup();
    let db = get(DataBase)
    if(db.characters[db.characters.length-1]){
        changeChar(db.characters.length-1)
    }
  }
  async function createImport() {
    reseter();
    await importCharacter();
    let db = get(DataBase)
    if(db.characters[db.characters.length-1]){
        changeChar(db.characters.length-1)
    }
  }

  function changeChar(index: number) {
    if($doingChat){
      return
    }
    reseter();
    characterFormatUpdate(index);
    selectedCharID.set(index);
  }

  function reseter() {
    menuMode = 0;
    sideBarMode = 0;
    editMode = false;
    settingsOpen.set(false);
    CharEmotion.set({});
  }

  type sortTypeNormal = { type:'normal',img: string; index: number; }
  type sortType =  sortTypeNormal|{type:'folder',folder:sortTypeNormal[],id:string}
  let charImages: sortType[] = [];
  let IconRounded = false
  let openFolders:string[] = []
  let currentDrag: DragData = null

  const unsub = DataBase.subscribe((db) => {
    let newCharImages: sortType[] = [];
    const idObject = getCharacterIndexObject()
    for (const id of db.characterOrder) {
      if(typeof(id) === 'string'){
        const index = idObject[id] ?? -1
        if(index !== -1){
          const cha = db.characters[index]
          newCharImages.push({
            img:cha.image ?? "",
            index:index,
            type: "normal"
          });
        }
      }
      else{
        const folder = id
        let folderCharImages: sortTypeNormal[] = []
        for(const id of folder.data){
          const index = idObject[id] ?? -1
          if(index !== -1){
            const cha = db.characters[index]
            folderCharImages.push({
              img:cha.image ?? "",
              index:index,
              type: "normal"
            });
          }
        }
        newCharImages.push({
          folder: folderCharImages,
          type: "folder",
          id: folder.id
        });
      }
    }
    if (!isEqual(charImages, newCharImages)) {
      charImages = newCharImages;
    }
    if(IconRounded !== db.roundIcons){
      IconRounded = db.roundIcons
    }
  });

  const inserter = (mainIndex:DragData, targetIndex:DragData) => {
    if(mainIndex.index === targetIndex.index && mainIndex.folder === targetIndex.folder){
      return
    }
    let db = get(DataBase)
    let mainFolderIndex = mainIndex.folder ? getFolderIndex(mainIndex.folder) : null
    let targetFolderIndex = targetIndex.folder ? getFolderIndex(targetIndex.folder) : null
    let mainFolderId = mainIndex.folder ? (db.characterOrder[mainFolderIndex] as folder).id : ''
    let movingFolder:folder|false = false
    let mainId = ''
    if(mainIndex.folder){
      mainId = (db.characterOrder[mainFolderIndex] as folder).data[mainIndex.index]
    }
    else{
      const da = db.characterOrder[mainIndex.index]
      if(typeof(da) !== 'string'){
        mainId = da.id
        movingFolder = cloneDeep(da)
        if(targetIndex.folder){
          return
        }
      }
      else{
        mainId = da
      }
    }
    if(targetIndex.folder){
        const folder = db.characterOrder[targetFolderIndex] as folder
        folder.data.splice(targetIndex.index,0,mainId)
        db.characterOrder[targetFolderIndex] = folder
    }
    else if(movingFolder){
        db.characterOrder.splice(targetIndex.index,0,movingFolder)
    }
    else{
        db.characterOrder.splice(targetIndex.index,0,mainId)
    }
    if(mainIndex.folder){
      mainFolderIndex = -1
      for(let i=0;i<db.characterOrder.length;i++){
        const a =db.characterOrder[i]
        if(typeof(a) !== 'string'){
          if(a.id === mainFolderId){
            mainFolderIndex = i
            break
          }
        }
      }
      if(mainFolderIndex !== -1){
        const folder:folder = db.characterOrder[mainFolderIndex] as folder
        const ind = mainIndex.index > targetIndex.index ? folder.data.lastIndexOf(mainId) : folder.data.indexOf(mainId) 
        if(ind !== -1){
          folder.data.splice(ind, 1)
        }
        db.characterOrder[mainFolderIndex] = folder
      }
      else{
        console.log('folder not found')
      }
    }
    else if(movingFolder){
      let idList:string[] = []
      for(const ord of db.characterOrder){
        idList.push(typeof(ord) === 'string' ? ord : ord.id)
      }
      const ind = mainIndex.index > targetIndex.index ? idList.lastIndexOf(mainId) : idList.indexOf(mainId) 
      if(ind !== -1){
        db.characterOrder.splice(ind, 1)
      }
    }
    else{
      const ind = mainIndex.index > targetIndex.index ? db.characterOrder.lastIndexOf(mainId) : db.characterOrder.indexOf(mainId) 
      if(ind !== -1){
        db.characterOrder.splice(ind, 1)
      }
    }

    setDatabase(db)
    checkCharOrder()
  }

  function getFolderIndex(id:string){
    let db = get(DataBase)
    for(let i=0;i<db.characterOrder.length;i++){
      const data = db.characterOrder[i]
      if(typeof(data) !== 'string' && data.id === id){
        return i
      }
    }
    return -1
  }

  const createFolder = (mainIndex:DragData, targetIndex:DragData) => {
    if(mainIndex.index === targetIndex.index && mainIndex.folder === targetIndex.folder){
      return
    }
    let db = get(DataBase)
    let mainFolderIndex = mainIndex.folder ? getFolderIndex(mainIndex.folder) : null
    let mainFolder = db.characterOrder[mainFolderIndex] as folder
    if(targetIndex.folder){
      return
    }
    const main = mainIndex.folder ? mainFolder.data[mainIndex.index] : db.characterOrder[mainIndex.index]
    const target = db.characterOrder[targetIndex.index]
    if(typeof(main) !== 'string'){
      return
    }
    if(typeof (target) === 'string'){
      const newFolder:folder = {
        name: "New Folder",
        data: [main, target],
        color: "",
        id: v4()
      }
      db.characterOrder[targetIndex.index] = newFolder
      if(mainIndex.folder){
        mainFolder.data.splice(mainIndex.index, 1)
        db.characterOrder[mainFolderIndex] = mainFolder
      }
      else{
        db.characterOrder.splice(mainIndex.index, 1)
      }
    }
    else{
      target.data.push(main)
      if(mainIndex.folder){
        mainFolder.data.splice(mainIndex.index, 1)
        db.characterOrder[mainFolderIndex] = mainFolder
      }
      else{
        db.characterOrder.splice(mainIndex.index, 1)
      }
    }
    setDatabase(db)
  }

  type DragEv = DragEvent & {
    currentTarget: EventTarget & HTMLDivElement;
  }
  type DragData = {
    index:number,
    folder?:string
  }
  const avatarDragStart = (ind:DragData, e:DragEv) => {
    e.dataTransfer.setData('text/plain', '');
    currentDrag = ind
    const avatar = e.currentTarget.querySelector('.avatar')
    if(avatar){
      e.dataTransfer.setDragImage(avatar, 10, 10);
    }
  }

  const avatarDragOver = (e:DragEv) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const avatarDrop = (ind:DragData, e:DragEv) => {
    e.preventDefault()
    try {
      if(currentDrag){
        createFolder(currentDrag,ind)
      }
    } catch (error) {}
  }

  const preventAll = (e:Event) => {
    e.preventDefault()
    e.stopPropagation()
    return false
  }

  const preventIfPolyfilled = (e:Event) => {
    if(globalThis.polyfilledDragDrop){
      e.preventDefault()
      e.stopPropagation()
      return false
    }
  }

  onDestroy(unsub);
</script>

<div
  class="flex h-full w-20 min-w-20 flex-col items-center bg-bgcolor text-white shadow-lg"
  class:editMode
>
  <button
    class="flex h-8 w-14 min-w-14 cursor-pointer items-center justify-center rounded-b-md bg-gray-500 transition-colors hover:bg-green-500"
    on:click={() => {
      menuMode = 1 - menuMode;
    }}><ListIcon />
  </button>
  <div class="flex flex-grow w-full flex-col items-center overflow-x-hidden overflow-y-auto pr-0">
    <div class="h-4 min-h-4 w-14" on:dragover={(e) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      e.currentTarget.classList.add('bg-green-500')
    }} on:dragleave={(e) => {
      e.currentTarget.classList.remove('bg-green-500')
    }} on:drop={(e) => {
      e.preventDefault()
      e.currentTarget.classList.remove('bg-green-500')
      const da = currentDrag
      if(da){
        inserter(da,{index:0})
      }
    }} on:dragenter={preventAll} />
    {#if menuMode === 0}
      {#each charImages as char, ind}
        <div class="group relative flex items-center px-2"
          draggable="true"
          on:dragstart={(e) => {avatarDragStart({index:ind}, e)}}
          on:dragover={avatarDragOver}
          on:drop={(e) => {avatarDrop({index:ind}, e)}}
          on:dragenter={preventAll}
          on:contextmenu={preventIfPolyfilled}
        >
          <SidebarIndicator
            isActive={char.type === 'normal' && $selectedCharID === char.index && sideBarMode !== 1}
          />
          <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
          <div
              on:click={() => {
                if(char.type === "normal"){
                  changeChar(char.index);
                }
              }}
              on:keydown={(e) => {
                if (e.key === "Enter") {
                  if(char.type === "normal"){
                    changeChar(char.index);
                  }
                }
              }}
              tabindex="0"
            >
            {#if char.type === 'normal'}
              <SidebarAvatar src={char.img ? getCharImage(char.img, "plain") : "/none.webp"} size="56" rounded={IconRounded} />
            {:else if char.type === "folder"}
              <SidebarAvatar src="slot" size="56" rounded={IconRounded} onClick={() => {
                if(char.type !== 'folder'){
                  return
                }
                if(openFolders.includes(char.id)){
                  openFolders.splice(openFolders.indexOf(char.id), 1)
                }
                else{
                  openFolders.push(char.id)
                }
                openFolders = openFolders
              }}>
                {#if openFolders.includes(char.id)}
                  <FolderOpenIcon />
                {:else}
                  <FolderIcon />
                {/if}
              </SidebarAvatar>
            {/if}
          </div>
        </div>
        {#if char.type === 'folder' && openFolders.includes(char.id)}
          <div class="w-full flex flex-col items-center py-1 mt-1 rounded-lg relative">
            <div class="absolute top-0 left-1 bg-darkbg w-full h-full rounded-lg z-0"></div>
            <div class="h-4 min-h-4 w-14 relative z-10" on:dragover={(e) => {
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
              e.currentTarget.classList.add('bg-green-500')
            }} on:dragleave={(e) => {
              e.currentTarget.classList.remove('bg-green-500')
            }} on:drop={(e) => {
              e.preventDefault()
              e.currentTarget.classList.remove('bg-green-500')
              const da = currentDrag
              if(da && char.type === 'folder'){
                inserter(da,{index:0,folder:char.id})
              }
            }} on:dragenter={preventAll}/>
            {#each char.folder as char2, ind}
                <div class="group relative flex items-center px-2 z-10"
                draggable="true"
                on:dragstart={(e) => {if(char.type === 'folder'){avatarDragStart({index: ind, folder:char.id}, e)}}}
                on:dragover={avatarDragOver}
                on:drop={(e) => {if(char.type === 'folder'){avatarDrop({index: ind, folder:char.id}, e)}}}
                on:dragenter={preventAll}
                on:contextmenu={preventIfPolyfilled}
              >
                <SidebarIndicator
                  isActive={$selectedCharID === char2.index && sideBarMode !== 1}
                />
                <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                <div
                    on:click={() => {
                      if(char2.type === "normal"){
                        changeChar(char2.index);
                      }
                    }}
                    on:keydown={(e) => {
                      if (e.key === "Enter") {
                        if(char2.type === "normal"){
                          changeChar(char2.index);
                        }
                      }
                    }}
                    tabindex="0"
                  >
                  <SidebarAvatar src={char2.img ? getCharImage(char2.img, "plain") : "/none.webp"} size="56" rounded={IconRounded} />
                </div>
              </div>
              <div class="h-4 min-h-4 w-14 relative z-20" on:dragover={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                e.currentTarget.classList.add('bg-green-500')
              }} on:dragleave={(e) => {
                e.currentTarget.classList.remove('bg-green-500')
              }} on:drop={(e) => {
                e.preventDefault()
                e.currentTarget.classList.remove('bg-green-500')
                const da = currentDrag
                if(da && char.type === 'folder'){
                  inserter(da,{index:ind+1,folder:char.id})
                }
              }} on:dragenter={preventAll}/>
            {/each}
          </div>
        {/if}
        <div class="h-4 min-h-4 w-14" on:dragover|preventDefault={(e) => {
          e.dataTransfer.dropEffect = 'move'
          e.currentTarget.classList.add('bg-green-500')
        }} on:dragleave={(e) => {
          e.currentTarget.classList.remove('bg-green-500')
        }} on:drop={(e) => {
          e.preventDefault()
          e.currentTarget.classList.remove('bg-green-500')
          const da = currentDrag
          if(da){
            inserter(da,{index:ind+1})
          }
        }} on:dragenter={preventAll} />
      {/each}
      <div class="flex flex-col items-center space-y-2 px-2">
        <BaseRoundedButton
          onClick={() => {
            if (sideBarMode === 1) {
              reseter();
              sideBarMode = 0;
            } else {
              reseter();
              sideBarMode = 1;
            }
          }}
          ><svg viewBox="0 0 24 24" width="1.2em" height="1.2em"
            ><path
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            /></svg
          ></BaseRoundedButton
        >
      </div>
    {:else}
      <BarIcon
        onClick={() => {
          if ($settingsOpen) {
            reseter();
            settingsOpen.set(false);
          } else {
            reseter();
            settingsOpen.set(true);
          }
        }}><Settings /></BarIcon
      >
      <div class="mt-2"></div>
      <BarIcon
        onClick={() => {
          reseter();
          selectedCharID.set(-1)
        }}><HomeIcon /></BarIcon>
      <div class="mt-2"></div>
      <BarIcon
        onClick={() => {
          reseter();
          openGrid();
        }}><LayoutGridIcon /></BarIcon
      >
    {/if}
  </div>
</div>
<div
  class="setting-area flex w-96 flex-col overflow-y-auto overflow-x-hidden bg-darkbg p-6 text-gray-200"
  class:flex-grow={$SizeStore.w <= 1028}
  class:minw96={$SizeStore.w > 1028}
>
  <button
    class="flex w-full justify-end text-gray-200"
    on:click={() => {
      sideBarStore.set(false);
    }}
  >
    <button class="border-none bg-transparent p-0 text-gray-200"><X /></button>
  </button>
  {#if sideBarMode === 0}
    {#if $selectedCharID < 0 || $settingsOpen}
      <div>
        <h1 class="text-xl">Welcome to RisuAI!</h1>
        <span class="text-xs text-gray-400">Select a bot to start chating</span>
      </div>
    {:else}
      <CharConfig />
    {/if}
  {:else if sideBarMode === 1}
    <Button
      onClick={createScratch}
      className="mt-2"
    >
      {language.createfromScratch}
    </Button>
    <Button
      onClick={createImport}
      className="mt-2"
    >
      {language.importCharacter}
    </Button>
    <Button
      onClick={createGroup}
      className="mt-2"
    >
      {language.createGroup}
    </Button>
    <Button
      onClick={BotCreator.createBotFromWeb}
      className="mt-2"
    >
      {language.createBotInternet}
    </Button>
  {/if}
</div>

{#if openPresetList}
  <Botpreset
    close={() => {
      openPresetList = false;
    }}
  />
{/if}

<style>
  .minw96 {
    min-width: 24rem; /* 384px */
  }
  .editMode {
    min-width: 6rem;
  }
</style>
