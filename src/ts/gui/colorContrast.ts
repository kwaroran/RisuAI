export type ContrastRating = {
    label: 'excellent' | 'good' | 'limited' | 'poor';
    detail: 'AAA' | 'AA' | 'largeTextOnly' | 'lowContrast';
};

function parseHexColor(color: string): [number, number, number] | null {
    const match = color.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (!match) {
        return null;
    }

    const hex = match[1].length === 3
        ? match[1].split('').map((channel) => channel + channel).join('')
        : match[1];

    return [
        Number.parseInt(hex.slice(0, 2), 16),
        Number.parseInt(hex.slice(2, 4), 16),
        Number.parseInt(hex.slice(4, 6), 16),
    ];
}

function srgbChannelToLinear(channel: number): number {
    const normalized = channel / 255;
    return normalized <= 0.04045
        ? normalized / 12.92
        : ((normalized + 0.055) / 1.055) ** 2.4;
}

function getRelativeLuminance(color: string): number | null {
    const rgb = parseHexColor(color);
    if (!rgb) {
        return null;
    }

    const [red, green, blue] = rgb.map(srgbChannelToLinear);
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function calculateContrastRatio(foreground: string, background: string): number | null {
    const foregroundLuminance = getRelativeLuminance(foreground);
    const backgroundLuminance = getRelativeLuminance(background);

    if (foregroundLuminance === null || backgroundLuminance === null) {
        return null;
    }

    const lighter = Math.max(foregroundLuminance, backgroundLuminance);
    const darker = Math.min(foregroundLuminance, backgroundLuminance);
    return (lighter + 0.05) / (darker + 0.05);
}

export function getContrastRating(ratio: number): ContrastRating {
    if (ratio >= 7) {
        return { label: 'excellent', detail: 'AAA' };
    }
    if (ratio >= 4.5) {
        return { label: 'good', detail: 'AA' };
    }
    if (ratio >= 3) {
        return { label: 'limited', detail: 'largeTextOnly' };
    }
    return { label: 'poor', detail: 'lowContrast' };
}
