export type PluginPermission = 'fetchLogs' | 'db' | 'mainDom' | 'replacer' | 'provider' | 'sendChat' | 'inlay'

type PluginScriptHasher = (data: Uint8Array) => Promise<string>

export async function runWithPluginPermission<T>(
    requestPermission: () => Promise<boolean>,
    onAllowed: () => Promise<T>,
    deniedResult: T,
): Promise<T> {
    if (!(await requestPermission())) {
        return deniedResult
    }

    return onAllowed()
}

export function createPluginScriptHashGetter(script: string, hasher: PluginScriptHasher): () => Promise<string> {
    let scriptHash: Promise<string> | undefined

    return () => {
        scriptHash ??= hasher(new TextEncoder().encode(script))
        return scriptHash
    }
}

export function getPluginPermissionKey(scriptHash: string, permission: PluginPermission): string {
    return `${scriptHash}_${permission}`
}

export class PluginPermissionSessionCache {
    private decisions = new Map<string, boolean>()

    get(scriptHash: string, permission: PluginPermission): boolean | undefined {
        return this.decisions.get(getPluginPermissionKey(scriptHash, permission))
    }

    set(scriptHash: string, permission: PluginPermission, granted: boolean): void {
        this.decisions.set(getPluginPermissionKey(scriptHash, permission), granted)
    }
}
