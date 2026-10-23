import { getCurrentWindow } from "@tauri-apps/api/window";
import { platform } from "@tauri-apps/plugin-os";
import { isTauri } from "../platform";

// Height of the band the traffic lights sit in, in window points; trafficLightPosition in src-tauri/tauri.macos.conf.json centers them in it
const TITLEBAR_HEIGHT = 40

function detectOverlayTitlebar(){
    if(!isTauri){
        return false
    }
    try {
        return platform() === 'macos'
    } catch {
        return false
    }
}

// The macOS window uses titleBarStyle "Overlay", so the traffic lights are drawn over the webview
export const hasOverlayTitlebar = detectOverlayTitlebar()

export const TitlebarState = $state({
    // Whether the layout has to keep room for the traffic lights; macOS hides them in fullscreen
    inset: false
})

// The traffic lights are native and keep their size when the page is zoomed
let pageZoom = 1

function applyTitlebar(){
    // Divide by the zoom so the band stays TITLEBAR_HEIGHT points tall on screen
    document.documentElement.style.setProperty('--risu-titlebar-height', TitlebarState.inset ? `${TITLEBAR_HEIGHT / pageZoom}px` : '0px')
}

function applyInset(inset:boolean){
    TitlebarState.inset = inset
    applyTitlebar()
}

export async function initTitlebar(){
    if(!hasOverlayTitlebar){
        return
    }
    applyInset(true)
    const appWindow = getCurrentWindow()
    const updateInset = async () => {
        applyInset(!(await appWindow.isFullscreen()))
    }
    const updateZoom = async () => {
        const windowWidth = (await appWindow.innerSize()).toLogical(await appWindow.scaleFactor()).width
        // The webview fills the window, so its CSS width only differs from the window width by the page zoom
        const zoom = windowWidth / window.innerWidth
        if(Number.isFinite(zoom) && zoom > 0){
            pageZoom = zoom
            applyTitlebar()
        }
    }
    let pendingInsetCheck: ReturnType<typeof setTimeout> | undefined
    await appWindow.onResized(() => {
        // The window only reports leaving fullscreen once the exit animation is done, so check after resizing settles
        clearTimeout(pendingInsetCheck)
        pendingInsetCheck = setTimeout(updateInset, 200)
    })
    let pendingZoomCheck: ReturnType<typeof setTimeout> | undefined
    // Zooming resizes the page but not the window, so only the page's resize event sees it
    window.addEventListener('resize', () => {
        clearTimeout(pendingZoomCheck)
        pendingZoomCheck = setTimeout(updateZoom, 100)
    })
    await Promise.all([updateInset(), updateZoom()])
}
