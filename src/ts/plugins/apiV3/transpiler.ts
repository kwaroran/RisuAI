export async function pluginCodeTranspiler(code: string): Promise<string> {
    const { transform } = await import('sucrase');

    //Maybe jsx in the future?
    const transformed = transform(code, {
        transforms: ['typescript'],
    });
    
    return transformed.code;
}