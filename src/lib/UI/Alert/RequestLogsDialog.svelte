<script lang="ts">
    import { CheckIcon, ChevronDownIcon, ChevronUpIcon, CopyIcon, XIcon } from '@lucide/svelte';
    import hljs from 'highlight.js/lib/core';
    import json from 'highlight.js/lib/languages/json';
    import { language } from 'src/lang';
    import { getFetchLogs } from 'src/ts/globalApi.svelte';
    import { alertStore } from 'src/ts/stores.svelte';
    import Button from '../GUI/Button.svelte';

    let expandedLogs: Set<number> = $state(new Set());
    let allExpanded = $state(false);
    let copiedKey: string | null = $state(null);
    const logs = $derived(getFetchLogs());

    if (!hljs.getLanguage('json')) {
        hljs.registerLanguage('json', json);
    }

    function highlightJson(code: string): string {
        try {
            return hljs.highlight(code, { language: 'json' }).value;
        } catch {
            return code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }
    }

    async function copyToClipboard(text: string, key: string) {
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        }
        copiedKey = key;
        setTimeout(() => {
            if (copiedKey === key) copiedKey = null;
        }, 1500);
    }
</script>

<div class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-4">
    <div class="my-4 flex max-h-[90vh] w-full max-w-4xl flex-col rounded-lg bg-darkbg">
        <div class="sticky top-0 z-10 flex items-center justify-between border-b border-darkborderc bg-darkbg p-4">
            <h1 class="text-xl font-bold text-textcolor">{language.ShowLog}</h1>
            <div class="flex items-center gap-2">
                <Button
                    size="sm"
                    onclick={() => {
                        if (allExpanded) {
                            expandedLogs = new Set();
                        } else {
                            expandedLogs = new Set(logs.map((_, i) => i));
                        }
                        allExpanded = !allExpanded;
                    }}
                >
                    {allExpanded ? language.collapseAll : language.expandAll}
                </Button>
                <button
                    class="p-1 text-textcolor2 hover:text-textcolor"
                    onclick={() => {
                        alertStore.set({ type: 'none', msg: '' });
                    }}
                >
                    <XIcon />
                </button>
            </div>
        </div>
        <div class="flex-1 overflow-y-auto p-4">
            {#if logs.length === 0}
                <div class="py-8 text-center text-textcolor2">{language.noRequestLogs}</div>
            {:else}
                <div class="flex flex-col gap-2">
                    {#each logs as log, i}
                        {@const isExpanded = expandedLogs.has(i)}
                        <div class="overflow-hidden rounded-lg border border-darkborderc">
                            <button
                                class="flex w-full items-center justify-between p-3 transition-colors hover:bg-bgcolor/50"
                                onclick={() => {
                                    const newSet = new Set(expandedLogs);
                                    if (isExpanded) {
                                        newSet.delete(i);
                                    } else {
                                        newSet.add(i);
                                    }
                                    expandedLogs = newSet;
                                }}
                            >
                                <div class="flex min-w-0 flex-1 items-center gap-3">
                                    <span class="rounded px-2 py-1 font-mono text-xs font-bold {log.success ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}">
                                        {log.status ?? (log.success ? 'OK' : 'ERR')}
                                    </span>
                                    <span class="flex-1 truncate text-left font-mono text-sm text-textcolor" title={log.url}>
                                        {log.url}
                                    </span>
                                    <span class="whitespace-nowrap text-xs text-textcolor opacity-70">{log.date}</span>
                                </div>
                                <div class="ml-2 text-textcolor">
                                    {#if isExpanded}
                                        <ChevronUpIcon size={20} />
                                    {:else}
                                        <ChevronDownIcon size={20} />
                                    {/if}
                                </div>
                            </button>
                            {#if isExpanded}
                                <div class="border-t border-darkborderc bg-bgcolor/30 p-4">
                                    <div class="space-y-4">
                                        <div>
                                            <div class="mb-2 flex items-center justify-between">
                                                <span class="text-sm font-semibold text-textcolor">URL</span>
                                                <button
                                                    class="rounded p-1 transition-colors hover:bg-bgcolor {copiedKey === `${i}-url` ? 'text-green-500' : 'text-textcolor2 hover:text-textcolor'}"
                                                    onclick={(e) => {
                                                        e.stopPropagation();
                                                        copyToClipboard(log.url, `${i}-url`);
                                                    }}
                                                    title="Copy"
                                                >
                                                    {#if copiedKey === `${i}-url`}
                                                        <CheckIcon size={14} />
                                                    {:else}
                                                        <CopyIcon size={14} />
                                                    {/if}
                                                </button>
                                            </div>
                                            <pre class="request-log-code hljs text-sm">{log.url}</pre>
                                        </div>
                                        <div>
                                            <div class="mb-2 flex items-center justify-between">
                                                <span class="text-sm font-semibold text-textcolor">Request Body</span>
                                                <button
                                                    class="rounded p-1 transition-colors hover:bg-bgcolor {copiedKey === `${i}-body` ? 'text-green-500' : 'text-textcolor2 hover:text-textcolor'}"
                                                    onclick={(e) => {
                                                        e.stopPropagation();
                                                        copyToClipboard(log.body, `${i}-body`);
                                                    }}
                                                    title="Copy"
                                                >
                                                    {#if copiedKey === `${i}-body`}
                                                        <CheckIcon size={14} />
                                                    {:else}
                                                        <CopyIcon size={14} />
                                                    {/if}
                                                </button>
                                            </div>
                                            <pre class="request-log-code hljs">{@html highlightJson(log.body)}</pre>
                                        </div>
                                        <div>
                                            <div class="mb-2 flex items-center justify-between">
                                                <span class="text-sm font-semibold text-textcolor">Request Header</span>
                                                <button
                                                    class="rounded p-1 transition-colors hover:bg-bgcolor {copiedKey === `${i}-header` ? 'text-green-500' : 'text-textcolor2 hover:text-textcolor'}"
                                                    onclick={(e) => {
                                                        e.stopPropagation();
                                                        copyToClipboard(log.header, `${i}-header`);
                                                    }}
                                                    title="Copy"
                                                >
                                                    {#if copiedKey === `${i}-header`}
                                                        <CheckIcon size={14} />
                                                    {:else}
                                                        <CopyIcon size={14} />
                                                    {/if}
                                                </button>
                                            </div>
                                            <pre class="request-log-code hljs max-h-32">{@html highlightJson(log.header)}</pre>
                                        </div>
                                        <div>
                                            <div class="mb-2 flex items-center justify-between">
                                                <span class="text-sm font-semibold text-textcolor">Response</span>
                                                <button
                                                    class="rounded p-1 transition-colors hover:bg-bgcolor {copiedKey === `${i}-response` ? 'text-green-500' : 'text-textcolor2 hover:text-textcolor'}"
                                                    onclick={(e) => {
                                                        e.stopPropagation();
                                                        copyToClipboard(log.response, `${i}-response`);
                                                    }}
                                                    title="Copy"
                                                >
                                                    {#if copiedKey === `${i}-response`}
                                                        <CheckIcon size={14} />
                                                    {:else}
                                                        <CopyIcon size={14} />
                                                    {/if}
                                                </button>
                                            </div>
                                            <pre class="request-log-code hljs max-h-64">{@html highlightJson(log.response)}</pre>
                                        </div>
                                    </div>
                                </div>
                            {/if}
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
    </div>
</div>

<style>
    .request-log-code {
        background-color: #1a1a2e;
        color: #e0e0e0;
        border: 1px solid var(--risu-theme-darkborderc);
        border-radius: 0.375rem;
        padding: 0.75rem;
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        font-size: 0.75rem;
        line-height: 1.5;
        white-space: pre-wrap;
        word-break: break-all;
        max-height: 12rem;
        overflow: auto;
    }
</style>
