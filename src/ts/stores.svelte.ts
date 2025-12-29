import { writable } from "svelte/store";
import type { character, Database, groupChat } from "./storage/database.svelte";
import type { simpleCharacterArgument } from "./parser.svelte";
import type { alertData } from "./alert";
import { moduleUpdate } from "./process/modules";
import { resetScriptCache } from "./process/scripts";
import type { hubType } from "./characterCards";
import type { PluginSafetyErrors } from "./plugins/pluginSafety";

function updateSize(){
    SizeStore.set({
        w: window.innerWidth,
        h: window.innerHeight
    })
    DynamicGUI.set(window.innerWidth <= 1024)
}

export const SizeStore = writable({
    w: 0,
    h: 0
})

const t = 'https://raw.githubusercontent.com/ProjectAliceDev/ProjectAliceDev.github.io/master/'
export const loadedStore = writable(false)
export const DynamicGUI = writable(false)
export const sideBarClosing = writable(false)
export const sideBarStore = writable(window.innerWidth > 1024)
export const selectedCharID = writable(-1)
export const CurrentTriggerIdStore = writable<string | null>(null)
export const CharEmotion = writable({} as {[key:string]: [string, string, number][]})
export const ViewBoxsize = writable({ width: 12 * 16, height: 12 * 16 }); // Default width and height in pixels
export const settingsOpen = writable(false)
export const botMakerMode = writable(false)
export const moduleBackgroundEmbedding = writable('')
export const openPresetList = writable(false)
export const openPersonaList = writable(false)
export const bookmarkListOpen = writable(false)
export const MobileGUI = writable(false)
export const MobileGUIStack = writable(0)
export const MobileSideBar = writable(0)
export const ShowVN = writable(false)
export const SettingsMenuIndex = writable(-1)
export const ReloadGUIPointer = writable(0)
export const ReloadChatPointer = writable({} as Record<number, number>)
export const ScrollToMessageStore = $state({ value: -1 })
export const OpenRealmStore = writable(false)
export const RealmInitialOpenChar = writable<null | hubType>(null)
export const ShowRealmFrameStore = writable('')
export const PlaygroundStore = writable(0)
export const HideIconStore = writable(false)
export const CustomCSSStore = writable('')
export const SafeModeStore = writable(false)
export const MobileSearch = writable('')
export const CharConfigSubMenu = writable(0)
export const CustomGUISettingMenuStore = writable(false)
export const alertStore = writable({
    type: 'none',
    msg: 'n',
} as alertData)
export const hypaV3ModalOpen = writable(false)
export const hypaV3ProgressStore = writable({
    open: false,
    miniMsg: '',
    msg: '',
    subMsg: '',
})
export const selIdState = $state({
    selId: -1
})


CustomCSSStore.subscribe((css) => {
    console.log(css)
    const q = document.querySelector('#customcss')
    if(q){
        q.innerHTML = css
    }
    else{
        const s = document.createElement('style')
        s.id = 'customcss'
        s.innerHTML = css
        document.body.appendChild(s)
    }
})

export function createSimpleCharacter(char:character|groupChat){
    if((!char) || char.type === 'group'){
        return null
    }

    const simpleChar:simpleCharacterArgument = {
        type: "simple",
        customscript: char.customscript,
        chaId: char.chaId,
        additionalAssets: char.additionalAssets,
        virtualscript: char.virtualscript,
        emotionImages: char.emotionImages,
        triggerscript: char.triggerscript,
    }

    return simpleChar

}

updateSize()
window.addEventListener("resize", updateSize);
export const DBState = $state({
    db: {} as any as Database
});

export const LoadingStatusState = $state({
    text: '',
})

export const QuickSettings = $state({
    open: false,
    index: 0
})

export const pluginAlertModalStore = $state({
    open: false,
    errors: [] as PluginSafetyErrors[]
})

export const disableHighlight = writable(true)

export type MenuDef = {
    name: string,
    icon: string,
    iconType:'html'|'img'|'none',
    callback: any,
    id: string,
}

export const additionalSettingsMenu = $state([] as MenuDef[])
export const additionalFloatingActionButtons = $state([] as MenuDef[])
export const additionalHamburgerMenu = $state([] as MenuDef[])
export const additionalChatMenu = $state([] as MenuDef[])
export const popupStore = $state({
    children: null as null | import("svelte").Snippet,
    mouseX: 0,
    mouseY: 0,
openId: 0,
})

ReloadGUIPointer.subscribe(() => {
    ReloadChatPointer.set({})
    resetScriptCache()
})

$effect.root(() => {
    selectedCharID.subscribe((v) => {
        selIdState.selId = v

        if (DBState?.db?.characters?.[selIdState.selId]) {
            if (DBState.db.hypaV3 && DBState.db.hypaV3Presets?.[DBState.db.hypaV3PresetId]?.settings?.alwaysToggleOn) {
                DBState.db.characters[selIdState.selId].supaMemory = true;
            }
        }
    })
    $effect(() => {
        $state.snapshot(DBState.db.modules)
        DBState?.db?.enabledModules
        DBState?.db?.enabledModules?.length
        DBState?.db?.characters?.[selIdState.selId]?.chats?.[DBState?.db?.characters?.[selIdState.selId]?.chatPage]?.modules?.length
        DBState?.db?.characters?.[selIdState.selId]?.hideChatIcon
        DBState?.db?.characters?.[selIdState.selId]?.backgroundHTML
        DBState?.db?.moduleIntergration
        moduleUpdate()
    })
})