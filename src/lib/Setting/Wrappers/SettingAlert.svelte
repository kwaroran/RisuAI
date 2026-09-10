<script lang="ts">
    import type { Component } from 'svelte';
    import type { SettingItem, SettingContext } from 'src/ts/setting/types';
    import { language } from 'src/lang';
    import { getLabel } from 'src/ts/setting/utils';
    import { CircleAlert, CircleCheck, CircleX, Info, TriangleAlert } from '@lucide/svelte';

    type AlertVariant = 'info' | 'warning' | 'error' | 'success' | 'neutral';

    interface Props {
        item: SettingItem;
        ctx: SettingContext;
    }

    interface AlertStyle {
        icon: Component<any>;
        className: string;
        iconClassName: string;
    }

    const alertStyles: Record<AlertVariant, AlertStyle> = {
        info: {
            icon: Info,
            className: 'border-blue-500/40 bg-blue-500/10',
            iconClassName: 'text-blue-500',
        },
        warning: {
            icon: TriangleAlert,
            className: 'border-amber-500/50 bg-amber-500/10',
            iconClassName: 'text-amber-500',
        },
        error: {
            icon: CircleX,
            className: 'border-draculared/50 bg-draculared/10',
            iconClassName: 'text-draculared',
        },
        success: {
            icon: CircleCheck,
            className: 'border-emerald-500/45 bg-emerald-500/10',
            iconClassName: 'text-emerald-500',
        },
        neutral: {
            icon: CircleAlert,
            className: 'border-textcolor/20 bg-textcolor/5',
            iconClassName: 'text-textcolor2',
        },
    };

    let { item }: Props = $props();

    let variant = $derived((item.options?.variant ?? 'info') as AlertVariant);
    let style = $derived(alertStyles[variant] ?? alertStyles.info);
    let Icon = $derived(style.icon);
    let title = $derived(
        item.options?.titleKey && (language as any)[item.options.titleKey]
            ? (language as any)[item.options.titleKey]
            : item.options?.title
    );
</script>

<div
    class="flex gap-2 rounded-md border px-3 py-2 text-sm text-textcolor {style.className} {item.classes ?? 'my-2'}"
>
    <Icon size={18} class="mt-0.5 shrink-0 {style.iconClassName}" />
    <div class="min-w-0">
        {#if title}
            <div class="mb-1 font-semibold">{title}</div>
        {/if}
        <div class="whitespace-pre-wrap break-words leading-relaxed text-textcolor2">{getLabel(item)}</div>
    </div>
</div>
