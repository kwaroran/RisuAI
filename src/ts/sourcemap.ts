import { SourceMapConsumer } from 'source-map';

// Initialize the source-map library with the wasm file location
// @ts-expect-error initialize is a static method but typed as instance method
SourceMapConsumer.initialize({
    'lib/mappings.wasm': 'https://cdn.jsdelivr.net/npm/source-map@0.7.4/lib/mappings.wasm'
});

export async function translateStackTrace(stackTrace: string): Promise<string> {
    if (!stackTrace) {
        return '';
    }

    const stackLines = stackTrace.split('\n');
    const newStackLines: string[] = [];

    for (const line of stackLines) {
        const match = line.match(/(http[s]?:\/\/.*index-.*\.js):(\d+):(\d+)/);
        if (match) {
            const [, url, lineNumber, columnNumber] = match;
            try {
                const mapUrl = url + '.map';
                const mapRes = await fetch(mapUrl, { method: 'GET' });
                if (mapRes.ok) {
                    const mapContent = await mapRes.json();
                    const consumer = await new SourceMapConsumer(mapContent);
                    const originalPosition = consumer.originalPositionFor({
                        line: parseInt(lineNumber),
                        column: parseInt(columnNumber)
                    });
                    if (originalPosition.source) {
                        newStackLines.push(`    at ${originalPosition.name || ''} (${originalPosition.source}:${originalPosition.line}:${originalPosition.column})`);
                    } else {
                        newStackLines.push(line);
                    }
                    consumer.destroy();
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
    return newStackLines.join('\n');
}