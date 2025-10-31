<script lang="ts">
    import { language } from "src/lang";
    import BaseRoundedButton from "src/lib/UI/BaseRoundedButton.svelte";
    import Button from "src/lib/UI/GUI/Button.svelte";
    import Check from "src/lib/UI/GUI/CheckInput.svelte";
    import TextAreaInput from "src/lib/UI/GUI/TextAreaInput.svelte";
    import TextInput from "src/lib/UI/GUI/TextInput.svelte";
    import { alertConfirm, alertSelect } from "src/ts/alert";
    import { getCharImage } from "src/ts/characters";
    import { changeUserPersona, exportUserPersona, importUserPersona, saveUserPersona, selectUserImg } from "src/ts/persona";
    import { saveImage } from "src/ts/storage/database.svelte";
    import { selectSingleFile } from "src/ts/util";
    import { DBState } from 'src/ts/stores.svelte';
    import { getPersonaIndexObject } from "src/ts/util";
    import { checkPersonaOrder } from "src/ts/globalApi.svelte";
    import { v4 } from "uuid"
    import { isEqual } from "lodash";

    // Drag & Drop zone ratios
    const DROP_ZONE_LEFT_THRESHOLD = 0.25  // 좌측 25%: 왼쪽에 삽입
    const DROP_ZONE_RIGHT_THRESHOLD = 0.75 // 우측 25%: 오른쪽에 삽입
    // 중간 50%: 폴더 생성

    // Folder popover constants
    const POPOVER_PADDING = 16
    const POPOVER_ESTIMATED_HEIGHT = 200
    const POPOVER_MAX_WIDTH = 448

    // DB에 저장되는 폴더 타입
    type FolderData = {
        name: string
        data: string[]  // 페르소나 ID 배열
        id: string
        img?: string
    }

    // 화면 표시용 타입
    type PersonaItem = { type:'normal', icon: string, index: number, name:string }
    type FolderItem = { type:'folder', folder:PersonaItem[], id:string, name:string, icon?:string }
    type PersonaGridItem = PersonaItem | FolderItem
    let personaImages: PersonaGridItem[] = $state([])
    let deduplicationInitialized = $state(false)  // 초기화 플래그

    // 타입 가드
    function isFolder(item: string | FolderData): item is FolderData {
        return typeof item !== 'string'
    }

    // 중복 페르소나 제거 함수 (변경사항이 있을 때만 업데이트)
    function deduplicatePersonaOrder() {
        const db = DBState.db
        const seenIds = new Set<string>()
        const newOrder: (string | FolderData)[] = []
        let hasChanges = false

        for (const item of db.personaOrder) {
            if (typeof item === 'string') {
                // 페르소나 ID
                if (!seenIds.has(item)) {
                    seenIds.add(item)
                    newOrder.push(item)
                } else {
                    hasChanges = true  // 중복 발견!
                }
            } else {
                // 폴더
                const folder = item
                const deduplicatedData: string[] = []
                for (const personaId of folder.data) {
                    if (!seenIds.has(personaId)) {
                        seenIds.add(personaId)
                        deduplicatedData.push(personaId)
                    } else {
                        hasChanges = true  // 중복 발견!
                    }
                }

                // 폴더에 최소 1개 이상의 페르소나가 있어야 함
                if (deduplicatedData.length > 0) {
                    if (deduplicatedData.length !== folder.data.length) {
                        hasChanges = true  // 폴더 내용 변경됨
                    }
                    newOrder.push({
                        ...folder,
                        data: deduplicatedData
                    })
                } else {
                    hasChanges = true  // 빈 폴더 제거됨
                }
            }
        }

        // 변경사항이 있을 때만 업데이트 (무한루프 방지)
        if (hasChanges) {
            db.personaOrder = newOrder
        }
    }

    type DragData = {
        index:number,
        folder?:string
    }
    type DragEv = DragEvent & {
        currentTarget: EventTarget & HTMLDivElement;
    }
    let currentDrag: DragData = $state(null)
    let dragHoverIndex: number = $state(-1)
    let dragHoverZone: 'left' | 'center' | 'right' | null = $state(null)
    let selectedItem: {type: 'persona', index: number} | {type: 'folder', id: string} | null = $state({type: 'persona', index: DBState.db.selectedPersona})
    let openFolderPopover: {id: string, left: number, y: number, above?: boolean} | null = $state(null)
    let popoverElement: HTMLDivElement | null = $state(null)

    const getDropZone = (relativeX: number): 'left' | 'center' | 'right' => {
        if(relativeX < DROP_ZONE_LEFT_THRESHOLD) return 'left'
        if(relativeX > DROP_ZONE_RIGHT_THRESHOLD) return 'right'
        return 'center'
    }

    const getDragBoxShadow = (ind: number) => {
        if (dragHoverIndex !== ind) return undefined
        if (dragHoverZone === 'left') return 'inset 4px 0 0 0 rgb(34 197 94)'
        if (dragHoverZone === 'right') return 'inset -4px 0 0 0 rgb(34 197 94)'
        if (dragHoverZone === 'center') return 'inset 0 0 0 4px rgb(59 130 246)'
        return undefined
    }

    const handlePersonaClick = (personaIndex: number) => {
        selectedItem = {type: 'persona', index: personaIndex}
        openFolderPopover = null
        changeUserPersona(personaIndex)
    }

    const handleFolderClick = (folderId: string, target: HTMLElement) => {
        selectedItem = {type: 'folder', id: folderId}
        const rect = target.getBoundingClientRect()
        const spaceBelow = window.innerHeight - rect.bottom
        const estimatedPopoverWidth = Math.min(POPOVER_MAX_WIDTH, window.innerWidth - 32)

        let left = rect.left + rect.width / 2 - estimatedPopoverWidth / 2
        const maxLeft = Math.max(POPOVER_PADDING, window.innerWidth - estimatedPopoverWidth - POPOVER_PADDING)
        left = Math.max(POPOVER_PADDING, Math.min(left, maxLeft))

        openFolderPopover = {
            id: folderId,
            left: left,
            y: spaceBelow > POPOVER_ESTIMATED_HEIGHT ? rect.bottom + 8 : rect.top - 8,
            above: spaceBelow <= POPOVER_ESTIMATED_HEIGHT
        }
    }

    const personaDragStart = (ind:DragData, e:DragEv) => {
        e.dataTransfer.setData('text/plain', '');
        currentDrag = ind
        const avatar = e.currentTarget.querySelector('[role="button"]')
        if(avatar){
            e.dataTransfer.setDragImage(avatar, 10, 10);
        }
    }

    const personaDragOver = (ind:DragData, e:DragEv) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'

        const rect = e.currentTarget.getBoundingClientRect()
        const mouseX = e.clientX - rect.left
        const relativeX = mouseX / rect.width

        dragHoverIndex = ind.index
        dragHoverZone = getDropZone(relativeX)
    }

    const personaDragLeave = () => {
        dragHoverIndex = -1
        dragHoverZone = null
    }

    const personaDrop = (ind:DragData, e:DragEv) => {
        e.preventDefault()
        e.stopPropagation() // 이벤트가 containerDrop으로 전파되지 않게 함
        dragHoverIndex = -1
        dragHoverZone = null
        try {
            if(currentDrag){
                const rect = e.currentTarget.getBoundingClientRect()
                const mouseX = e.clientX - rect.left
                const relativeX = mouseX / rect.width
                const zone = getDropZone(relativeX)

                if(zone === 'left'){
                    // 좌측: 왼쪽에 삽입
                    inserter(currentDrag, {index: ind.index})
                }
                else if(zone === 'right'){
                    // 우측: 오른쪽에 삽입
                    inserter(currentDrag, {index: ind.index + 1})
                }
                else{
                    // 중간: 폴더 생성 또는 폴더에 추가
                    // 드롭 대상이 폴더이고, 드래그한 아이템이 같은 폴더에서 온 경우 무시
                    const targetPersona = personaImages[ind.index]
                    if (targetPersona.type === 'folder' && currentDrag.folder === targetPersona.id) {
                        // 같은 폴더로 돌아가는 경우 - 아무것도 안함
                        return
                    }
                    createFolder(currentDrag, {index: ind.index})
                }
            }
        } catch (error) {}
    }

    const preventAll = (e:Event) => {
        e.preventDefault()
        e.stopPropagation()
        return false
    }

    function getFolderIndex(id:string){
        for(let i=0;i<DBState.db.personaOrder.length;i++){
            const data = DBState.db.personaOrder[i]
            if(isFolder(data) && data.id === id){
                return i
            }
        }
        return -1
    }

    // 드래그 데이터에서 실제 페르소나 ID 또는 폴더 객체 가져오기
    function getItemFromDrag(dragData: DragData): string | FolderData {
        const db = DBState.db
        if (dragData.folder) {
            // 폴더 내부의 아이템
            const folderIndex = getFolderIndex(dragData.folder)
            const folder = db.personaOrder[folderIndex]
            if (isFolder(folder)) {
                return folder.data[dragData.index]
            }
            return '' // 폴더를 찾지 못한 경우
        } else {
            // 메인 그리드의 아이템
            return db.personaOrder[dragData.index]
        }
    }

    // 원래 위치에서 아이템 제거
    function removeItemFromSource(dragData: DragData, itemId: string) {
        const db = DBState.db
        if (dragData.folder) {
            // 폴더에서 제거
            const folderIndex = getFolderIndex(dragData.folder)
            if (folderIndex !== -1) {
                const folderItem = db.personaOrder[folderIndex]
                if (isFolder(folderItem)) {
                    // 깊은 복사: 배열도 새로 생성
                    const folder: FolderData = {
                        ...folderItem,
                        data: [...folderItem.data]  // 배열 복사
                    }
                    const itemIndex = folder.data.indexOf(itemId)
                    if (itemIndex !== -1) {
                        folder.data.splice(itemIndex, 1)

                        // 폴더가 비어있으면 폴더 자체를 제거
                        if (folder.data.length === 0) {
                            db.personaOrder.splice(folderIndex, 1)
                        } else {
                            db.personaOrder[folderIndex] = folder
                        }
                    }
                }
            }
        } else {
            // 메인 그리드에서 제거
            const item = db.personaOrder[dragData.index]
            const searchId = typeof item === 'string' ? item : item.id
            const itemIndex = db.personaOrder.findIndex(ord =>
                typeof ord === 'string' ? ord === searchId : ord.id === searchId
            )
            if (itemIndex !== -1) {
                db.personaOrder.splice(itemIndex, 1)
            }
        }
    }

    const createFolder = (mainIndex:DragData, targetIndex:DragData) => {
        if(mainIndex.index === targetIndex.index && mainIndex.folder === targetIndex.folder){
            return
        }
        if(targetIndex.folder){
            return // 폴더 내부에는 폴더를 만들 수 없음
        }

        const db = DBState.db
        const mainItem = getItemFromDrag(mainIndex)
        const targetItem = db.personaOrder[targetIndex.index]

        if(typeof(mainItem) !== 'string'){
            return // 폴더는 폴더와 합칠 수 없음
        }

        // 먼저 원래 위치에서 제거
        removeItemFromSource(mainIndex, mainItem)

        // 제거 후 targetIndex를 다시 찾아야 함 (인덱스가 변경될 수 있음)
        const newTargetItem = db.personaOrder.find(item => {
            if (typeof targetItem === 'string') {
                return item === targetItem
            } else {
                return isFolder(item) && item.id === targetItem.id
            }
        })

        if (!newTargetItem) {
            // 대상을 찾을 수 없으면 취소
            return
        }

        const newTargetIndex = db.personaOrder.indexOf(newTargetItem)

        if(typeof(newTargetItem) === 'string'){
            // 두 개의 페르소나를 합쳐서 새 폴더 생성
            const newFolder: FolderData = {
                name: "New Folder",
                data: [mainItem, newTargetItem],
                id: v4()
            }
            db.personaOrder[newTargetIndex] = newFolder
        } else if (isFolder(newTargetItem)) {
            // 페르소나를 기존 폴더에 추가 (깊은 복사)
            const updatedFolder: FolderData = {
                ...newTargetItem,
                data: [...newTargetItem.data, mainItem]  // 배열도 복사
            }
            db.personaOrder[newTargetIndex] = updatedFolder
        }

        DBState.db.personaOrder = db.personaOrder
        deduplicatePersonaOrder() // 중복 제거
        checkPersonaOrder()
    }

    const inserter = (mainIndex:DragData, targetIndex:DragData) => {
        if(mainIndex.index === targetIndex.index && mainIndex.folder === targetIndex.folder){
            return
        }

        const db = DBState.db
        const mainItem = getItemFromDrag(mainIndex)

        // 폴더를 폴더 안으로 이동할 수 없음
        if(typeof(mainItem) !== 'string' && targetIndex.folder){
            return
        }

        const mainId = typeof(mainItem) === 'string' ? mainItem : mainItem.id

        // 인덱스 조정: 제거 후 삽입 위치가 변경되는지 계산
        let adjustedTargetIndex = targetIndex.index

        // 같은 레벨(메인 그리드)에서 이동하는 경우
        if (!mainIndex.folder && !targetIndex.folder) {
            // 원본이 대상보다 앞에 있으면, 제거 후 인덱스가 1 감소
            if (mainIndex.index < targetIndex.index) {
                adjustedTargetIndex = targetIndex.index - 1
            }
        }

        // 먼저 원래 위치에서 제거
        removeItemFromSource(mainIndex, mainId)

        // 목표 위치에 삽입
        if(targetIndex.folder){
            // 폴더 내부로 삽입
            const folderIndex = getFolderIndex(targetIndex.folder)
            const folderItem = db.personaOrder[folderIndex]
            if (isFolder(folderItem)) {
                const folder: FolderData = {
                    ...folderItem,
                    data: [...folderItem.data]  // 배열 복사
                }
                folder.data.splice(adjustedTargetIndex, 0, mainId)
                db.personaOrder[folderIndex] = folder
            }
        } else {
            // 메인 그리드로 삽입
            if(isFolder(mainItem)){
                // 폴더를 이동하는 경우
                const clonedFolder = safeStructuredClone($state.snapshot(mainItem))
                db.personaOrder.splice(adjustedTargetIndex, 0, clonedFolder)
            } else {
                // 페르소나를 이동하는 경우
                db.personaOrder.splice(adjustedTargetIndex, 0, mainId)
            }
        }

        DBState.db.personaOrder = db.personaOrder
        deduplicatePersonaOrder() // 중복 제거
        checkPersonaOrder()
    }

    // 폴더 업데이트 헬퍼 함수
    function updateFolder(folderId: string, updates: (folder: FolderData) => void) {
        const folderIndex = getFolderIndex(folderId)
        if (folderIndex === -1) return

        const folderItem = DBState.db.personaOrder[folderIndex]
        if (!isFolder(folderItem)) return

        // 폴더 객체를 깊은 복사해서 새로 만들어야 reactivity가 작동함
        const folder: FolderData = {
            ...folderItem,
            data: [...folderItem.data]  // 배열도 복사
        }
        updates(folder)
        DBState.db.personaOrder[folderIndex] = folder
        DBState.db.personaOrder = [...DBState.db.personaOrder]
    }

    // 폴더 이미지 선택 함수
    async function selectFolderImg(folderId: string) {
        const selected = await selectSingleFile(['png'])
        if (!selected) return

        const img = selected.data
        const imgp = await saveImage(img)

        updateFolder(folderId, (folder) => {
            folder.img = imgp
        })
    }

    // 폴더 삭제 함수 (페르소나들은 바깥으로)
    async function deleteFolder(folderId: string) {
        const folderIndex = getFolderIndex(folderId)
        if (folderIndex === -1) return

        const folderItem = DBState.db.personaOrder[folderIndex]
        if (!isFolder(folderItem)) return

        const d = await alertConfirm(`Delete folder "${folderItem.name}"? Personas inside will be moved out.`)
        if (!d) return

        // 폴더 안의 페르소나들을 폴더 위치에 삽입
        const personasInFolder = folderItem.data
        DBState.db.personaOrder.splice(folderIndex, 1, ...personasInFolder)

        selectedItem = null
        openFolderPopover = null
    }

    // 폴더 이름 업데이트 함수
    function updateFolderName(folderId: string, newName: string) {
        updateFolder(folderId, (folder) => {
            folder.name = newName
        })
    }

    // 그리드 컨테이너에 드롭 (빈 공간에 드롭 시 맨 끝에 추가)
    const containerDrop = (e: DragEvent) => {
        e.preventDefault()
        dragHoverIndex = -1
        dragHoverZone = null

        // 폴더에서 드래그한 페르소나만 처리 (빈 공간에 드롭)
        if (currentDrag && currentDrag.folder) {
            // 같은 폴더에서 나와서 빈 공간에 드롭한 경우도 맨 끝으로 가야 함 (폴더에서 빠져나옴)
            // 맨 끝에 추가
            inserter(currentDrag, {index: personaImages.length})
        }
    }

    const containerDragOver = (e: DragEvent) => {
        // 폴더에서 드래그한 경우만 허용
        if (currentDrag && currentDrag.folder) {
            e.preventDefault()
            e.dataTransfer!.dropEffect = 'move'
        }
    }

    // 컴포넌트 초기화 시 중복 제거 (한 번만 실행)
    $effect(() => {
        if (!deduplicationInitialized) {
            deduplicatePersonaOrder()
            deduplicationInitialized = true
        }
    })

    // 팝오버 위치 재조정 (실제 렌더링된 너비 기준)
    $effect(() => {
        if (!openFolderPopover) {
            popoverElement = null
            return
        }

        if (popoverElement && openFolderPopover) {
            const rect = popoverElement.getBoundingClientRect()
            const actualWidth = rect.width

            // 팝오버를 연 폴더의 위치를 찾아야 함
            const folderData = personaImages.find(p => p.type === 'folder' && p.id === openFolderPopover.id)
            if (folderData) {
                const folderIndex = personaImages.indexOf(folderData)
                const folderElements = document.querySelectorAll('[role="listitem"]')
                const folderElement = folderElements[folderIndex] as HTMLElement
                if (folderElement) {
                    const folderRect = folderElement.getBoundingClientRect()

                    // 폴더 중심에서 팝오버 절반만큼 왼쪽으로
                    let left = folderRect.left + folderRect.width / 2 - actualWidth / 2

                    // 화면 경계 체크
                    const maxLeft = window.innerWidth - actualWidth - POPOVER_PADDING
                    left = Math.max(POPOVER_PADDING, Math.min(left, maxLeft))

                    // 위치가 달라졌으면 업데이트
                    if (Math.abs(left - openFolderPopover.left) > 1) {
                        openFolderPopover = {
                            ...openFolderPopover,
                            left: left
                        }
                    }
                }
            }
        }
    })

    $effect(() => {
        let newPersonaImages: PersonaGridItem[] = [];
        const idObject = getPersonaIndexObject()
        for (const id of DBState.db.personaOrder) {
          if(typeof(id) === 'string'){
            const index = idObject[id] ?? -1
            if(index !== -1){
              const persona = DBState.db.personas[index]
              newPersonaImages.push({
                icon:persona.icon ?? "",
                index:index,
                type: "normal",
                name: persona.name
              });
            }
          }
          else{
            const folder = id
            let folderPersonaImages: PersonaItem[] = []
            for(const id of folder.data){
              const index = idObject[id] ?? -1
              if(index !== -1){
                const persona = DBState.db.personas[index]
                folderPersonaImages.push({
                  icon:persona.icon ?? "",
                  index:index,
                  type: "normal",
                  name: persona.name
                });
              }
            }
            newPersonaImages.push({
              folder: folderPersonaImages,
              type: "folder",
              id: folder.id,
              name: folder.name,
              icon: folder.img,
            });
          }
        }
        if (!isEqual(personaImages, newPersonaImages)) {
          personaImages = newPersonaImages;
        }
    })
