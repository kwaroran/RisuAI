<script lang="ts">
    import {
    CharEmotion,
    DynamicGUI,
    botMakerMode,
    selectedCharID,
    settingsOpen,
    sideBarClosing,
    sideBarStore,
    OpenRealmStore,
    PlaygroundStore,

    QuickSettings,

    additionalHamburgerMenu


  } from "../../ts/stores.svelte";
    import { setDatabase, type folder } from "../../ts/storage/database.svelte";
    import { DBState } from 'src/ts/stores.svelte';
    import BarIcon from "./BarIcon.svelte";
    import SidebarIndicator from "./SidebarIndicator.svelte";
    import {
    ShellIcon,
    Settings,
    ListIcon,
    LayoutGridIcon,
    FolderIcon,
    FolderOpenIcon,
    HomeIcon,
    WrenchIcon,
    User2Icon,
  } from "@lucide/svelte";
    import {
  addCharacter,
    changeChar,
    getCharImage,
  } from "../../ts/characters";
    import CharConfig from "./CharConfig.svelte";
    import { language } from "../../lang";
    import isEqual from "lodash/isEqual";
    import SidebarAvatar from "./SidebarAvatar.svelte";
    import BaseRoundedButton from "../UI/BaseRoundedButton.svelte";
    import { getCharacterIndexObject, selectSingleFile } from "src/ts/util";
    import { v4 } from "uuid";
    import { checkCharOrder, getFileSrc, saveAsset } from "src/ts/globalApi.svelte";
    import { alertInput, alertSelect } from "src/ts/alert";
    import SideChatList from "./SideChatList.svelte";
    import { ConnectionIsHost, ConnectionOpenStore, RoomIdStore } from "src/ts/sync/multiuser";
  import { sideBarSize } from "src/ts/gui/guisize";
  import DevTool from "./DevTool.svelte";
    import QuickSettingsGui from "../Others/QuickSettingsGUI.svelte";
    import PluginDefinedIcon from "../Others/PluginDefinedIcon.svelte";
    import { RISU_SIDEBAR_DRAG_TYPE } from "src/ts/dragTypes";
  let sideBarMode = $state(0);
  let editMode = $state(false);
  let menuMode = $state(0);
  let devTool = $state(false)

  function reseter() {
    menuMode = 0;
    sideBarMode = 0;
    editMode = false;
    settingsOpen.set(false);
    CharEmotion.set({});
  }

  type sortTypeNormal = { type:'normal',img: string, index: number, name:string }
  type sortType =  sortTypeNormal|{type:'folder',folder:sortTypeNormal[],id:string, name:string, color:string, img?:string}
  let charImages: sortType[] = $state([]);
  let IconRounded = $state(false)
  let openFolders:string[] = $state([])
  let currentDrag: DragData | null = $state(null)
  interface Props {
    openGrid?: any;
    hidden?: boolean;
  }

  let { openGrid = () => {}, hidden = false }: Props = $props();

  sideBarClosing.set(false)

  $effect(() => {
    let newCharImages: sortType[] = [];
    const idObject = getCharacterIndexObject()
    for (const id of DBState.db.characterOrder) {
      if(typeof(id) === 'string'){
        const index = idObject[id] ?? -1
        if(index !== -1){
          const cha = DBState.db.characters[index]
          newCharImages.push({
            img:cha.image ?? "",
            index:index,
            type: "normal",
            name: cha.name
          });
        }
      }
      else{
        const folder = id
        let folderCharImages: sortTypeNormal[] = []
        for(const id of folder.data){
          const index = idObject[id] ?? -1
          if(index !== -1){
            const cha = DBState.db.characters[index]
            folderCharImages.push({
              img:cha.image ?? "",
              index:index,
              type: "normal",
              name: cha.name
            });
          }
        }
        newCharImages.push({
          folder: folderCharImages,
          type: "folder",
          id: folder.id,
          name: folder.name,
          color: folder.color,
          img: folder.imgFile,
        });
      }
    }
    if (!isEqual(charImages, newCharImages)) {
      charImages = newCharImages;
    }
    if(IconRounded !== DBState.db.roundIcons){
      IconRounded = DBState.db.roundIcons
    }
  })


  const inserter = (mainIndex:DragData, targetIndex:DragData) => {
    if(mainIndex.index === targetIndex.index && mainIndex.folder === targetIndex.folder){
      return
    }
    let db = DBState.db
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
        movingFolder = $state.snapshot(da)
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

    DBState.db.characterOrder = db.characterOrder
    checkCharOrder()
  }

  function getFolderIndex(id:string){
    for(let i=0;i<DBState.db.characterOrder.length;i++){
      const data = DBState.db.characterOrder[i]
      if(typeof(data) !== 'string' && data.id === id){
        return i
      }
    }
    return -1
  }

  function scrollToActiveCharacter() {
    const selectedId = $selectedCharID
    if (selectedId === -1) return
    
    const characterId = DBState.db.characters[selectedId]?.chaId
    if (!characterId) return
    
    let targetFolderId: string | null = null
    
    for (const item of charImages) {
      if (item.type === 'folder') {
        const foundChar = item.folder.find(c => 
          DBState.db.characters[c.index]?.chaId === characterId
        )
        if (foundChar) {
          targetFolderId = item.id
          break
        }
      }
    }
    
    if (targetFolderId && !openFolders.includes(targetFolderId)) {
      openFolders.push(targetFolderId)
      openFolders = openFolders
    }
    
    setTimeout(() => {
      const activeElement = document.querySelector(`[data-char-id="${characterId}"]`)
      if (activeElement) {
        activeElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        })
      }
    }, 100)
  }

  $effect(() => {
    if (typeof window === 'undefined') return
    
    const handler = () => {
      scrollToActiveCharacter()
    }
    
    window.addEventListener('scrollToActiveCharacter', handler)
    
    return () => {
      window.removeEventListener('scrollToActiveCharacter', handler)
    }
  })


  const createFolder = (mainIndex:DragData, targetIndex:DragData) => {
    if(mainIndex.index === targetIndex.index && mainIndex.folder === targetIndex.folder){
      return
    }
    let db = DBState.db
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

    DBState.db.characterOrder = db.characterOrder
    checkCharOrder()
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
    e.dataTransfer.setData(RISU_SIDEBAR_DRAG_TYPE, 'true');
    currentDrag = ind
    const avatar = e.currentTarget.querySelector('.avatar')
    if(avatar){
      e.dataTransfer.setDragImage(avatar, 10, 10);
    }
  }

  const clearCurrentDrag = () => {
    currentDrag = null
  }

  $effect(() => {
    if (typeof window === 'undefined') return

    window.addEventListener('dragend', clearCurrentDrag)
    window.addEventListener('drop', clearCurrentDrag)
    window.addEventListener('blur', clearCurrentDrag)

    return () => {
      window.removeEventListener('dragend', clearCurrentDrag)
      window.removeEventListener('drop', clearCurrentDrag)
      window.removeEventListener('blur', clearCurrentDrag)
    }
  })

  const getCurrentSidebarDrag = (e:DragEvent) => {
    if(!currentDrag || !e.dataTransfer?.types.includes(RISU_SIDEBAR_DRAG_TYPE)){
      return null
    }
    return currentDrag
  }

  const avatarDragOver = (e:DragEv) => {
    if(!getCurrentSidebarDrag(e)){
      return
    }
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
  }

  const avatarDrop = (ind:DragData, e:DragEv) => {
    const drag = getCurrentSidebarDrag(e)
    if(!drag){
      return
    }
    e.preventDefault()
    e.stopPropagation()
    try {
      createFolder(drag,ind)
    } catch (error) {
      console.error('avatarDrop error:', error)
    } finally {
      clearCurrentDrag()
    }
  }

  const preventAll = (e:DragEvent) => {
    if(!getCurrentSidebarDrag(e)){
      return
    }
    e.preventDefault()
    e.stopPropagation()
    return false
  }
