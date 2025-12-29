<script lang="ts">
    import { language } from "src/lang";
    import { alertConfirm } from "src/ts/alert";
    import { checkDriver } from "src/ts/drive/drive";
    import { isTauri, isNodeServer } from "src/ts/platform"

</script>

<h2 class="mb-2 text-2xl font-bold mt-2">{language.files}</h2>
<button
    onclick={async () => {
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
    class="drop-shadow-lg p-3 border-darkborderc border-solid mt-2 flex justify-center items-center ml-2 mr-2 border-1 hover:bg-selected text-sm">
    {language.savebackup}
</button>

<button
    onclick={async () => {
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
    class="drop-shadow-lg p-3 border-darkborderc border-solid mt-2 flex justify-center items-center ml-2 mr-2 border-1 hover:bg-selected text-sm">
    {language.loadbackup}
</button>


<!-- <button
    onclick={async () => {
        if((await alertConfirm(language.backupLoadConfirm)) && (await alertConfirm(language.backupLoadConfirm2))){
            localStorage.setItem('backup', 'load')
            checkDriver('reftoken')
        }
    }}
    class="drop-shadow-lg p-3 border-borderc border-solid mt-2 flex justify-center items-center ml-2 mr-2 border-1 hover:bg-selected text-sm">
    Test
</button> -->