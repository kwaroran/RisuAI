export const VERCEL_AI_GATEWAY_BASE_URL = 'https://ai-gateway.vercel.sh/v1'
export const VERCEL_AI_GATEWAY_MODELS_ENDPOINT = `${VERCEL_AI_GATEWAY_BASE_URL}/models`
export const VERCEL_AI_GATEWAY_CHAT_ENDPOINT = `${VERCEL_AI_GATEWAY_BASE_URL}/chat/completions`
export const VERCEL_AI_GATEWAY_RESPONSES_ENDPOINT = `${VERCEL_AI_GATEWAY_BASE_URL}/responses`

export function getVercelModelEndpointsURL(modelId: string): string {
    const encodedModelId = modelId.split('/').map(encodeURIComponent).join('/')
    return `${VERCEL_AI_GATEWAY_MODELS_ENDPOINT}/${encodedModelId}/endpoints`
}
