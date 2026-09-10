import { getVercelGatewayProviders } from 'src/ts/model/vercel'
import { getDatabase } from 'src/ts/storage/database.svelte'

export function isVercelGatewayModel(aiModel?: string): boolean {
    return aiModel === 'vercel'
}

function normalizeProviderList(providers: string[]): string[] {
    const normalized = providers.map((provider) => provider.trim()).filter(Boolean)
    return [...new Set(normalized)]
}

export async function applyVercelGatewayOptions<T extends Record<string, any>>(body: T, aiModel?: string): Promise<T> {
    if(!isVercelGatewayModel(aiModel)) return body

    const db = getDatabase()
    const config = db.vercelGateway
    const requestBody = body as Record<string, any>
    const gateway: Record<string, any> = {}
    const excluded = normalizeProviderList(config.excluded ?? [])
    const excludedSet = new Set(excluded)
    const configuredOrder = normalizeProviderList(config.order ?? [])
    const legacyOnly = normalizeProviderList(config.only ?? [])
    let providers: string[] = []

    if(configuredOrder.length > 0 || excluded.length > 0){
        const model = typeof requestBody.model === 'string' ? requestBody.model : db.vercelRequestModel
        providers = normalizeProviderList((await getVercelGatewayProviders(model)).map((provider) => provider.slug))
        if(providers.length === 0) throw new Error('Could not load providers for the selected Vercel AI Gateway model.')
    }

    const providerSet = new Set(providers)
    const order = configuredOrder.filter((provider) => providerSet.has(provider) && !excludedSet.has(provider))
    if(order.length > 0) gateway.order = order
    if(excluded.length > 0){
        const activeExcluded = providers.filter((provider) => excludedSet.has(provider))
        if(activeExcluded.length > 0){
            const only = providers.filter((provider) => !excludedSet.has(provider))
            if(only.length === 0) throw new Error('At least one Vercel AI Gateway provider must remain enabled.')
            gateway.only = only
        }
    }
    else if(legacyOnly.length > 0){
        gateway.only = legacyOnly
    }
    if(config.sort && config.sort !== 'auto') gateway.sort = config.sort
    if(config.serviceTier && config.serviceTier !== 'default') gateway.serviceTier = config.serviceTier
    if(config.zeroDataRetention) gateway.zeroDataRetention = true
    if(config.disallowPromptTraining) gateway.disallowPromptTraining = true
    if(config.automaticCaching) gateway.caching = 'auto'

    if(Object.keys(gateway).length > 0){
        requestBody.providerOptions ??= {}
        requestBody.providerOptions.gateway = gateway
    }
    else if(requestBody.providerOptions?.gateway){
        delete requestBody.providerOptions.gateway
        if(Object.keys(requestBody.providerOptions).length === 0) delete requestBody.providerOptions
    }

    return body
}

export function getVercelGatewayRequestModel(aiModel?: string): string | undefined {
    return isVercelGatewayModel(aiModel) ? getDatabase().vercelRequestModel : undefined
}

export function getVercelGatewayAPIKey(aiModel?: string): string | undefined {
    return isVercelGatewayModel(aiModel) ? getDatabase().vercelAIKey : undefined
}

export const __testVercelGateway = {
    normalizeProviderList,
}
