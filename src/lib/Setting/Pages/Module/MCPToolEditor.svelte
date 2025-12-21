<script lang="ts">
    import TextInput from "src/lib/UI/GUI/TextInput.svelte";
    import TextAreaInput from "src/lib/UI/GUI/TextAreaInput.svelte";
    import type { MCPToolDefinition } from "src/ts/process/modules";
    import { PlusIcon, TrashIcon, ChevronDownIcon, ChevronUpIcon, PlayIcon } from "lucide-svelte";

    interface Props {
        tools: MCPToolDefinition[];
    }

    let { tools = $bindable() }: Props = $props();
    let expandedIndex: number | null = $state(null);
    let schemaStrings: string[] = $state([]);
    let testInputs: string[] = $state([]);
    let testResults: string[] = $state([]);
    let testRunning: boolean[] = $state([]);

    async function testTool(index: number) {
        const tool = tools[index];
        if (!tool.handler) {
            testResults[index] = "Error: No handler code defined";
            return;
        }

        testRunning[index] = true;
        testResults[index] = "Running...";

        try {
            // Parse test input
            let args = {};
            if (testInputs[index]?.trim()) {
                try {
                    args = JSON.parse(testInputs[index]);
                } catch {
                    testResults[index] = "Error: Invalid JSON in test input";
                    testRunning[index] = false;
                    return;
                }
            }

            // Execute handler in sandboxed context
            const result = await executeHandler(tool.handler, args);
            testResults[index] = typeof result === 'string'
                ? result
                : JSON.stringify(result, null, 2);
        } catch (error) {
            testResults[index] = `Error: ${error instanceof Error ? error.message : String(error)}`;
        }

        testRunning[index] = false;
    }

    async function executeHandler(handler: string, args: any): Promise<any> {
        const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

        const safeContext = {
            console: {
                log: (...a: any[]) => console.log('[LocalMCP Test]', ...a),
                error: (...a: any[]) => console.error('[LocalMCP Test]', ...a),
                warn: (...a: any[]) => console.warn('[LocalMCP Test]', ...a),
            },
            JSON: JSON,
            Date: Date,
            Math: Math,
            parseInt: parseInt,
            parseFloat: parseFloat,
            isNaN: isNaN,
            isFinite: isFinite,
            encodeURIComponent: encodeURIComponent,
            decodeURIComponent: decodeURIComponent,
            encodeURI: encodeURI,
            decodeURI: decodeURI,
            btoa: btoa,
            atob: atob,
        };

        const wrappedHandler = `
            "use strict";
            return (async function(args, ctx) {
                const { console, JSON, Date, Math, parseInt, parseFloat, isNaN, isFinite,
                        encodeURIComponent, decodeURIComponent, encodeURI, decodeURI, btoa, atob } = ctx;
                ${handler}
            })(args, ctx);
        `;

        const fn = new AsyncFunction('args', 'ctx', wrappedHandler);
        return await fn(args, safeContext);
    }

    function addTool() {
        tools.push({
            name: 'new_tool',
            description: 'A new custom tool',
            inputSchema: {
                type: 'object',
                properties: {},
                required: []
            },
            handler: '// Available: args, console, JSON, Date, Math\n// Return your result\nreturn { success: true };'
        });
        schemaStrings.push(JSON.stringify(tools[tools.length - 1].inputSchema, null, 2));
        tools = tools;
        expandedIndex = tools.length - 1;
    }

    function removeTool(index: number, event: MouseEvent) {
        event.stopPropagation();
        tools.splice(index, 1);
        schemaStrings.splice(index, 1);
        tools = tools;
        if (expandedIndex === index) {
            expandedIndex = null;
        } else if (expandedIndex !== null && expandedIndex > index) {
            expandedIndex--;
        }
    }

    function toggleExpand(index: number) {
        expandedIndex = expandedIndex === index ? null : index;
        // Initialize schema string when expanding
        if (expandedIndex === index && !schemaStrings[index]) {
            schemaStrings[index] = JSON.stringify(tools[index].inputSchema, null, 2);
        }
    }

    function updateSchemaFromString(index: number) {
        try {
            tools[index].inputSchema = JSON.parse(schemaStrings[index]);
        } catch {
            // Keep existing schema if parsing fails
        }
    }

    // Initialize schema strings for existing tools
    $effect.pre(() => {
        if (schemaStrings.length !== tools.length) {
            schemaStrings = tools.map(t => {
                try {
                    return JSON.stringify(t.inputSchema, null, 2);
                } catch {
                    return '{}';
                }
            });
        }
    });
</script>

