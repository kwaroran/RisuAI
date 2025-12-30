<script lang="ts">
    import SettingRenderer from "../SettingRenderer.svelte";
    import { chatFormatSettingsItems } from "src/ts/setting/chatFormatSettingsData";
</script>

<SettingRenderer items={chatFormatSettingsItems} />