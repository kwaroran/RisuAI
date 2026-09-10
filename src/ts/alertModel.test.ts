import { describe, expect, it } from 'vitest';
import { getAlertDescriptor, getLegacyAlertSeverity } from './alertModel';

describe('getLegacyAlertSeverity', () => {
    it('maps legacy alert types to standard severity values', () => {
        expect(getLegacyAlertSeverity('error')).toBe('error');
        expect(getLegacyAlertSeverity('ask')).toBe('warning');
        expect(getLegacyAlertSeverity('pluginconfirm')).toBe('warning');
        expect(getLegacyAlertSeverity('progress')).toBe('info');
        expect(getLegacyAlertSeverity('normal')).toBe('neutral');
        expect(getLegacyAlertSeverity('requestlogs')).toBe('neutral');
    });
});

describe('getAlertDescriptor', () => {
    it('keeps toast non-blocking and auto-dismissed', () => {
        expect(getAlertDescriptor('toast')).toEqual({
            severity: 'neutral',
            surface: 'toast',
            blocking: false,
            dismissible: false,
            autoDismiss: true,
        });
    });

    it('marks extracted special views as dialogs', () => {
        expect(getAlertDescriptor('cardexport').surface).toBe('dialog');
        expect(getAlertDescriptor('selectModule').surface).toBe('dialog');
        expect(getAlertDescriptor('pukmakkurit').surface).toBe('dialog');
        expect(getAlertDescriptor('requestlogs')).toMatchObject({
            severity: 'info',
            surface: 'dialog',
            blocking: true,
            dismissible: true,
            autoDismiss: false,
        });
        expect(getAlertDescriptor('branches').surface).toBe('dialog');
    });

    it('keeps request data in the modal surface', () => {
        expect(getAlertDescriptor('requestdata')).toMatchObject({
            surface: 'modal',
            blocking: true,
            dismissible: true,
        });
    });

    it('marks wait and progress states as non-dismissible modals', () => {
        expect(getAlertDescriptor('wait')).toMatchObject({
            surface: 'modal',
            blocking: true,
            dismissible: false,
        });
        expect(getAlertDescriptor('wait2')).toMatchObject({
            surface: 'modal',
            blocking: true,
            dismissible: false,
        });
        expect(getAlertDescriptor('progress')).toMatchObject({
            surface: 'modal',
            blocking: true,
            dismissible: false,
        });
    });
});