<div class="w-full">
    <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
            <h3 class="font-medium text-lg">MCP Tools</h3>
        </div>
        <button
            onclick={addTool}
            class="flex items-center gap-1 px-3 py-1 rounded-md bg-darkbutton hover:bg-selected text-textcolor2 hover:text-green-500 transition-colors"
        >
            <PlusIcon size={16} />
            <span>Add Tool</span>
        </button>
    </div>

    {#if tools.length === 0}
        <div class="text-textcolor2 text-center py-8 border border-dashed border-darkborderc rounded-md">
            <p>No tools defined yet.</p>
            <p class="text-sm mt-2">Click "Add Tool" to create your first custom MCP tool.</p>
        </div>
    {:else}
        <div class="space-y-2">
            {#each tools as tool, i}
                <div class="border border-selected rounded-md overflow-hidden">
                    <div
                        onclick={() => toggleExpand(i)}
                        onkeydown={(e) => e.key === 'Enter' && toggleExpand(i)}
                        role="button"
                        tabindex="0"
                        class="w-full flex items-center justify-between p-3 bg-darkbutton hover:bg-selected transition-colors cursor-pointer"
                    >
                        <div class="flex items-center gap-3">
                            <span class="font-mono text-sm bg-selected px-2 py-0.5 rounded">
                                {tool.name || 'unnamed'}
                            </span>
                            <span class="text-textcolor2 text-sm truncate max-w-[200px]">
                                {tool.description || 'No description'}
                            </span>
                        </div>
                        <div class="flex items-center gap-2">
                            <button
                                onclick={(e) => removeTool(i, e)}
                                class="p-1 text-textcolor2 hover:text-red-500 transition-colors"
                            >
                                <TrashIcon size={16} />
                            </button>
                            {#if expandedIndex === i}
                                <ChevronUpIcon size={20} />
                            {:else}
                                <ChevronDownIcon size={20} />
                            {/if}
                        </div>
                    </div>

                    {#if expandedIndex === i}
                        <div class="p-4 space-y-4 border-t border-darkborderc">
                            <div>
                                <label class="block text-sm font-medium mb-1">Tool Name</label>
                                <TextInput
                                    bind:value={tool.name}
                                    placeholder="my_tool_name"
                                    size="sm"
                                />
                                <p class="text-xs text-textcolor2 mt-1">Use snake_case, no spaces</p>
                            </div>

                            <div>
                                <label class="block text-sm font-medium mb-1">Description</label>
                                <TextInput
                                    bind:value={tool.description}
                                    placeholder="What does this tool do?"
                                    size="sm"
                                />
                                <p class="text-xs text-textcolor2 mt-1">LLM uses this to decide when to call the tool</p>
                            </div>

                            <div>
                                <label class="block text-sm font-medium mb-1">Input Schema (JSON)</label>
                                <TextAreaInput
                                    bind:value={schemaStrings[i]}
                                    onInput={() => updateSchemaFromString(i)}
                                    placeholder={'{"type": "object", "properties": {}}'}
                                    size="sm"
                                />
                                <p class="text-xs text-textcolor2 mt-1">JSON Schema defining the tool's parameters</p>
                            </div>

                            <div>
                                <label class="block text-sm font-medium mb-1">Handler Code (JavaScript)</label>
                                <TextAreaInput
                                    bind:value={tool.handler}
                                    placeholder={"// Your code here\nreturn { result: 'success' };"}
                                    size="lg"
                                />
                                <p class="text-xs text-textcolor2 mt-1">
                                    Available: <code class="bg-selected px-1 rounded">args</code>,
                                    <code class="bg-selected px-1 rounded">console</code>,
                                    <code class="bg-selected px-1 rounded">JSON</code>,
                                    <code class="bg-selected px-1 rounded">Date</code>,
                                    <code class="bg-selected px-1 rounded">Math</code>
                                </p>
                            </div>

                            <div class="border-t border-darkborderc pt-4">
                                <label class="block text-sm font-medium mb-1">Test Tool</label>
                                <div class="flex gap-2">
                                    <div class="flex-1">
                                        <TextInput
                                            bind:value={testInputs[i]}
                                            placeholder={'{"arg1": "value1"}'}
                                            size="sm"
                                        />
                                    </div>
                                    <button
                                        onclick={() => testTool(i)}
                                        disabled={testRunning[i]}
                                        class="flex items-center gap-1 px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white transition-colors"
                                    >
                                        <PlayIcon size={14} />
                                        <span>{testRunning[i] ? 'Running...' : 'Test'}</span>
                                    </button>
                                </div>
                                <p class="text-xs text-textcolor2 mt-1">Enter test arguments as JSON</p>

                                {#if testResults[i]}
                                    <div class="mt-2 p-2 rounded text-sm font-mono whitespace-pre-wrap overflow-x-auto {testResults[i]?.startsWith('Error') ? 'bg-red-900/30 text-red-300' : 'bg-green-900/30 text-green-300'}">
                                        {testResults[i]}
                                    </div>
                                {/if}
                            </div>
                        </div>
                    {/if}
                </div>
            {/each}
        </div>
    {/if}

    <div class="mt-4 p-3 bg-darkbutton rounded-md text-sm text-textcolor2">
        <p class="font-medium mb-1">Example Tool Handler:</p>
        <pre class="bg-selected p-2 rounded text-xs overflow-x-auto">{`// Get current time tool
const now = new Date();
return {
  date: now.toLocaleDateString(),
  time: now.toLocaleTimeString(),
  timestamp: now.getTime()
}`}</pre>
    </div>
</div>
