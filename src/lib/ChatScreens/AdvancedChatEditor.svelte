<script>
    import { onMount, createEventDispatcher } from 'svelte';
    import { SquarePenIcon, LanguagesIcon } from "@lucide/svelte";
    
    import { DBState } from 'src/ts/stores.svelte';
    import CodeMirror from 'codemirror';
    import 'codemirror/lib/codemirror.css';

    /** @type {{value: any, translate: any}} */
    let { value = $bindable(), translate = $bindable() } = $props();

    const dispatch = createEventDispatcher();
    let toggleTranslate = $state(!DBState.db.useAutoTranslateInput);
    let velement = $state(), veditor = $state();
    let telement = $state(), teditor = $state();
    let _value = $state(value);
    let _translate = $state(translate);

    const markdowns = [
        {
            regex: /["“”](.*?)(["“”]|$)/gs,
            className: "ci-quote",
        },
        {
            regex: /`([^`]+)`/gs,
            className: "ci-backtick",
        },
        {
            regex: /\*\*\*([^*]+)(\*\*\*|$)/gs,
            className: "ci-asterisk3",
        },
        {
            regex: /(?<!\*)\*\*([^*]+)(\*\*(?!\*)|$)/gs,
            className: "ci-asterisk2",
        },
        {
            regex: /(?<!\*)\*([^*]+)(\*(?!\*)|$)/gs,
            className: "ci-asterisk1",
        },
    ];

    onMount(() => {
        veditor = initEditor(velement, value);
        teditor = initEditor(telement, translate);
        veditor.on('change', (_, evt) => {
            if(evt.origin != 'setValue' && !toggleTranslate) {
                const input = veditor.getValue('\r\n');
                if(input != value) {
                    value = _value = input;
                    dispatch('change', { translate: false, value: input });
                }
            }
        });
        teditor.on('change', (_, evt) => {
            if(evt.origin != 'setValue' && toggleTranslate) {
                const input = teditor.getValue('\r\n');
                if(input != translate) {
                    translate = _translate = input;
                    dispatch('change', { translate: true, value: input });
                }
            }
        });
        toggleTranslateText();
    });

    $effect.pre(() => {
        if(value != _value) {
            veditor.setValue(_value = value);
        }
    });
    $effect.pre(() => {
        if(translate != _translate) {
            teditor.setValue(_translate = translate);
        }
    });

    function toggleTranslateText() {
        toggleTranslate = !toggleTranslate;
        if(toggleTranslate) {
            velement.style.display = "none";
            telement.style.display = null;
            teditor.refresh();
        } else {
            velement.style.display = null;
            telement.style.display = "none";
            veditor.refresh();
        }
    }

    function initEditor(element, value) {
        const editor = CodeMirror(element, {
            lineNumbers: true,
            value: value,
        });
        editor.on('change', (sender) => updateMarks(sender.doc));
        return editor;   
    }

    function updateMarks(doc) {
        const text = doc.getValue();
        for (const mark of doc.getAllMarks()) {
            mark.clear();
        }
        for(const markdown of markdowns) {
            for (const match of text.matchAll(markdown.regex)) {
                const start = doc.posFromIndex(match.index);
                const end = doc.posFromIndex(match.index + match[0].length);
                doc.markText(start, end, { className: markdown.className });
            }
        }
    }
</script>

<div class="flex flex-1 items-end ml-2 mr-2">
    {#if DBState.db.useAutoTranslateInput}
        <button 
            onclick={toggleTranslateText}
            class="mr-2 bg-textcolor2 flex justify-center items-center text-gray-100 w-12 h-12 rounded-md hover:bg-green-500 transition-colors">
        {#if toggleTranslate}
            <LanguagesIcon />
        {:else}
            <SquarePenIcon />
        {/if}
        </button>
    {/if}
    <div class="flex-1">
        <div class="chatEditor" bind:this={velement}></div>
        <div class="chatEditor" hidden bind:this={telement}></div>
    </div>
</div>
<style>
    .chatEditor {
        display: table;
        table-layout: fixed;
        width: 100%;
    }
    .chatEditor :global(.CodeMirror) {
        min-height: 2em;
        height: auto;
        background-color: var(--risu-theme-bgcolor);
        color: #DD0;
    }
    .chatEditor :global(.CodeMirror:focus-within) {
        background-color: var(--risu-theme-textcolor2);
    }
    .chatEditor :global(.CodeMirror-gutters) {
        background-color: var(--risu-theme-selected);
        border-left-color: var(--risu-theme-borderc);
    }
    .chatEditor :global(.ci-quote) {
        color: #FFF;
    }
    .chatEditor :global(.ci-backtick) {
        color: #6AC;
    }
    .chatEditor :global(.ci-asterisk3) {
        font-weight: bold;
        font-style: italic;
        color: #E22;
    }
    .chatEditor :global(.ci-asterisk2) {
        font-style: italic;
        color: #E84;
    }
    .chatEditor :global(.ci-asterisk1) {
        font-style: italic;
        color: #990;
    }
</style>