</script>
<div
  class="sidebar-layout-slot h-full shrink-0 overflow-hidden"
  class:sidebar-edit-mode={editMode}
  class:dynamic-sidebar-slot={$DynamicGUI}
  class:risu-sidebar-slot={!$sideBarClosing}
  class:risu-sidebar-slot-close={$sideBarClosing}
  class:hidden={hidden}
  onanimationend={(event) => {
    if (event.currentTarget !== event.target || !$sideBarClosing) {
      return;
    }
    $sideBarClosing = false;
    sideBarStore.set(false);
  }}
>
<div
  class="sidebar-motion-panel h-full flex shrink-0"
  class:dynamic-sidebar-panel={$DynamicGUI}
>
{#if DBState.db.menuSideBar}
<div
  class="h-full w-20 min-w-20 flex-col items-center bg-bgcolor text-textcolor shadow-lg relative rs-sidebar"
  class:editMode
  class:flex={!hidden}
>
<button
  class="flex items-center justify-center py-2 flex-col gap-1 w-full mt-4"
  class:text-textcolor2={!(
    $selectedCharID < 0 &&
    $PlaygroundStore === 0 &&
    !$settingsOpen
  )}
  onclick={() => {
    reseter();
    selectedCharID.set(-1)
    PlaygroundStore.set(0)
    OpenRealmStore.set(false)
  }}
>
  <HomeIcon />
  <span class="text-xs">{language.home}</span>
</button>
<button
  class="flex items-center justify-center py-2 flex-col gap-1 w-full"
  class:text-textcolor2={!$settingsOpen}
  onclick={() => {
    if ($settingsOpen) {
      reseter();
      settingsOpen.set(false);
    } else {
      reseter();
      settingsOpen.set(true);
    }
  }}
>
  <Settings />
  <span class="text-xs">{language.settings}</span>
</button>
<button
  class="flex items-center justify-center py-2 flex-col gap-1 w-full"
  class:text-textcolor2={!(
    $selectedCharID >= 0
  )}
  onclick={() => {
    reseter();
    openGrid();

  }}
>
  <User2Icon />
  <span class="text-xs">{language.character}</span>
</button>
<button
  class="flex items-center justify-center py-2 flex-col gap-1 w-full"
  class:text-textcolor2={!(
    $selectedCharID < 0 &&
    $PlaygroundStore !== 0
  )}
  onclick={() => {
    reseter();
    selectedCharID.set(-1)
    PlaygroundStore.set(1)
  }}
>
  <ShellIcon />
  <span class="text-xs">{language.playground.playground}</span>
</button>
</div>
{:else}
<div
  class="h-full w-20 min-w-20 flex-col items-center bg-bgcolor text-textcolor shadow-lg relative rs-sidebar"
  class:editMode
  class:flex={!hidden}
>
  {#if !DBState.db.hamburgerButtonBottom}
  <button
    class="flex h-8 min-h-8 w-14 min-w-14 cursor-pointer text-white mt-2 items-center justify-center rounded-md bg-textcolor2 transition-colors hover:bg-blue-500"
    onclick={() => {
      menuMode = 1 - menuMode;
    }}><ListIcon />
  </button>
  <div class="mt-2 border-b border-b-selected w-full relative text-white ">
    {#if menuMode === 1}
      <div class="absolute w-20 min-w-20 flex border-b-selected border-b bg-bgcolor flex-col items-center pt-2 rounded-b-md z-20 pb-2">
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
          PlaygroundStore.set(0)
          OpenRealmStore.set(false)
        }}><HomeIcon /></BarIcon>
      <div class="mt-2"></div>
      <BarIcon
        onClick={() => {
          reseter()
          if($selectedCharID === -1 && $PlaygroundStore !== 0){
            PlaygroundStore.set(0)
            return
          }
          selectedCharID.set(-1)
          PlaygroundStore.set(1)
        }}
      ><ShellIcon /></BarIcon>
      {#each additionalHamburgerMenu as menu}
        <div class="mt-2"></div>
        <BarIcon
          onClick={() => {
            reseter();
            menu.callback();
          }}>
            <PluginDefinedIcon ico={menu} />
          </BarIcon
        >
      {/each}
      <div class="mt-2"></div>
      <BarIcon
        onClick={() => {
          reseter();
          openGrid();
        }}><LayoutGridIcon /></BarIcon
      >
    </div>
    {/if}
  </div>
  {/if}
  <div class="flex grow w-full flex-col items-center overflow-x-hidden overflow-y-auto pr-0">
    <div class="h-4 min-h-4 w-14" role="listitem" ondragover={(e) => {
      if(!getCurrentSidebarDrag(e)){ return }
      e.preventDefault()
      e.stopPropagation()
      e.dataTransfer.dropEffect = 'move'
      e.currentTarget.classList.add('bg-green-500')
    }} ondragleave={(e) => {
      e.currentTarget.classList.remove('bg-green-500')
    }} ondrop={(e) => {
      const drag = getCurrentSidebarDrag(e)
      if(!drag){ return }
      e.preventDefault()
      e.stopPropagation()
      e.currentTarget.classList.remove('bg-green-500')
      try {
        inserter(drag,{index:0})
      } finally {
        clearCurrentDrag()
      }
    }} ondragenter={preventAll}></div>
    {#each charImages as char, ind}
      <div class="group relative flex items-center px-2"
        role="listitem"
        draggable="true"
        ondragstart={(e) => {avatarDragStart({index:ind}, e)}}
        ondragend={clearCurrentDrag}
        ondragover={avatarDragOver}
        ondrop={(e) => {avatarDrop({index:ind}, e)}}
        ondragenter={preventAll}
      >
        <SidebarIndicator
          isActive={char.type === 'normal' && $selectedCharID === char.index && sideBarMode !== 1}
        />
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <div
            role="button" tabindex="0"
            onclick={() => {
              if(char.type === "normal"){
                changeChar(char.index, {reseter});
              }
            }}
            onkeydown={(e) => {
              if (e.key === "Enter") {
                if(char.type === "normal"){
                  changeChar(char.index, {reseter});
                }
              }
            }}
          >
          {#if char.type === 'normal'}
            <SidebarAvatar 
              src={char.img ? getCharImage(char.img, "plain") : "/none.webp"} 
              size="56" 
              rounded={IconRounded} 
              name={char.name}
              chaId={DBState.db.characters[char.index]?.chaId}
            />
          {:else if char.type === "folder"}
            {#key char.color}
            {#key char.name}
              <SidebarAvatar src="slot" size="56" rounded={IconRounded} bordered name={char.name} color={char.color} backgroundimg={char.img ? getCharImage(char.img, "plain") : ""}
              oncontextmenu={async (e) => {
                e.preventDefault()
                const sel = parseInt(await alertSelect([language.renameFolder,language.changeFolderColor,language.changeFolderImage,language.cancel]))
                if(sel === 0){
                  const v = await alertInput(language.changeFolderName, [], char.name)
                  const db = DBState.db
                  if(v){
                    const oder = db.characterOrder[ind]
                    if(typeof(oder) === 'string'){
                      return
                    }
                    oder.name = v
                    db.characterOrder[ind] = oder
                  }
                }
                else if(sel === 1){
                  const colors = ["red","green","blue","yellow","indigo","purple","pink","default"]
                  const sel = parseInt(await alertSelect(colors))
                  const db = DBState.db
                  const oder = db.characterOrder[ind]
                  if(typeof(oder) === 'string'){
                    return
                  }
                  oder.color = colors[sel].toLocaleLowerCase()
                  db.characterOrder[ind] = oder
                }
                else if(sel === 2) {
                  const sel = parseInt(await alertSelect(['Reset to Default Image', 'Select Image File']))
                  const db = DBState.db
                  const oder = db.characterOrder[ind]
                  if(typeof(oder) === 'string'){
                    return
                  }

                  switch (sel) {
                    case 0:
                      oder.imgFile = null
                      oder.img = ''
                      break;
                  
                    case 1:
                      const folderImage = await selectSingleFile([
                        'png',
                        'jpg',
                        'webp',
                      ])

                      if(!folderImage) {
                        return
                      }

                      const folderImageData = await saveAsset(folderImage.data)

                      oder.imgFile = folderImageData
                      oder.img = await getFileSrc(folderImageData)
                      db.characterOrder[ind] = oder
                      break;
                  }
                }
              }}
              onClick={() => {
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
                {#if DBState.db.showFolderName}
                  <div class="h-full w-full flex justify-center items-center">
                    <span class="hyphens-auto truncate font-bold">{char.name}</span>
                  </div>
                {:else if openFolders.includes(char.id)}
                  <FolderOpenIcon />
                {:else}
                  <FolderIcon />
                {/if}
              </SidebarAvatar>
            {/key}
            {/key}
          {/if}
        </div>
      </div>
      {#if char.type === 'folder' && openFolders.includes(char.id)}
        {#key char.color}
        <div class="p-1 flex flex-col items-center py-1 mt-1 rounded-lg relative">
          <div class="absolute top-0 left-1 border border-selected w-full h-full rounded-lg z-0 {
            char.color === 'red' ? 'bg-red-700/20' :
            char.color === 'yellow' ? 'bg-yellow-700/20' :
            char.color === 'green' ? 'bg-green-700/20' :
            char.color === 'blue' ? 'bg-blue-700/20' :
            char.color === 'indigo' ? 'bg-indigo-700/20' :
            char.color === 'purple' ? 'bg-purple-700/20' :
            char.color === 'pink' ? 'bg-pink-700/20' :
            'bg-darkbg/20'
          }"></div>
          <div class="h-4 min-h-4 w-14 relative z-10" role="listitem" ondragover={(e) => {
            if(!getCurrentSidebarDrag(e)){ return }
            e.preventDefault()
            e.stopPropagation()
            e.dataTransfer.dropEffect = 'move'
            e.currentTarget.classList.add('bg-green-500')
          }} ondragleave={(e) => {
            e.currentTarget.classList.remove('bg-green-500')
          }} ondrop={(e) => {
            const drag = getCurrentSidebarDrag(e)
            if(!drag){ return }
            e.preventDefault()
            e.stopPropagation()
            e.currentTarget.classList.remove('bg-green-500')
            try {
              if(char.type === 'folder'){
                inserter(drag,{index:0,folder:char.id})
              }
            } finally {
              clearCurrentDrag()
            }
          }} ondragenter={preventAll}></div>
          {#each char.folder as char2, ind}
              <div class="group relative flex items-center px-2 z-10"
              role="listitem"
              draggable="true"
              ondragstart={(e) => {if(char.type === 'folder'){avatarDragStart({index: ind, folder:char.id}, e)}}}
              ondragend={clearCurrentDrag}
              ondragover={avatarDragOver}
              ondrop={(e) => {if(char.type === 'folder'){avatarDrop({index: ind, folder:char.id}, e)}}}
              ondragenter={preventAll}
            >
              <SidebarIndicator
                isActive={$selectedCharID === char2.index && sideBarMode !== 1}
              />
              <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
              <div
                  role="button" tabindex="0"
                  onclick={() => {
                    if(char2.type === "normal"){
                      changeChar(char2.index, {reseter});
                    }
                  }}
                  onkeydown={(e) => {
                    if (e.key === "Enter") {
                      if(char2.type === "normal"){
                        changeChar(char2.index, {reseter});
                      }
                    }
                  }}
                >
                <SidebarAvatar 
                  src={char2.img ? getCharImage(char2.img, "plain") : "/none.webp"} 
                  size="56" 
                  rounded={IconRounded} 
                  name={char2.name}
                  chaId={DBState.db.characters[char2.index]?.chaId}
                />
              </div>
            </div>
            <div class="h-4 min-h-4 w-14 relative z-20" role="listitem" ondragover={(e) => {
              if(!getCurrentSidebarDrag(e)){ return }
              e.preventDefault()
              e.stopPropagation()
              e.dataTransfer.dropEffect = 'move'
              e.currentTarget.classList.add('bg-green-500')
            }} ondragleave={(e) => {
              e.currentTarget.classList.remove('bg-green-500')
            }} ondrop={(e) => {
              const drag = getCurrentSidebarDrag(e)
              if(!drag){ return }
              e.preventDefault()
              e.stopPropagation()
              e.currentTarget.classList.remove('bg-green-500')
              try {
                if(char.type === 'folder'){
                  inserter(drag,{index:ind+1,folder:char.id})
                }
              } finally {
                clearCurrentDrag()
              }
            }} ondragenter={preventAll}></div>
          {/each}
        </div>
        {/key}
      {/if}
      <div class="h-4 min-h-4 w-14" role="listitem" ondragover={((e) => {
        if(!getCurrentSidebarDrag(e)){ return }
        e.preventDefault()
        e.stopPropagation()
        e.dataTransfer.dropEffect = 'move'
        e.currentTarget.classList.add('bg-green-500')
      })} ondragleave={(e) => {
        e.currentTarget.classList.remove('bg-green-500')
      }} ondrop={(e) => {
        const drag = getCurrentSidebarDrag(e)
        if(!drag){ return }
        e.preventDefault()
        e.stopPropagation()
        e.currentTarget.classList.remove('bg-green-500')
        try {
          inserter(drag,{index:ind+1})
        } finally {
          clearCurrentDrag()
        }
      }} ondragenter={preventAll}></div>
    {/each}
    <div class="flex flex-col items-center gap-2 px-2">
      <BaseRoundedButton
        onClick={async () => {
          addCharacter({reseter}) 
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
  </div>
  {#if DBState.db.hamburgerButtonBottom}
  <div class="border-t border-t-selected w-full relative text-white ">
    {#if menuMode === 1}
      <div class="absolute bottom-full w-20 min-w-20 flex border-t-selected border-t bg-bgcolor flex-col items-center pt-2 rounded-t-md z-20 pb-2">
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
          PlaygroundStore.set(0)
          OpenRealmStore.set(false)
        }}><HomeIcon /></BarIcon>
      <div class="mt-2"></div>
      <BarIcon
        onClick={() => {
          reseter()
          if($selectedCharID === -1 && $PlaygroundStore !== 0){
            PlaygroundStore.set(0)
            return
          }
          selectedCharID.set(-1)
          PlaygroundStore.set(1)
        }}
      ><ShellIcon /></BarIcon>
      {#each additionalHamburgerMenu as menu}
        <div class="mt-2"></div>
        <BarIcon
          onClick={() => {
            reseter();
            menu.callback();
          }}>
            <PluginDefinedIcon ico={menu} />
          </BarIcon
        >
      {/each}
      <div class="mt-2"></div>
      <BarIcon
        onClick={() => {
          reseter();
          openGrid();
        }}><LayoutGridIcon /></BarIcon
      >
    </div>
    {/if}
  </div>
  <button
    class="flex h-8 min-h-8 w-14 min-w-14 cursor-pointer text-white mb-2 mt-2 items-center justify-center rounded-md bg-textcolor2 transition-colors hover:bg-blue-500"
    onclick={() => {
      menuMode = 1 - menuMode;
    }}><ListIcon />
  </button>
  {/if}
</div>
{/if}
<div
  class="setting-area h-full flex-col overflow-y-auto overflow-x-hidden bg-darkbg py-6 text-textcolor max-h-full"
  class:w-96={$sideBarSize === 0}
  class:w-110={$sideBarSize === 1}
  class:w-124={$sideBarSize === 2}
  class:w-138={$sideBarSize === 3}
  class:min-w-96={!$DynamicGUI && $sideBarSize === 0}
  class:min-w-110={!$DynamicGUI && $sideBarSize === 1}
  class:min-w-124={!$DynamicGUI && $sideBarSize === 2}
  class:min-w-138={!$DynamicGUI && $sideBarSize === 3}
  class:px-2={$DynamicGUI}
  class:px-4={!$DynamicGUI}
  class:hidden={hidden}
  class:flex={!hidden}
>
  <button
    class="flex w-full justify-end text-textcolor"
    onclick={async () => {
      if($sideBarClosing){
        return
      }
      $sideBarClosing = true;
    }}
  >
    <!-- <button class="border-none bg-transparent p-0 text-textcolor"><X /></button> -->
  </button>
  {#if sideBarMode === 0}
    {#if $selectedCharID < 0 || $settingsOpen}
      <div>
        <h1 class="text-xl">Welcome to RisuAI!</h1>
        <span class="text-xs text-textcolor2">Select a bot to start chatting</span>
      </div>
    {:else if DBState.db.characters[$selectedCharID]?.chaId === '§playground'}
      <SideChatList bind:chara={ DBState.db.characters[$selectedCharID]} />
    {:else if $ConnectionOpenStore}
      <div class="flex flex-col">
        <h1 class="text-xl">{language.connectionOpen}</h1>
        <span class="text-textcolor2 mb-4">{language.connectionOpenInfo}</span>
        <div class="flex">
          <span>ID: </span>
          <span class="text-blue-600">{$RoomIdStore}</span>
        </div>
        <div>
          {#if $ConnectionIsHost}
            <span class="text-emerald-600">{language.connectionHost}</span>
          {:else}
            <span class="text-gray-500">{language.connectionGuest}</span>
          {/if}
        </div>
      </div>
    {:else}
      <div class="w-full h-8 min-h-8 border-l border-b border-r border-selected relative bottom-6 rounded-b-md flex">
        <button onclick={() => {
          devTool = false
          botMakerMode.set(false)
        }} class="grow border-r border-r-selected rounded-bl-md" class:text-textcolor2={$botMakerMode || devTool}>{language.Chat}</button>
        <button onclick={() => {
          devTool = false
          botMakerMode.set(true)
        }} class="grow rounded-br-md" class:text-textcolor2={!$botMakerMode || devTool}>{language.character}</button>
        {#if DBState.db.enableDevTools}
          <button onclick={() => {
            devTool = true
          }} class="border-l border-l-selected rounded-br-md px-1" class:text-textcolor2={!devTool}>
            <WrenchIcon size={18} />
          </button>
        {/if}
      </div>
      {#if QuickSettings.open}
        <QuickSettingsGui />
      {:else if devTool}
        <DevTool />
      {:else if $botMakerMode}
        <CharConfig />
      {:else}
        <SideChatList bind:chara={ DBState.db.characters[$selectedCharID]} />
      {/if}
    {/if}
  {/if}
</div>
</div>
</div>

{#if $DynamicGUI}
    <div role="button" tabindex="0" class="sidebar-dismiss-area h-full" class:hidden={hidden} onclick={() => {
      if($sideBarClosing){
        return
      }
      $sideBarClosing = true;
    }}
      onkeydown={(e)=>{
        if(e.key === 'Enter'){
            e.currentTarget.click()
        }
      }}
      class:sidebar-dark-animation={!$sideBarClosing}
      class:sidebar-dark-close-animation={$sideBarClosing}>

    </div>

{/if}

<style>
  .editMode {
    min-width: 6rem;
  }
  .sidebar-layout-slot {
    --sidebar-rail-size: 5rem;
    --sidebar-natural-size: calc(var(--sidebar-size) + var(--sidebar-rail-size));
    --sidebar-total-size: var(--sidebar-natural-size);
    width: var(--sidebar-total-size);
    min-width: var(--sidebar-total-size);
  }

  .sidebar-motion-panel {
    width: var(--sidebar-total-size);
    min-width: var(--sidebar-total-size);
    transform: translateX(0);
  }

  .sidebar-layout-slot.sidebar-edit-mode {
    --sidebar-rail-size: 6rem;
  }

  .dynamic-sidebar-slot {
    --sidebar-dismiss-size: 3rem;
    --sidebar-total-size: min(
      var(--sidebar-natural-size),
      calc(100vw - var(--sidebar-dismiss-size))
    );
  }

  @keyframes sidebar-slot-open {
    from {
      width: 0;
      min-width: 0;
    }
    to {
      width: var(--sidebar-total-size);
      min-width: var(--sidebar-total-size);
    }
  }

  @keyframes sidebar-slot-close {
    from {
      width: var(--sidebar-total-size);
      min-width: var(--sidebar-total-size);
    }
    to {
      width: 0;
      min-width: 0;
    }
  }

  @keyframes sidebar-panel-open {
    from {
      transform: translateX(-100%);
    }
    to {
      transform: translateX(0);
    }
  }

  @keyframes sidebar-panel-close {
    from {
      transform: translateX(0);
    }
    to {
      transform: translateX(-100%);
    }
  }

  @keyframes sidebar-dim-open {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes sidebar-dim-close {
    from {
      opacity: 1;
    }
    45%,
    to {
      opacity: 0;
    }
  }

  .risu-sidebar-slot:not(.dynamic-sidebar-slot) {
    animation: sidebar-slot-open var(--risu-animation-speed) ease;
  }

  .risu-sidebar-slot:not(.dynamic-sidebar-slot) .sidebar-motion-panel {
    animation: sidebar-panel-open var(--risu-animation-speed) ease;
  }

  .risu-sidebar-slot-close:not(.dynamic-sidebar-slot) {
    animation: sidebar-slot-close var(--risu-animation-speed) ease forwards;
  }

  .risu-sidebar-slot-close:not(.dynamic-sidebar-slot) .sidebar-motion-panel {
    animation: sidebar-panel-close var(--risu-animation-speed) ease forwards;
  }

  .dynamic-sidebar-slot {
    position: absolute;
    inset: 0 auto 0 0;
    z-index: 1;
    overflow: hidden;
    transform: translateX(0);
  }

  .dynamic-sidebar-slot.risu-sidebar-slot {
    animation: sidebar-panel-open var(--risu-animation-speed) ease;
  }

  .dynamic-sidebar-slot.risu-sidebar-slot-close {
    animation: sidebar-panel-close var(--risu-animation-speed) ease forwards;
  }

  .sidebar-dismiss-area {
    position: absolute;
    inset: 0;
    z-index: 0;
    min-width: 0;
    background-color: rgba(0, 0, 0, 0.35);
    touch-action: manipulation;
    will-change: opacity;
  }

  .sidebar-dark-animation {
    animation: sidebar-dim-open var(--risu-animation-speed) ease;
    opacity: 1;
  }

  .sidebar-dark-close-animation {
    animation: sidebar-dim-close var(--risu-animation-speed) ease forwards;
    opacity: 0;
  }
</style>
