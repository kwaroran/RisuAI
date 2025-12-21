/**
 * Example MCP Tool Definitions
 *
 * These examples show how to define custom MCP tools for RisuAI modules.
 * Tools can be added via the Module Settings > MCP Tools tab.
 */

import type { MCPToolDefinition } from "../modules";

/**
 * Example 1: Get Current Time
 * A simple tool that returns the current date and time.
 */
export const getCurrentTimeTool: MCPToolDefinition = {
    name: "get_current_time",
    description: "Get the current date and time in the user's timezone",
    inputSchema: {
        type: "object",
        properties: {},
        required: []
    },
    handler: `
const now = new Date();
return {
    date: now.toLocaleDateString(),
    time: now.toLocaleTimeString(),
    timestamp: now.getTime(),
    iso: now.toISOString()
};
`
};

/**
 * Example 2: Calculator
 * A tool that performs basic math operations.
 */
export const calculatorTool: MCPToolDefinition = {
    name: "calculator",
    description: "Perform basic math operations (add, subtract, multiply, divide)",
    inputSchema: {
        type: "object",
        properties: {
            operation: {
                type: "string",
                enum: ["add", "subtract", "multiply", "divide"],
                description: "The math operation to perform"
            },
            a: {
                type: "number",
                description: "First number"
            },
            b: {
                type: "number",
                description: "Second number"
            }
        },
        required: ["operation", "a", "b"]
    },
    handler: `
const { operation, a, b } = args;

switch (operation) {
    case "add":
        return { result: a + b };
    case "subtract":
        return { result: a - b };
    case "multiply":
        return { result: a * b };
    case "divide":
        if (b === 0) return { error: "Cannot divide by zero" };
        return { result: a / b };
    default:
        return { error: "Unknown operation" };
}
`
};

/**
 * Example 3: Random Number Generator
 * A tool that generates random numbers within a range.
 */
export const randomNumberTool: MCPToolDefinition = {
    name: "random_number",
    description: "Generate a random number between min and max (inclusive)",
    inputSchema: {
        type: "object",
        properties: {
            min: {
                type: "number",
                description: "Minimum value (default: 0)"
            },
            max: {
                type: "number",
                description: "Maximum value (default: 100)"
            }
        },
        required: []
    },
    handler: `
const min = args.min ?? 0;
const max = args.max ?? 100;
const result = Math.floor(Math.random() * (max - min + 1)) + min;
return { result, min, max };
`
};

/**
 * Example 4: Dice Roller
 * A tool for rolling dice (useful for RPG scenarios).
 */
export const diceRollerTool: MCPToolDefinition = {
    name: "roll_dice",
    description: "Roll dice in standard notation (e.g., 2d6, 1d20+5)",
    inputSchema: {
        type: "object",
        properties: {
            count: {
                type: "number",
                description: "Number of dice to roll"
            },
            sides: {
                type: "number",
                description: "Number of sides on each die"
            },
            modifier: {
                type: "number",
                description: "Modifier to add to the total (optional)"
            }
        },
        required: ["count", "sides"]
    },
    handler: `
const { count, sides, modifier = 0 } = args;
const rolls = [];

for (let i = 0; i < count; i++) {
    rolls.push(Math.floor(Math.random() * sides) + 1);
}

const subtotal = rolls.reduce((a, b) => a + b, 0);
const total = subtotal + modifier;

return {
    notation: count + "d" + sides + (modifier !== 0 ? (modifier > 0 ? "+" : "") + modifier : ""),
    rolls: rolls,
    subtotal: subtotal,
    modifier: modifier,
    total: total
};
`
};

/**
 * Example 5: Text Utilities
 * A tool for common text transformations.
 */
export const textUtilsTool: MCPToolDefinition = {
    name: "text_transform",
    description: "Transform text (uppercase, lowercase, reverse, count words/chars)",
    inputSchema: {
        type: "object",
        properties: {
            text: {
                type: "string",
                description: "The text to transform"
            },
            operation: {
                type: "string",
                enum: ["uppercase", "lowercase", "reverse", "count"],
                description: "The transformation to apply"
            }
        },
        required: ["text", "operation"]
    },
    handler: `
const { text, operation } = args;

switch (operation) {
    case "uppercase":
        return { result: text.toUpperCase() };
    case "lowercase":
        return { result: text.toLowerCase() };
    case "reverse":
        return { result: text.split("").reverse().join("") };
    case "count":
        return {
            characters: text.length,
            words: text.trim().split(/\\s+/).filter(w => w).length,
            lines: text.split("\\n").length
        };
    default:
        return { error: "Unknown operation" };
}
`
};

/**
 * Example 6: JSON Formatter
 * A tool for formatting and validating JSON.
 */
export const jsonFormatterTool: MCPToolDefinition = {
    name: "format_json",
    description: "Format, minify, or validate JSON strings",
    inputSchema: {
        type: "object",
        properties: {
            json: {
                type: "string",
                description: "The JSON string to process"
            },
            operation: {
                type: "string",
                enum: ["format", "minify", "validate"],
                description: "The operation to perform"
            },
            indent: {
                type: "number",
                description: "Number of spaces for indentation (default: 2)"
            }
        },
        required: ["json", "operation"]
    },
    handler: `
const { json, operation, indent = 2 } = args;

try {
    const parsed = JSON.parse(json);

    switch (operation) {
        case "format":
            return { result: JSON.stringify(parsed, null, indent) };
        case "minify":
            return { result: JSON.stringify(parsed) };
        case "validate":
            return { valid: true, type: Array.isArray(parsed) ? "array" : typeof parsed };
        default:
            return { error: "Unknown operation" };
    }
} catch (e) {
    return { valid: false, error: "Invalid JSON: " + e.message };
}
`
};

/**
 * All example tools for easy import
 */
export const exampleTools: MCPToolDefinition[] = [
    getCurrentTimeTool,
    calculatorTool,
    randomNumberTool,
    diceRollerTool,
    textUtilsTool,
    jsonFormatterTool
];
