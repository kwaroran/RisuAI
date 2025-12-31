<script lang="ts">
    import { language } from "src/lang";
    import Button from "src/lib/UI/GUI/Button.svelte";
    import { DBState } from 'src/ts/stores.svelte';
    import { alertMd, alertNormal } from "src/ts/alert";
    import { downloadFile, getRequestLog, isNodeServer, isTauri } from "src/ts/globalApi.svelte";
    import { getDatabase } from "src/ts/storage/database.svelte";

</script>

<Button
    className="mt-4"
    onclick={async () => {
        alertMd(getRequestLog())
    }}
>
    {language.ShowLog}
</Button>

<Button
    className="mt-4"
    onclick={async () => {
        let mdTable = "| Type | Value |\n| --- | --- |\n"
        const s = DBState.db.statics
        for (const key in s) {
            mdTable += `| ${key} | ${s[key]} |\n`
        }
        mdTable += `\n\n<small>${language.staticsDisclaimer}</small>`
        alertMd(mdTable)
    }}
>
Show Statistics
</Button>

<Button
    className="mt-4"
    onclick={async () => {
        const db = safeStructuredClone(getDatabase({
            snapshot: true
        }))

        const keyToRemove = [
            'characters', 'loreBook', 'plugins', 'account', 'personas', 'username', 'userIcon', 'userNote',
            'modules', 'enabledModules', 'botPresets', 'characterOrder', 'webUiUrl', 'characterOrder',
            'hordeConfig', 'novelai', 'koboldURL', 'ooba', 'ainconfig', 'personaPrompt', 'promptTemplate',
            'deeplOptions', 'google', 'customPromptTemplateToggle', 'globalChatVariables', 'comfyConfig',
            'comfyUiUrl', 'translatorPrompt', 'customModels', 'mcpURLs', 'authRefreshes'
        ]
        for(const key in db) {
            if(
                keyToRemove.includes(key) ||
                key.toLowerCase().includes('key') || key.toLowerCase().includes('proxy')
                || key.toLowerCase().includes('hypa')
            ) {
                delete db[key]
            }
        }

        //@ts-expect-error meta is not defined in Database type, added for settings export report
        db.meta = {
            isTauri: isTauri,
            isNodeServer: isNodeServer,
            protocol: location.protocol
        }

        const json = JSON.stringify(db, null, 2)
        await downloadFile('risuai-settings-report.json', new TextEncoder().encode(json))
        await navigator.clipboard.writeText(json)
        alertNormal(language.settingsExported)
        

    }}
>
Export Settings for Bug Report
</Button>
