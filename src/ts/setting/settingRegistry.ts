import type { SettingType, SettingItem, SettingContext } from './types';
import type { Component } from 'svelte';
import SettingCheck from 'src/lib/Setting/Wrappers/SettingCheck.svelte';
import SettingText from 'src/lib/Setting/Wrappers/SettingText.svelte';
import SettingNumber from 'src/lib/Setting/Wrappers/SettingNumber.svelte';
import SettingTextarea from 'src/lib/Setting/Wrappers/SettingTextarea.svelte';
import SettingSlider from 'src/lib/Setting/Wrappers/SettingSlider.svelte';
import SettingSelect from 'src/lib/Setting/Wrappers/SettingSelect.svelte';
import SettingSegmented from 'src/lib/Setting/Wrappers/SettingSegmented.svelte';
import SettingColor from 'src/lib/Setting/Wrappers/SettingColor.svelte';
import SettingHeader from 'src/lib/Setting/Wrappers/SettingHeader.svelte';
import SettingAlert from 'src/lib/Setting/Wrappers/SettingAlert.svelte';
import SettingButton from 'src/lib/Setting/Wrappers/SettingButton.svelte';
import SettingAccordion from 'src/lib/Setting/Wrappers/SettingAccordion.svelte';
import SettingCustom from 'src/lib/Setting/Wrappers/SettingCustom.svelte';

type WrapperComponent = Component<{ item: SettingItem; ctx: SettingContext }>;

export const settingRegistry: Record<SettingType, WrapperComponent> = {
    'check': SettingCheck,
    'text': SettingText,
    'number': SettingNumber,
    'textarea': SettingTextarea,
    'slider': SettingSlider,
    'select': SettingSelect,
    'segmented': SettingSegmented,
    'color': SettingColor,
    'header': SettingHeader,
    'alert': SettingAlert,
    'button': SettingButton,
    'accordion': SettingAccordion,
    'custom': SettingCustom,
};
