import { SourceMapConsumer } from 'source-map';

// Initialize the source-map library with the wasm file location
SourceMapConsumer.initialize({
    'lib/mappings.wasm': 'https://cdn.jsdelivr.net/npm/source-map@0.7.4/lib/mappings.wasm'
});

export async function translateStackTrace(stackTrace: string): Promise<string> {
    if (!stackTrace) {
        return '';
    }

    const stackLines = stackTrace.split('\n');
    const newStackLines: string[] = [];
    
    // Cache for SourceMapConsumer instances to avoid fetching/parsing the same map file multiple times
    const consumerCache = new Map<string, SourceMapConsumer>();
    // Track failed URLs to avoid duplicate warnings and repeated fetch attempts
    const failedUrls = new Map<string, string>(); // url -> error message

    try {
        for (const line of stackLines) {
            const match = line.match(/(http[s]?:\/\/.*index-.*\.js):(\d+):(\d+)/);
            if (match) {
                const [, url, lineNumber, columnNumber] = match;
                const mapUrl = url + '.map';
                
                // Skip if we already know this URL failed
                if (failedUrls.has(mapUrl)) {
                    newStackLines.push(line);
                    continue;
                }
                
                try {
                    // Check cache first
                    let consumer = consumerCache.get(mapUrl);
                    if (!consumer) {
                        const mapRes = await fetch(mapUrl, { method: 'GET' });
                        if (mapRes.ok) {
                            try {
                                const mapContent = await mapRes.json();
                                consumer = await new SourceMapConsumer(mapContent);
                                consumerCache.set(mapUrl, consumer);
                            } catch (parseError) {
                                const errorMsg = `Failed to parse sourcemap: ${getFileName(mapUrl)}`;
                                failedUrls.set(mapUrl, errorMsg);
                                console.error(errorMsg, parseError);
                                newStackLines.push(line);
                                continue;
                            }
                        } else {
                            const errorMsg = `Sourcemap not found: ${getFileName(mapUrl)} (${mapRes.status} ${mapRes.statusText})`;
                            failedUrls.set(mapUrl, errorMsg);
                            newStackLines.push(line);
                            continue;
                        }
                    }
                    
                    if (consumer) {
                        const originalPosition = consumer.originalPositionFor({
                            line: parseInt(lineNumber),
                            column: parseInt(columnNumber)
                        });
                        if (originalPosition.source) {
                            newStackLines.push(`    at ${originalPosition.name || ''} (${originalPosition.source}:${originalPosition.line}:${originalPosition.column})`);
                        } else {
                            newStackLines.push(line);
                        }
                    } else {
                        newStackLines.push(line);
                    }
                } catch (e) {
                    const errorMsg = `Failed to fetch sourcemap: ${getFileName(mapUrl)}`;
                    failedUrls.set(mapUrl, errorMsg);
                    console.error(errorMsg, e);
                    newStackLines.push(line);
                }
            } else {
                newStackLines.push(line);
            }
        }
    } finally {
        // Clean up all cached consumers
        for (const consumer of consumerCache.values()) {
            consumer.destroy();
        }
    }
    
    // Prepend warnings if there were any failures
    if (failedUrls.size > 0) {
        const warnings = Array.from(failedUrls.values()).map(msg => `⚠️ ${msg}`);
        return [...warnings, '', ...newStackLines].join('\n');
    }
    
    return newStackLines.join('\n');
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