import * as tauriOs from "@tauri-apps/plugin-os";

type UserAgentDataLike = {
    platform?: string
    getHighEntropyValues?: (hints: string[]) => Promise<{
        platformVersion?: string
    }>
}

type BrowserNavigator = Navigator & {
    userAgentData?: UserAgentDataLike
    standalone?: boolean
}

export type RisuEnvironmentLabel = "local" | "node" | "web" | "web(dev)"

const browserNavigator = navigator as BrowserNavigator

export const isTauri: boolean = !!(window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__
export const isNodeServer: boolean = !!(globalThis as typeof globalThis & { __NODE__?: boolean }).__NODE__
export const isWeb: boolean = !isTauri && !isNodeServer && location.hostname === 'risuai.xyz'
export const isMobile: boolean = /Android|iPhone|iPad|iPod|webOS/i.test(browserNavigator.userAgent);

export const isFirefox: boolean = browserNavigator.userAgent.includes("Firefox")

function normalizeOSVersion(version?: string | null): string | null {
    if (!version) {
        return null
    }

    const normalized = version.trim().replace(/_/g, ".")
    return normalized && normalized !== "0.0.0" ? normalized : null
}

function formatOSName(osName: string): string {
    switch (osName.toLowerCase()) {
        case "macos":
            return "macOS"
        case "ios":
            return "iOS"
        case "windows":
            return "Windows"
        case "android":
            return "Android"
        case "linux":
            return "Linux"
        case "chromeos":
            return "ChromeOS"
        default:
            return osName
    }
}

function joinOSLabel(osName: string, version: string | null): string {
    return version ? `${osName} ${version}` : osName
}

export function isIOS(): boolean {
    const ua = browserNavigator.userAgent || ''
    const isAppleMobile = /iPad|iPhone|iPod/.test(ua)

    // iPadOS 13+
    const isIpadOS = browserNavigator.platform === 'MacIntel' && browserNavigator.maxTouchPoints > 1

    return isAppleMobile || isIpadOS
}

export function isMacOS(): boolean {
    if (isTauri) {
        try {
            return tauriOs.type().toLowerCase() === "macos"
        } catch {
            return getBrowserOSName() === "macOS"
        }
    }

    return getBrowserOSName() === "macOS"
}

function getBrowserOSName(): string {
    const uaPlatform = browserNavigator.userAgentData?.platform
    if (uaPlatform) {
        return formatOSName(uaPlatform)
    }

    const ua = browserNavigator.userAgent || ""
    const platform = browserNavigator.platform || ""

    if (/Windows/i.test(ua)) return "Windows"
    if (/Android/i.test(ua)) return "Android"
    if (isIOS()) return "iOS"
    if (/CrOS/i.test(ua)) return "ChromeOS"
    if (/Mac/i.test(platform) || /Mac OS X/i.test(ua)) return "macOS"
    if (/Linux/i.test(platform) || /Linux/i.test(ua)) return "Linux"

    return platform || "Unknown"
}

function getUserAgentOSVersion(osName: string): string | null {
    const ua = browserNavigator.userAgent || ""

    switch (osName) {
        case "Android":
            return normalizeOSVersion(ua.match(/Android ([\d.]+)/i)?.[1])
        case "iOS":
            return normalizeOSVersion(ua.match(/(?:CPU (?:iPhone )?OS|iPhone OS|CPU OS) ([\d_]+)/i)?.[1])
        case "ChromeOS":
            return normalizeOSVersion(ua.match(/CrOS [^ ]+ ([\d.]+)/i)?.[1])
        case "Windows": {
            const windowsVersion = normalizeOSVersion(ua.match(/Windows NT ([\d.]+)/i)?.[1])
            return windowsVersion ? `NT ${windowsVersion}` : null
        }
        default:
            return null
    }
}

async function getBrowserHighEntropyOSVersion(): Promise<string | null> {
    try {
        const values = await browserNavigator.userAgentData?.getHighEntropyValues?.(["platformVersion"])
        return normalizeOSVersion(values?.platformVersion)
    } catch (error) {
        console.warn("Failed to read browser platformVersion:", error)
        return null
    }
}

export function getRisuEnvironmentLabel(): RisuEnvironmentLabel {
    if (isTauri) {
        return "local"
    }

    if (import.meta.env.DEV) {
        return "web(dev)"
    }

    if (isNodeServer) {
        return "node"
    }

    return "web"
}

export function getFallbackOSLabel(): string {
    const osName = getBrowserOSName()
    return joinOSLabel(osName, getUserAgentOSVersion(osName))
}

export async function getDetailedOSLabel(): Promise<string> {
    if (isTauri) {
        try {
            return joinOSLabel(formatOSName(tauriOs.type()), normalizeOSVersion(tauriOs.version()))
        } catch (error) {
            console.warn("Failed to read native OS details:", error)
        }
    }

    const osName = getBrowserOSName()
    const browserVersion = await getBrowserHighEntropyOSVersion()

    return joinOSLabel(osName, browserVersion ?? getUserAgentOSVersion(osName))
}

export const isInStandaloneMode =
    window.matchMedia("(display-mode: standalone)").matches ||
    !!browserNavigator.standalone ||
    document.referrer.includes("android-app://");
