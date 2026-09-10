export type AlertSeverity = 'info' | 'success' | 'warning' | 'error' | 'neutral';

export type AlertSurface = 'modal' | 'toast' | 'inline' | 'dialog';

export type LegacyAlertType =
    | 'error'
    | 'normal'
    | 'none'
    | 'ask'
    | 'wait'
    | 'selectChar'
    | 'input'
    | 'toast'
    | 'wait2'
    | 'markdown'
    | 'select'
    | 'login'
    | 'tos'
    | 'cardexport'
    | 'requestdata'
    | 'addchar'
    | 'hypaV2'
    | 'selectModule'
    | 'chatOptions'
    | 'pukmakkurit'
    | 'branches'
    | 'progress'
    | 'pluginconfirm'
    | 'requestlogs';

export interface StandardAlertDescriptor {
    severity: AlertSeverity;
    surface: AlertSurface;
    blocking: boolean;
    dismissible: boolean;
    autoDismiss: boolean;
}

const dialogAlertTypes = new Set<LegacyAlertType>([
    'cardexport',
    'selectModule',
    'pukmakkurit',
    'branches',
    'requestlogs',
]);

export function getAlertDescriptor(type: LegacyAlertType): StandardAlertDescriptor {
    if (type === 'toast') {
        return {
            severity: 'neutral',
            surface: 'toast',
            blocking: false,
            dismissible: false,
            autoDismiss: true,
        };
    }

    if (dialogAlertTypes.has(type)) {
        return {
            severity: type === 'requestlogs' ? 'info' : 'neutral',
            surface: 'dialog',
            blocking: true,
            dismissible: true,
            autoDismiss: false,
        };
    }

    return {
        severity: getLegacyAlertSeverity(type),
        surface: 'modal',
        blocking: type !== 'none',
        dismissible: type !== 'wait' && type !== 'wait2' && type !== 'progress',
        autoDismiss: false,
    };
}

export function getLegacyAlertSeverity(type: LegacyAlertType): AlertSeverity {
    switch (type) {
        case 'error':
            return 'error';
        case 'ask':
        case 'pluginconfirm':
        case 'tos':
            return 'warning';
        case 'progress':
        case 'wait':
        case 'wait2':
        case 'login':
        case 'select':
        case 'selectChar':
        case 'input':
            return 'info';
        case 'normal':
        case 'markdown':
            return 'neutral';
        default:
            return 'neutral';
    }
}
