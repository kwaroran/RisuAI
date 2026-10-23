import { describe, it, expect, vi } from 'vitest';

vi.mock('../tokenizer', () => ({
    // one token per character keeps the expected splits easy to read
    tokenize: vi.fn(async (text: string) => text.length),
}));

import { getPromptTokenBreakdown, matchSourcesAfterEdit } from './tokenBreakdown';
import { tokenize } from '../tokenizer';

const sum = (breakdown: Record<string, number>) => Object.values(breakdown).reduce((a, b) => a + b, 0);

describe('getPromptTokenBreakdown', () => {
    it('assigns single-source messages their full count without re-tokenizing', async () => {
        vi.mocked(tokenize).mockClear();
        const result = await getPromptTokenBreakdown([
            [{ source: 'prompt', content: 'main' }],
            [{ source: 'chat', content: 'hello' }],
            [{ source: 'lorebook', content: 'a' }, { source: 'lorebook', content: 'b' }],
        ], [10, 20, 30]);
        expect(result).toEqual({ prompt: 10, chat: 20, lorebook: 30 });
        expect(tokenize).not.toHaveBeenCalled();
    });

    it('splits merged mixed-source messages by part size and keeps the total', async () => {
        const result = await getPromptTokenBreakdown([
            [{ source: 'prompt', content: 'aaa' }, { source: 'description', content: 'b' }],
        ], [10]);
        expect(result).toEqual({ prompt: 8, description: 2 });
        expect(sum(result)).toBe(10);
    });

    it('ignores surrounding whitespace when weighting parts', async () => {
        const result = await getPromptTokenBreakdown([
            [{ source: 'description', content: ' '.repeat(1000) + 'a' }, { source: 'prompt', content: 'aaa' }],
        ], [4]);
        expect(result).toEqual({ description: 1, prompt: 3 });
    });

    it('omits removed messages and zero entries', async () => {
        const result = await getPromptTokenBreakdown([
            [{ source: 'memory', content: 'old' }],
            [{ source: 'chat', content: 'new' }],
        ], [0, 5]);
        expect(result).toEqual({ chat: 5 });
        expect('memory' in result).toBe(false);
    });

    it('falls back to other when a message has no recorded parts', async () => {
        const result = await getPromptTokenBreakdown([
            [{ source: 'prompt', content: 'main' }],
        ], [3, 7]);
        expect(result).toEqual({ prompt: 3, other: 7 });
    });

    it('keeps the total equal to the input counts for uneven splits', async () => {
        const counts = [7, 13, 1, 100];
        const result = await getPromptTokenBreakdown(counts.map(() => [
            { source: 'prompt', content: 'aa' },
            { source: 'lorebook', content: 'aaa' },
            { source: 'persona', content: 'aaaa' },
        ]), counts);
        expect(sum(result)).toBe(121);
    });
});

describe('matchSourcesAfterEdit', () => {
    const before = [
        { role: 'system', content: 'main' },
        { role: 'system', content: 'lore' },
        { role: 'user', content: 'hi' },
    ];
    const sources = [
        [{ source: 'prompt' as const, content: 'main' }],
        [{ source: 'lorebook' as const, content: 'lore' }],
        [{ source: 'chat' as const, content: 'hi' }],
    ];
    const sourceNames = (result: ReturnType<typeof matchSourcesAfterEdit>) => result.map((parts) => parts.map((part) => part.source));

    it('keeps sources when a message is inserted at the front', () => {
        const result = matchSourcesAfterEdit(before, sources, [{ role: 'system', content: 'injected' }, ...before]);
        expect(sourceNames(result)).toEqual([['other'], ['prompt'], ['lorebook'], ['chat']]);
    });

    it('follows removed and reordered messages', () => {
        const result = matchSourcesAfterEdit(before, sources, [before[2], before[0]]);
        expect(sourceNames(result)).toEqual([['chat'], ['prompt']]);
    });

    it('counts rewritten messages as other instead of guessing', () => {
        const result = matchSourcesAfterEdit(before, sources, [
            { role: 'system', content: 'lore!' },
            { role: 'system', content: 'main!' },
            before[2],
        ]);
        expect(sourceNames(result)).toEqual([['other'], ['other'], ['chat']]);
    });

    it('matches duplicated content once per original message', () => {
        const result = matchSourcesAfterEdit([before[2]], [sources[2]], [before[2], before[2]]);
        expect(sourceNames(result)).toEqual([['chat'], ['other']]);
    });
});
