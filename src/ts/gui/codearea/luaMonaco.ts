import * as monaco from 'monaco-editor';

interface LuaCompletionDefinition {
    label: string;
    insertText?: string;
    detail?: string;
    documentation?: string;
    kind?: monaco.languages.CompletionItemKind;
    snippet?: boolean;
}

const moduleKind = monaco.languages.CompletionItemKind.Module;
const functionKind = monaco.languages.CompletionItemKind.Function;
const constantKind = monaco.languages.CompletionItemKind.Constant;

function luaFunction(
    label: string,
    parameters: string[] = [],
    documentation?: string,
): LuaCompletionDefinition {
    const placeholders = parameters.map(
        (parameter, index) => `\${${index + 1}:${parameter}}`,
    );

    return {
        label,
        insertText: `${label}(${placeholders.join(', ')})`,
        detail: `${label}(${parameters.join(', ')})`,
        documentation,
        kind: functionKind,
        snippet: true,
    };
}

function luaConstant(
    label: string,
    detail?: string,
): LuaCompletionDefinition {
    return {
        label,
        detail,
        kind: constantKind,
    };
}

const globalCompletions: LuaCompletionDefinition[] = [
    luaFunction('assert', ['value', 'message?']),
    luaFunction('collectgarbage', ['option?', 'argument?']),
    luaFunction('dofile', ['filename?']),
    luaFunction('error', ['message', 'level?']),
    luaFunction('getmetatable', ['object']),
    luaFunction('ipairs', ['table']),
    luaFunction('load', ['chunk', 'chunkname?', 'mode?', 'environment?']),
    luaFunction('loadfile', ['filename?', 'mode?', 'environment?']),
    luaFunction('next', ['table', 'index?']),
    luaFunction('pairs', ['table']),
    luaFunction('pcall', ['function', 'arguments...']),
    luaFunction('print', ['values...']),
    luaFunction('rawequal', ['value1', 'value2']),
    luaFunction('rawget', ['table', 'index']),
    luaFunction('rawlen', ['value']),
    luaFunction('rawset', ['table', 'index', 'value']),
    luaFunction('require', ['moduleName']),
    luaFunction('select', ['index', 'values...']),
    luaFunction('setmetatable', ['table', 'metatable']),
    luaFunction('tonumber', ['value', 'base?']),
    luaFunction('tostring', ['value']),
    luaFunction('type', ['value']),
    luaFunction('warn', ['messages...']),
    luaFunction('xpcall', ['function', 'messageHandler', 'arguments...']),
    luaConstant('_G', 'Global environment table'),
    luaConstant('_VERSION', 'Lua version string'),
    ...[
        'coroutine',
        'debug',
        'io',
        'math',
        'os',
        'package',
        'string',
        'table',
        'utf8',
        'json',
    ].map((label) => ({
        label,
        detail: label === 'json' ? 'Bundled JSON module' : `Lua ${label} module`,
        kind: moduleKind,
    })),
];

