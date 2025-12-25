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

    try {
        for (const line of stackLines) {
            const match = line.match(/(http[s]?:\/\/.*index-.*\.js):(\d+):(\d+)/);
            if (match) {
                const [, url, lineNumber, columnNumber] = match;
                try {
                    const mapUrl = url + '.map';
                    
                    // Check cache first
                    let consumer = consumerCache.get(mapUrl);
                    if (!consumer) {
                        const mapRes = await fetch(mapUrl, { method: 'GET' });
                        if (mapRes.ok) {
                            const mapContent = await mapRes.json();
                            consumer = await new SourceMapConsumer(mapContent);
                            consumerCache.set(mapUrl, consumer);
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
                    console.error('Error processing sourcemap for line:', line, e);
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
    
    return newStackLines.join('\n');
}