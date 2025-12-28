<script lang="ts">
    import SettingRenderer from "../SettingRenderer.svelte";
    import { accessibilitySettingsItems } from "src/ts/setting/accessibilitySettingsData";
</script>

<SettingRenderer items={accessibilitySettingsItems} />
