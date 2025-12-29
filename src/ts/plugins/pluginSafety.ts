import { hasher } from '../parser.svelte';

export interface CheckResult {
    isSafe: boolean;
    errors: PluginSafetyErrors[];
    checkerVersion: number;
    modifiedCode: string;
}

type DangerousNodeType = 'CallExpression' | 'NewExpression' | 'Identifier' | 'ThisExpression';
type UserFriendlyRuleAlertKey = 'eval' | 'globalAccess' | 'thisOutsideClass' | 'errorInVerification' | 'storageAccess';

interface BlacklistRule {
    nodeType: DangerousNodeType;
    identifierName?: string;
    message: string;
    userAlertKey: UserFriendlyRuleAlertKey;
}

const SAFETY_BLACKLIST: BlacklistRule[] = [
    {
        nodeType: 'CallExpression',
        identifierName: 'eval',
        message: 'Usage of "eval()" is forbidden.',
        userAlertKey: 'eval'
    },
    {
        nodeType: 'NewExpression',
        identifierName: 'Function',
        message: 'Usage of "new Function()" is forbidden.',
        userAlertKey: 'eval'
    },
    {
        nodeType: 'Identifier',
        identifierName: 'sessionStorage',
        message: 'Access to "sessionStorage" is forbidden.',
        userAlertKey: 'storageAccess'
    },
    {
        nodeType: 'Identifier',
        identifierName: 'cookieStore',
        message: 'Access to "cookieStore" is forbidden.',
        userAlertKey: 'storageAccess'
    }
];

export type PluginSafetyErrors = {
    message: string; //message for developers
    userAlertKey: UserFriendlyRuleAlertKey; //key for user-friendly alert messages
}


// Increment this version if the safety rules change to invalidate the cache
const checkerVersion = 3;
export async function checkCodeSafety(code: string): Promise<CheckResult> {
    const errors: PluginSafetyErrors[] = [];

    const hashedCode = await hasher(new TextEncoder().encode(code));
    const cacheKey = `safety-${hashedCode}`;
    const cachedResult = localStorage.getItem(cacheKey);
    if (cachedResult) {
        const got =  JSON.parse(cachedResult) as CheckResult;
        if (got.checkerVersion === checkerVersion) {
            return got;
        }
    }

    try {
        const [acorn, walk] = await Promise.all([
            import('acorn'),
            import('acorn-walk')
        ]);

        const ast = acorn.parse(code, { ecmaVersion: 'latest' });

        walk.ancestor(ast, {

            CallExpression(node) {
                if (node.callee?.type === 'Identifier') {
                    validateNode(node, 'CallExpression', node.callee.name, errors);
                }
            },
            NewExpression(node) {
                if (node.callee?.type === 'Identifier') {
                    validateNode(node, 'NewExpression', node.callee.name, errors);
                }
            },

            Identifier(node, state, ancestors:any[]) {
                const name = node.name;

                switch (name) {
                    case 'window':
                    case 'global':
                    case 'globalThis':
                    case 'self':
                    case 'top':
                    case 'parent':
                    case 'frames':
                        node.name = 'safeGlobalThis';
                        return;
                    case 'localStorage':
                        node.name = 'safeLocalStorage';
                        return;
                    case 'indexedDB':
                        node.name = 'safeIdbFactory';
                        return;
                    case 'document':
                        node.name = 'safeDocument';
                        return;
                    case 'Function':
                        node.name = 'SafeFunction';
                        return;
                    case 'prototype':
                        node.name = 'safePrototype';
                        return;
                    case 'ownerDocument':
                        node.name = 'safeOwnerDocument';
                        return;
                    case 'constructor':
                        node.name = 'safeConstructor';
                        return;
                }
                const isTarget = SAFETY_BLACKLIST.some(r => r.nodeType === 'Identifier' && r.identifierName === name);
                if (!isTarget) return;

                validateNode(node, 'Identifier', name, errors);
            }
        });

        const {generate} = await import('astring');
        const modifiedCode = generate(ast);
        code = modifiedCode;

    } catch (err) {
        // Handles syntax errors or import errors
        return {
            isSafe: false,
            errors: [{
                message: `Error during code verification: ${(err as Error).message}`,
                userAlertKey: 'errorInVerification'
            }],
            checkerVersion,
            modifiedCode: code
        };
    }

    localStorage.setItem(cacheKey, JSON.stringify({ isSafe: errors.length === 0, errors, checkerVersion, modifiedCode:code }));
    return { isSafe: errors.length === 0, errors, checkerVersion, modifiedCode: code};
}

function validateNode(node: any, type: DangerousNodeType, name: string | undefined, errors: PluginSafetyErrors[]) {
    const rule = SAFETY_BLACKLIST.find(r => r.nodeType === type && r.identifierName === name);
    if (rule) {
        errors.push({
            message: rule.message,
            userAlertKey: rule.userAlertKey
        });
    }
}
