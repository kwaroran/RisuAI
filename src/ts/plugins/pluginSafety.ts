import { hasher } from '../parser.svelte';

export interface CheckResult {
    isSafe: boolean;
    errors: PluginSafetyErrors[];
    checkerVersion: number;
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
        identifierName: 'Function',
        message: 'Usage of "new Function()" is forbidden.',
        userAlertKey: 'eval'
    },

    {
        nodeType: 'Identifier',
        identifierName: 'localStorage',
        message: 'Access to "localStorage" is forbidden.',
        userAlertKey: 'storageAccess'
    },
    {
        nodeType: 'Identifier',
        identifierName: 'sessionStorage',
        message: 'Access to "sessionStorage" is forbidden.',
        userAlertKey: 'storageAccess'
    },
    {
        nodeType: 'Identifier',
        identifierName: 'indexedDB',
        message: 'Access to "indexedDB" is forbidden.',
        userAlertKey: 'storageAccess'
    },
    {
        nodeType: 'Identifier',
        identifierName: 'cookieStore',
        message: 'Access to "cookieStore" is forbidden.',
        userAlertKey: 'storageAccess'
    },
    {
        nodeType: 'Identifier',
        identifierName: 'window',
        message: 'Access to "window" is forbidden.',
        userAlertKey: 'globalAccess'
    },
    {
        nodeType: 'Identifier',
        identifierName: 'global',
        message: 'Access to "global" is forbidden.',
        userAlertKey: 'globalAccess'
    },
    {
        nodeType: 'Identifier',
        identifierName: 'globalThis',
        message: 'Access to "globalThis" is forbidden.',
        userAlertKey: 'globalAccess'
    }
];

export type PluginSafetyErrors = {
    message: string; //message for developers
    userAlertKey: UserFriendlyRuleAlertKey; //key for user-friendly alert messages
}


// Increment this version if the safety rules change to invalidate the cache
const checkerVersion = 1;
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

        const ast = acorn.parse(code, { ecmaVersion: 2020 });

        walk.ancestor(ast, {

            CallExpression(node: any) {
                if (node.callee?.type === 'Identifier') {
                    validateNode(node, 'CallExpression', node.callee.name, errors);
                }
            },

            NewExpression(node: any) {
                if (node.callee?.type === 'Identifier') {
                    validateNode(node, 'NewExpression', node.callee.name, errors);
                }
            },

            ThisExpression(node: any, ancestors: any[]) {
                const isInsideClass = ancestors.some((a) => a.type === 'ClassBody');

                if (!isInsideClass) {
                    errors.push({
                        message: 'Usage of "this" outside of class context is forbidden.',
                        userAlertKey: 'thisOutsideClass'
                    });
                }
            },

            Identifier(node: any, ancestors: any[]) {
                const name = node.name;

                const isTarget = SAFETY_BLACKLIST.some(r => r.nodeType === 'Identifier' && r.identifierName === name);
                if (!isTarget) return;

                const parent = ancestors[ancestors.length - 2];
                if (parent) {
                    if (parent.type === 'MemberExpression' && parent.property === node && !parent.computed) return;
                    if (parent.type === 'Property' && parent.key === node) return;
                }

                validateNode(node, 'Identifier', name, errors);
            }
        });

    } catch (err) {
        // Handles syntax errors or import errors
        return {
            isSafe: false,
            errors: [{
                message: `Error during code verification: ${(err as Error).message}`,
                userAlertKey: 'errorInVerification'
            }],
            checkerVersion
        };
    }

    localStorage.setItem(cacheKey, JSON.stringify({ isSafe: errors.length === 0, errors, checkerVersion }));
    return { isSafe: errors.length === 0, errors, checkerVersion };
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