</script>
<h2 class="mb-2 text-2xl font-bold mt-2">{language.persona}</h2>

<div class="p-4 rounded-md border-darkborderc border mb-2 flex-wrap flex gap-2 w-full max-w-full min-w-0"
    ondragover={containerDragOver}
    ondrop={containerDrop}>
    {#each personaImages as persona, ind}
        <!-- Persona container with drag -->
        <div role="listitem"
            class="relative cursor-grab active:cursor-grabbing select-none"
            draggable="true"
            ondragstart={(e) => {personaDragStart({index:ind}, e)}}
            ondragover={(e) => {personaDragOver({index:ind}, e)}}
            ondrop={(e) => {personaDrop({index:ind}, e)}}
            ondragenter={preventAll}
            ondragleave={personaDragLeave}
        >
            {#if persona.type === 'normal'}
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div role="button" tabindex="0"
                    onclick={() => handlePersonaClick(persona.index)}
                    onkeydown={(e) => {
                        if (e.key === "Enter") {
                            handlePersonaClick(persona.index)
                        }
                    }}>
                    {#if persona.icon === ''}
                        <div class="rounded-md h-20 w-20 shadow-lg bg-textcolor2 cursor-pointer hover:text-green-500"
                            class:ring={selectedItem?.type === 'persona' && selectedItem.index === persona.index}
                            style:box-shadow={getDragBoxShadow(ind)}></div>
                    {:else}
                        {#await getCharImage(persona.icon, 'css')}
                            <div class="rounded-md h-20 w-20 shadow-lg bg-textcolor2 cursor-pointer hover:text-green-500"
                                class:ring={selectedItem?.type === 'persona' && selectedItem.index === persona.index}
                                style:box-shadow={getDragBoxShadow(ind)}></div>
                        {:then im}
                            <div class="rounded-md h-20 w-20 shadow-lg bg-textcolor2 cursor-pointer hover:text-green-500" style={im}
                                class:ring={selectedItem?.type === 'persona' && selectedItem.index === persona.index}
                                style:box-shadow={getDragBoxShadow(ind)}></div>
                        {/await}
                    {/if}
                </div>
            {:else if persona.type === 'folder'}
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div role="button" tabindex="0"
                    onclick={(e) => handleFolderClick(persona.id, e.currentTarget)}
                    onkeydown={(e) => {
                        if (e.key === "Enter") {
                            handleFolderClick(persona.id, e.currentTarget)
                        }
                    }}>
                    {#if !persona.icon}
                        <div class="rounded-md h-20 w-20 shadow-lg bg-textcolor2 cursor-pointer hover:text-green-500 flex items-center justify-center"
                            class:ring={selectedItem?.type === 'folder' && selectedItem.id === persona.id}
                            style:box-shadow={getDragBoxShadow(ind)}>
                            <svg viewBox="0 0 24 24" width="2em" height="2em">
                                <path fill="currentColor" d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
                            </svg>
                        </div>
                    {:else}
                        {#await getCharImage(persona.icon, 'css')}
                            <div class="rounded-md h-20 w-20 shadow-lg bg-textcolor2 cursor-pointer hover:text-green-500"
                                class:ring={selectedItem?.type === 'folder' && selectedItem.id === persona.id}
                                style:box-shadow={getDragBoxShadow(ind)}></div>
                        {:then im}
                            <div class="rounded-md h-20 w-20 shadow-lg bg-textcolor2 cursor-pointer hover:text-green-500 object-cover object-top" style={im}
                                class:ring={selectedItem?.type === 'folder' && selectedItem.id === persona.id}
                                style:box-shadow={getDragBoxShadow(ind)}></div>
                        {/await}
                    {/if}
                </div>
            {/if}
        </div>
    {/each}
    <div class="flex justify-center items-center ml-2 mr-2">
        <BaseRoundedButton
            onClick={async () => {
                const sel = parseInt(await alertSelect([language.createfromScratch, language.importCharacter]))
                if(sel === 0){
                    const newId = v4()
                    DBState.db.personas.push({
                        name: 'New Persona',
                        icon: '',
                        personaPrompt: '',
                        note: '',
                        id: newId
                    })
                    DBState.db.personaOrder.push(newId)
                    changeUserPersona(DBState.db.personas.length - 1)
                } else if(sel === 1){
                    await importUserPersona()
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
            >
        </BaseRoundedButton>
    </div>
</div>

<!-- Folder Popover -->
{#if openFolderPopover}
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div class="fixed inset-0 z-40 pointer-events-none"></div>
    {@const folderData = personaImages.find(p => p.type === 'folder' && p.id === openFolderPopover.id)}
    {#if folderData && folderData.type === 'folder'}
        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
        <div class="fixed inset-0 z-40" onclick={(e) => {
            if(e.target === e.currentTarget) {
                openFolderPopover = null
            }
        }}></div>
        <div
            bind:this={popoverElement}
            class="fixed z-50 bg-darkbg border border-selected rounded-lg shadow-xl p-3 flex flex-wrap gap-2 max-w-[min(448px,calc(100vw-32px))] pointer-events-auto"
            style:left={`${openFolderPopover.left}px`}
            style:top={`${openFolderPopover.y}px`}
            style:transform={openFolderPopover.above ? "translateY(-100%)" : "none"}>
            {#each folderData.folder as persona, folderInd}
                <div
                    class="relative cursor-grab active:cursor-grabbing select-none"
                    draggable="true"
                    ondragstart={(e) => {
                        personaDragStart({index: folderInd, folder: openFolderPopover.id}, e)
                        // 드래그 시작 시 팝오버를 닫아서 드롭이 가능하게 함
                        setTimeout(() => {
                            openFolderPopover = null
                        }, 0)
                    }}
                >
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <div role="button" tabindex="0"
                        onclick={() => handlePersonaClick(persona.index)}
                        onkeydown={(e) => {
                            if (e.key === "Enter") {
                                handlePersonaClick(persona.index)
                            }
                        }}>
                        {#if persona.icon === ''}
                            <div class="rounded-md h-16 w-16 shadow-lg bg-textcolor2 cursor-pointer hover:ring hover:ring-green-500" class:ring={persona.index === DBState.db.selectedPersona}></div>
                        {:else}
                            {#await getCharImage(persona.icon, 'css')}
                                <div class="rounded-md h-16 w-16 shadow-lg bg-textcolor2 cursor-pointer hover:ring hover:ring-green-500" class:ring={persona.index === DBState.db.selectedPersona}></div>
                            {:then im}
                                <div class="rounded-md h-16 w-16 shadow-lg bg-textcolor2 cursor-pointer hover:ring hover:ring-green-500" style={im} class:ring={persona.index === DBState.db.selectedPersona}></div>
                            {/await}
                        {/if}
                    </div>
                </div>
            {/each}
        </div>
    {/if}
{/if}

{#if selectedItem?.type === 'folder'}
    <!-- Folder Settings UI -->
    {@const folderId = selectedItem.id}
    {@const folderData = personaImages.find(p => p.type === 'folder' && p.id === folderId)}
    {@const folderIndex = getFolderIndex(folderId)}
    {@const folderObj = folderIndex !== -1 ? DBState.db.personaOrder[folderIndex] : null}
    {#if folderData && folderData.type === 'folder' && folderObj && isFolder(folderObj)}
        <div class="flex w-full items-starts rounded-md border-darkborderc border p-4 max-w-full flex-wrap">
            <div class="flex flex-col mt-4 mr-4">
                <button onclick={() => {selectFolderImg(folderId)}}>
                    {#if !folderData.icon}
                        <div class="rounded-md h-28 w-28 shadow-lg bg-textcolor2 cursor-pointer hover:text-green-500 flex items-center justify-center">
                            <svg viewBox="0 0 24 24" width="3em" height="3em">
                                <path fill="currentColor" d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
                            </svg>
                        </div>
                    {:else}
                        {#await getCharImage(folderData.icon, 'css')}
                            <div class="rounded-md h-28 w-28 shadow-lg bg-textcolor2 cursor-pointer hover:text-green-500"></div>
                        {:then im}
                            <div class="rounded-md h-28 w-28 shadow-lg bg-textcolor2 cursor-pointer hover:text-green-500" style={im}></div>
                        {/await}
                    {/if}
                </button>
            </div>
            <div class="flex flex-grow flex-col p-2 max-w-full">
                <span class="text-sm text-textcolor2">{language.name}</span>
                <TextInput marginBottom size="lg" placeholder="Folder Name" value={folderObj.name} onchange={(e) => updateFolderName(folderId, e.currentTarget.value)}/>
                <div class="flex gap-2 mt-4 max-w-full flex-wrap">
                    <Button styled="danger" onclick={() => deleteFolder(folderId)}>{language.remove}</Button>
                </div>
            </div>
        </div>
    {/if}
{:else if selectedItem?.type === 'persona'}
    <!-- Persona Settings UI -->
    <div class="flex w-full items-starts rounded-md border-darkborderc border p-4 max-w-full flex-wrap">
        <div class="flex flex-col mt-4 mr-4">
            <button onclick={() => {selectUserImg()}}>
                {#if DBState.db.userIcon === ''}
                    <div class="rounded-md h-28 w-28 shadow-lg bg-textcolor2 cursor-pointer hover:text-green-500"></div>
                {:else}
                    {#await getCharImage(DBState.db.userIcon, DBState.db.personas[DBState.db.selectedPersona].largePortrait ? 'lgcss' : 'css')}
                        <div class="rounded-md h-28 w-28 shadow-lg bg-textcolor2 cursor-pointer hover:text-green-500"></div>
                    {:then im}
                        <div class="rounded-md h-28 w-28 shadow-lg bg-textcolor2 cursor-pointer hover:text-green-500" style={im}></div>
                    {/await}
                {/if}
            </button>
        </div>
        <div class="flex flex-grow flex-col p-2 max-w-full">
            <span class="text-sm text-textcolor2">{language.name}</span>
            <TextInput marginBottom size="lg" placeholder="User" bind:value={DBState.db.username}/>
            <span class="text-sm text-textcolor2">{language.note}</span>
            {#if DBState.db.personaNote}
                <TextInput marginBottom size="lg" bind:value={DBState.db.userNote} placeholder={`Put a unique identifier for this persona here.\nExample: [Alternate Hunters persona]`} />
            {/if}
            <span class="text-sm text-textcolor2">{language.description}</span>
            <TextAreaInput autocomplete="off" bind:value={DBState.db.personaPrompt} placeholder={`Put the description of this persona here.\nExample: [<user> is a 20 year old girl.]`} />
            <div class="flex gap-2 mt-4 max-w-full flex-wrap">
                <Button onclick={exportUserPersona}>{language.export}</Button>
                <Button onclick={importUserPersona}>{language.import}</Button>

                <Button styled="danger" onclick={async () => {
                    if(DBState.db.personas.length === 1){
                        return
                    }
                    const d = await alertConfirm(`${language.removeConfirm}${DBState.db.personas[DBState.db.selectedPersona].name}`)
                    if(d){
                        saveUserPersona()
                        const personaId = DBState.db.personas[DBState.db.selectedPersona].id
                        let personas = DBState.db.personas
                        personas.splice(DBState.db.selectedPersona, 1)
                        DBState.db.personas = personas

                        // Remove from personaOrder
                        DBState.db.personaOrder = DBState.db.personaOrder.filter(item => {
                            if(typeof item === 'string'){
                                return item !== personaId
                            }
                            // If it's a folder, remove the persona from the folder's data array
                            if(item.data){
                                item.data = item.data.filter(id => id !== personaId)
                                return item.data.length > 0 // Remove empty folders
                            }
                            return true
                        })

                        changeUserPersona(0, 'noSave')
                    }
                }}>{language.remove}</Button>
                <Check bind:check={DBState.db.personas[DBState.db.selectedPersona].largePortrait}>{language.largePortrait}</Check>
            </div>
        </div>
    </div>
{/if}