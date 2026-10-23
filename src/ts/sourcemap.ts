import { SourceMapConsumer } from 'source-map';

// Initialize the source-map library with the wasm file location
SourceMapConsumer.initialize({
    'lib/mappings.wasm':
        'https://cdn.jsdelivr.net/npm/source-map@0.8.0/lib/mappings.wasm',
});

// Timeout for fetch requests (10 seconds)
const FETCH_TIMEOUT_MS = 10000;

export interface StackTraceTranslationResult {
    stackTrace: string;
    didTranslate: boolean;
}

export async function translateStackTrace(stackTrace: string): Promise<StackTraceTranslationResult> {
    if (!stackTrace) {
        return {
            stackTrace: '',
            didTranslate: false
        };
    }

    const stackLines = stackTrace.split('\n');
    const newStackLines: string[] = [];
    
    // Cache for SourceMapConsumer instances to avoid fetching/parsing the same map file multiple times
    const consumerCache = new Map<string, SourceMapConsumer>();
    // Track failed URLs to avoid duplicate warnings and repeated fetch attempts
    const failedUrls = new Map<string, string>(); // url -> error message

    // Step 1: Collect all unique mapUrls from stack trace
    const urlsToFetch = new Set<string>();
    const linePattern = /(http[s]?:\/\/[^\s)]+\.js):(\d+):(\d+)/;
    
    for (const line of stackLines) {
        const match = line.match(linePattern);
        if (match) {
            const mapUrl = match[1] + '.map';
            urlsToFetch.add(mapUrl);
        }
    }

    if (urlsToFetch.size === 0) {
        return {
            stackTrace,
            didTranslate: false
        };
    }

    // Step 2: Fetch all sourcemaps in parallel
    await Promise.all(
        Array.from(urlsToFetch).map(async (mapUrl) => {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
                
                try {
                    const mapRes = await fetch(mapUrl, { 
                        method: 'GET',
                        signal: controller.signal
                    });
                    
                    clearTimeout(timeoutId);
                    
                    if (mapRes.ok) {
                        try {
                            const mapContent = await mapRes.json();
                            const consumer = await new SourceMapConsumer(mapContent);
                            consumerCache.set(mapUrl, consumer);
                        } catch (parseError) {
                            const errorMsg = `Failed to parse sourcemap: ${getFileName(mapUrl)}`;
                            failedUrls.set(mapUrl, errorMsg);
                            console.error(errorMsg, parseError);
                        }
                    } else {
                        const errorMsg = `Sourcemap not found: ${getFileName(mapUrl)} (${mapRes.status} ${mapRes.statusText})`;
                        failedUrls.set(mapUrl, errorMsg);
                        console.error(errorMsg);
                    }
                } catch (fetchError) {
                    clearTimeout(timeoutId);
                    
                    if (fetchError instanceof Error && fetchError.name === 'AbortError') {
                        const errorMsg = `Sourcemap fetch timed out: ${getFileName(mapUrl)}`;
                        failedUrls.set(mapUrl, errorMsg);
                        console.error(errorMsg);
                    } else {
                        const errorMsg = `Failed to fetch sourcemap: ${getFileName(mapUrl)}`;
                        failedUrls.set(mapUrl, errorMsg);
                        console.error(errorMsg, fetchError);
                    }
                }
            } catch (e) {
                const errorMsg = `Failed to fetch sourcemap: ${getFileName(mapUrl)}`;
                failedUrls.set(mapUrl, errorMsg);
                console.error(errorMsg, e);
            }
        })
    );

    // Step 3: Process all stack lines in parallel while maintaining order
    let translatedFrameCount = 0;
    try {
        const processedLines = await Promise.all(
            stackLines.map((line) => {
                const match = line.match(linePattern);
                if (match) {
                    const [, url, lineNumber, columnNumber] = match;
                    const mapUrl = url + '.map';
                    
                    const consumer = consumerCache.get(mapUrl);
                    if (consumer) {
                        const originalPosition = consumer.originalPositionFor({
                            line: parseInt(lineNumber),
                            column: parseInt(columnNumber)
                        });
                        if (originalPosition.source) {
                            translatedFrameCount += 1;
                            if (originalPosition.name) {
                                return `    at ${originalPosition.name} (${originalPosition.source}:${originalPosition.line}:${originalPosition.column})`;
                            }
                            return `    at ${originalPosition.source}:${originalPosition.line}:${originalPosition.column}`;
                        }
                    }
                }
                return line;
            })
        );
        newStackLines.push(...processedLines);
    } finally {
        // Clean up all cached consumers
        for (const consumer of consumerCache.values()) {
            consumer.destroy();
        }
    }

    if (translatedFrameCount === 0) {
        return {
            stackTrace,
            didTranslate: false
        };
    }

    return {
        stackTrace: newStackLines.join('\n'),
        didTranslate: true
    };
}

// Helper function to extract filename from URL for cleaner error messages
function getFileName(url: string): string {
    try {
        const urlObj = new URL(url);
        return urlObj.pathname.split('/').pop() || url;
    } catch {
        return url;
    }
}
