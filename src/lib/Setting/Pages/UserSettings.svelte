<script lang="ts">
    import { language } from "src/lang";
    import { hubURL } from "src/ts/characterCards";
    import { getCharImage, selectUserImg } from "src/ts/characters";
    import { loadRisuAccountData, saveRisuAccountData } from "src/ts/drive/accounter";
    import { DataBase } from "src/ts/storage/database";
    import Check from "src/lib/UI/GUI/CheckInput.svelte";
  import { alertConfirm, alertSelect } from "src/ts/alert";
  import { forageStorage, isNodeServer, isTauri } from "src/ts/storage/globalApi";
  import { unMigrationAccount } from "src/ts/storage/accountStorage";
  import { checkDriver } from "src/ts/drive/drive";
    let openIframe = false
    let openIframeURL = ''
    let popup:Window = null
</script>

<svelte:window on:message={async (e) => {
    if(e.origin.startsWith("https://sv.risuai.xyz") || e.origin.startsWith("http://127.0.0.1")){
        if(e.data.msg.type === 'drive'){
            console.log(e.data.msg)
            await loadRisuAccountData()
            $DataBase.account.data.refresh_token = e.data.msg.data.refresh_token
            $DataBase.account.data.access_token = e.data.msg.data.access_token
            $DataBase.account.data.expires_in = (e.data.msg.data.expires_in * 700) + Date.now()
            await saveRisuAccountData()
            popup.close()
        }
        else if(e.data.msg.data.vaild){
            openIframe = false
            $DataBase.account = {
                id: e.data.msg.id,
                token: e.data.msg.token,
                data: e.data.msg.data
            }
        }
    }
}}></svelte:window>

<h2 class="mb-2 text-2xl font-bold mt-2">{language.account} & {language.files}</h2>

<button
    on:click={async () => {
        if(await alertConfirm(language.backupConfirm)){
            localStorage.setItem('backup', 'save')
            if(isTauri || isNodeServer){
                checkDriver('savetauri')
            }
            else{
                checkDriver('save')
            }
        }
    }}
    class="drop-shadow-lg p-3 border-borderc border-solid mt-2 flex justify-center items-center ml-2 mr-2 border-1 hover:bg-selected text-sm">
    {language.savebackup}
</button>

<button
    on:click={async () => {
        if((await alertConfirm(language.backupLoadConfirm)) && (await alertConfirm(language.backupLoadConfirm2))){
            localStorage.setItem('backup', 'load')
            if(isTauri || isNodeServer){
                checkDriver('loadtauri')
            }
            else{
                checkDriver('load')
            }
        }
    }}
    class="drop-shadow-lg p-3 border-borderc border-solid mt-2 flex justify-center items-center ml-2 mr-2 border-1 hover:bg-selected text-sm mb-4">
    {language.loadbackup}
</button>
<div class="bg-darkbg p-3 rounded-md mb-2 flex flex-col items-start">
    <div class="w-full">
        <h1 class="text-3xl font-black min-w-0">Risu Account{#if $DataBase.account}
            <button class="bg-selected p-1 text-sm font-light rounded-md hover:bg-green-500 transition-colors float-right" on:click={async () => {
                if($DataBase.account.useSync || forageStorage.isAccount){
                    unMigrationAccount()
                }
                
                $DataBase.account = undefined
            }}>{language.logout}</button>
        {/if}</h1>
    </div>
    {#if $DataBase.account}
        <span class="mb-4 text-textcolor2">ID: {$DataBase.account.id}</span>
        {#if !isTauri}
            <div class="flex items-center mt-2">
                {#if $DataBase.account.useSync || forageStorage.isAccount}
                    <span>{language.dataSavingInAccount}</span>
                {:else}
                    <Check check={false} name={language.SaveDataInAccount} onChange={(v) => {
                        if(v){
                            localStorage.setItem('dosync', 'sync')
                            location.reload()
                        }
                    }}/>
                {/if}
            </div>
        {/if}

    {:else}
        <span>{language.notLoggedIn}</span>
        <button class="bg-selected p-2 rounded-md mt-2 hover:bg-green-500 transition-colors" on:click={() => {
            openIframeURL = hubURL + '/hub/login'
            openIframe = true
        }}>
            Login
        </button>
    {/if}
</div>
{#if openIframe}
    <div class="fixed top-0 left-0 bg-black bg-opacity-50 w-full h-full flex justify-center items-center">
        <iframe src={openIframeURL} title="login" class="w-full h-full">
        </iframe>
    </div>
{/if}