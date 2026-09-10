<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import * as monaco from 'monaco-editor';
    import { registerCBSMonaco } from 'src/ts/gui/codearea/cbsMonaco';
    import { registerLuaMonaco } from 'src/ts/gui/codearea/luaMonaco';
    import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
    import CssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
    import HtmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
    import TypeScriptWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
    import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';

    // Set up workers once globally
    if (!('MonacoEnvironment' in self)) {
        (self as any).MonacoEnvironment = {
            getWorker(_: string, label: string) {
                switch (label) {
                    case 'json':
                        return new JsonWorker();
                    case 'css':
                    case 'scss':
                    case 'less':
                        return new CssWorker();
                    case 'html':
                    case 'handlebars':
                    case 'razor':
                        return new HtmlWorker();
                    case 'typescript':
                    case 'javascript':
                        return new TypeScriptWorker();
                    default:
                        return new EditorWorker();
                }
            }
        };
    }


    registerCBSMonaco()
    registerLuaMonaco()

    interface Props {
        value: string;
        language?: string;
        theme?: string;
        readonly?: boolean;
        onchange?: (value: string) => void;
    }

    let {
        value = $bindable(''),
        language = 'markdown',
        theme = 'vs-dark',
        readonly = false,
        onchange,
    }: Props = $props();

    let container: HTMLDivElement;
    let editor: monaco.editor.IStandaloneCodeEditor;

    onMount(() => {
        editor = monaco.editor.create(container, {
            value,
            language,
            theme,
            readOnly: readonly,
            automaticLayout: true,
            minimap: { enabled: false },
            wordWrap: 'on',
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
            padding: { top: 8, bottom: 8 },
            renderLineHighlight: 'gutter',
            overviewRulerBorder: false,
            scrollbar: {
                verticalScrollbarSize: 6,
                horizontalScrollbarSize: 6,
            },
        });

        editor.onDidChangeModelContent(() => {
            const newValue = editor.getValue();
            value = newValue;
            onchange?.(newValue);
        });

        return () => {
            editor?.dispose();
        };
    });

    onDestroy(() => {
        editor?.dispose();
    });

    // Sync external value changes into editor without triggering onDidChangeModelContent loop
    $effect(() => {
        if (editor && editor.getValue() !== value) {
            const model = editor.getModel();
            if (model) {
                model.pushEditOperations(
                    [],
                    [{ range: model.getFullModelRange(), text: value }],
                    () => null
                );
            }
        }
    });
</script>

<div bind:this={container} class="w-full h-full"></div>
