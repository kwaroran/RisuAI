import { describe, expect, test } from 'vitest';
import { calculateContrastRatio, getContrastRating } from '../colorContrast';

describe('calculateContrastRatio', () => {
    test('returns the WCAG maximum contrast for black and white', () => {
        expect(calculateContrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    });

    test('accepts three-digit hex colors', () => {
        expect(calculateContrastRatio('#000', '#fff')).toBeCloseTo(21, 5);
    });

    test('is independent of foreground/background order', () => {
        const first = calculateContrastRatio('#f8f8f2', '#282a36');
        const second = calculateContrastRatio('#282a36', '#f8f8f2');
        expect(first).toBeCloseTo(second ?? 0, 5);
    });

    test('returns null for unsupported color strings', () => {
        expect(calculateContrastRatio('red', '#ffffff')).toBeNull();
        expect(calculateContrastRatio('#12', '#ffffff')).toBeNull();
    });
});

describe('getContrastRating', () => {
    test.each([
        [7, { label: 'excellent', detail: 'AAA' }],
        [4.5, { label: 'good', detail: 'AA' }],
        [3, { label: 'limited', detail: 'largeTextOnly' }],
        [2.99, { label: 'poor', detail: 'lowContrast' }],
    ])('rates a contrast ratio of %s', (ratio, expected) => {
        expect(getContrastRating(ratio as number)).toEqual(expected);
    });
});