const moduleCompletions: Record<string, LuaCompletionDefinition[]> = {
    coroutine: [
        luaFunction('close', ['coroutine']),
        luaFunction('create', ['function']),
        luaFunction('isyieldable', ['coroutine?']),
        luaFunction('resume', ['coroutine', 'values...']),
        luaFunction('running'),
        luaFunction('status', ['coroutine']),
        luaFunction('wrap', ['function']),
        luaFunction('yield', ['values...']),
    ],
    debug: [
        luaFunction('debug'),
        luaFunction('gethook', ['thread?']),
        luaFunction('getinfo', ['thread?', 'functionOrLevel', 'what?']),
        luaFunction('getlocal', ['thread?', 'functionOrLevel', 'localIndex']),
        luaFunction('getmetatable', ['value']),
        luaFunction('getregistry'),
        luaFunction('getupvalue', ['function', 'upvalueIndex']),
        luaFunction('getuservalue', ['userdata', 'index?']),
        luaFunction('sethook', ['thread?', 'hook?', 'mask?', 'count?']),
        luaFunction('setlocal', ['thread?', 'level', 'localIndex', 'value']),
        luaFunction('setmetatable', ['value', 'metatable']),
        luaFunction('setupvalue', ['function', 'upvalueIndex', 'value']),
        luaFunction('setuservalue', ['userdata', 'value', 'index?']),
        luaFunction('traceback', ['thread?', 'message?', 'level?']),
        luaFunction('upvalueid', ['function', 'upvalueIndex']),
        luaFunction('upvaluejoin', ['function1', 'index1', 'function2', 'index2']),
    ],
    io: [
        luaFunction('close', ['file?']),
        luaFunction('flush'),
        luaFunction('input', ['file?']),
        luaFunction('lines', ['filename?', 'formats...']),
        luaFunction('open', ['filename', 'mode?']),
        luaFunction('output', ['file?']),
        luaFunction('popen', ['program', 'mode?']),
        luaFunction('read', ['formats...']),
        luaFunction('tmpfile'),
        luaFunction('type', ['object']),
        luaFunction('write', ['values...']),
        luaConstant('stdin'),
        luaConstant('stdout'),
        luaConstant('stderr'),
    ],
    math: [
        ...[
            'abs',
            'acos',
            'asin',
            'ceil',
            'cos',
            'deg',
            'exp',
            'floor',
            'rad',
            'sin',
            'sqrt',
            'tan',
            'tointeger',
            'type',
        ].map((name) => luaFunction(name, ['x'])),
        luaFunction('atan', ['y', 'x?']),
        luaFunction('fmod', ['x', 'y']),
        luaFunction('log', ['x', 'base?']),
        luaFunction('max', ['values...']),
        luaFunction('min', ['values...']),
        luaFunction('modf', ['x']),
        luaFunction('random', ['lower?', 'upper?']),
        luaFunction('randomseed', ['x?', 'y?']),
        luaFunction('ult', ['m', 'n']),
        luaConstant('huge'),
        luaConstant('maxinteger'),
        luaConstant('mininteger'),
        luaConstant('pi'),
    ],
    os: [
        luaFunction('clock'),
        luaFunction('date', ['format?', 'time?']),
        luaFunction('difftime', ['time2', 'time1']),
        luaFunction('execute', ['command?']),
        luaFunction('exit', ['close?', 'closeState?']),
        luaFunction('getenv', ['variable']),
        luaFunction('remove', ['filename']),
        luaFunction('rename', ['oldName', 'newName']),
        luaFunction('setlocale', ['locale?', 'category?']),
        luaFunction('time', ['table?']),
        luaFunction('tmpname'),
    ],
    package: [
        luaFunction('loadlib', ['libraryPath', 'initializationFunction']),
        luaFunction('searchpath', ['name', 'path', 'separator?', 'directorySeparator?']),
        luaConstant('config'),
        luaConstant('cpath'),
        luaConstant('loaded'),
        luaConstant('path'),
        luaConstant('preload'),
        luaConstant('searchers'),
    ],
    string: [
        luaFunction('byte', ['string', 'start?', 'end?']),
        luaFunction('char', ['bytes...']),
        luaFunction('dump', ['function', 'strip?']),
        luaFunction('find', ['string', 'pattern', 'start?', 'plain?']),
        luaFunction('format', ['format', 'values...']),
        luaFunction('gmatch', ['string', 'pattern', 'start?']),
        luaFunction('gsub', ['string', 'pattern', 'replacement', 'limit?']),
        luaFunction('len', ['string']),
        luaFunction('lower', ['string']),
        luaFunction('match', ['string', 'pattern', 'start?']),
        luaFunction('pack', ['format', 'values...']),
        luaFunction('packsize', ['format']),
        luaFunction('rep', ['string', 'count', 'separator?']),
        luaFunction('reverse', ['string']),
        luaFunction('sub', ['string', 'start', 'end?']),
        luaFunction('unpack', ['format', 'string', 'position?']),
        luaFunction('upper', ['string']),
    ],
    table: [
        luaFunction('concat', ['list', 'separator?', 'start?', 'end?']),
        luaFunction('insert', ['list', 'position?', 'value']),
        luaFunction('move', ['source', 'from', 'to', 'targetIndex', 'target?']),
        luaFunction('pack', ['values...']),
        luaFunction('remove', ['list', 'position?']),
        luaFunction('sort', ['list', 'comparison?']),
        luaFunction('unpack', ['list', 'start?', 'end?']),
    ],
    utf8: [
        luaFunction('char', ['codepoints...']),
        luaFunction('codes', ['string', 'lax?']),
        luaFunction('codepoint', ['string', 'start?', 'end?', 'lax?']),
        luaFunction('len', ['string', 'start?', 'end?', 'lax?']),
        luaFunction('offset', ['string', 'count', 'position?']),
        luaConstant('charpattern'),
    ],
    json: [
        luaFunction(
            'encode',
            ['value'],
            'Encodes a Lua value as JSON using public/lua/json.lua.',
        ),
        luaFunction(
            'decode',
            ['string'],
            'Decodes JSON into a Lua value using public/lua/json.lua.',
        ),
        luaConstant('_version', 'Bundled JSON module version'),
    ],
};

let registered = false;

function toCompletionItem(
    definition: LuaCompletionDefinition,
    range: monaco.IRange,
): monaco.languages.CompletionItem {
    return {
        label: definition.label,
        insertText: definition.insertText ?? definition.label,
        detail: definition.detail,
        documentation: definition.documentation,
        kind: definition.kind ?? functionKind,
        insertTextRules: definition.snippet
            ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
            : undefined,
        range,
    };
}

export function registerLuaMonaco() {
    if (registered) {
        return;
    }
    registered = true;

    monaco.languages.registerCompletionItemProvider('lua', {
        triggerCharacters: ['.', ':'],
        provideCompletionItems(model, position) {
            const word = model.getWordUntilPosition(position);
            const range = new monaco.Range(
                position.lineNumber,
                word.startColumn,
                position.lineNumber,
                word.endColumn,
            );
            const linePrefix = model
                .getLineContent(position.lineNumber)
                .slice(0, position.column - 1);
            const memberMatch = linePrefix.match(
                /([A-Za-z_][A-Za-z0-9_]*)[.:][A-Za-z0-9_]*$/,
            );
            const definitions = memberMatch
                ? (moduleCompletions[memberMatch[1]] ?? [])
                : globalCompletions;

            return {
                suggestions: definitions.map((definition) =>
                    toCompletionItem(definition, range),
                ),
            };
        },
    });
}
