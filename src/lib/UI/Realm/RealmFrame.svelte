<script lang="ts">
    import { alertMd } from "src/ts/alert";
    import { shareRealmCardData } from "src/ts/realm";
    import { DataBase } from "src/ts/storage/database";
    import { CurrentCharacter } from "src/ts/stores";
    import { sleep } from "src/ts/util";
    import { onDestroy, onMount } from "svelte";

    export let close: () => void
    let iframe: HTMLIFrameElement = null
    const tk = $DataBase?.account?.token;
    const id = $DataBase?.account?.id
    let loadingStage = 0
    let pongGot = false

    const pmfunc = (e:MessageEvent) => {
        if(e.data.type === 'filedata' && e.data.success){
            loadingStage = 2
        }
        if(e.data.type === 'pong'){
            pongGot = true
        }
        if(e.data.type === 'close'){
            close()
        }
        if(e.data.type === 'success'){
            alertMd('## Upload Success\n\nYour character has been uploaded to Realm successfully.')
            if($CurrentCharacter.type === 'character'){
                loadingStage = 0
                $CurrentCharacter.realmId = e.data.id
            }
            close()
        }
    }

    const waitPing = async () => {
        if(iframe){
            while(!pongGot){
                iframe.contentWindow.postMessage({
                    type: 'ping'
                }, '*')
                await sleep(300)
            }
        }
    }

    onMount(async () => {
        window.addEventListener('message', pmfunc)

        const data = await shareRealmCardData()

        if(iframe){
            await waitPing()
            loadingStage = 1
            iframe.contentWindow.postMessage({
                type: 'filedata',
                buf: [data.data, data.name]
            }, '*', [data.data, data.name])
        }
    })

    const getUrl = () => {
        let url = `https://realm.risuai.net/upload?token=${tk}&token_id=${id}`
        if($CurrentCharacter.type === 'character' && $CurrentCharacter.realmId){
            url += `&edit=${$CurrentCharacter.realmId}&edit-type=normal`
        }
        url += '#noLayout'
        return url
    }

    onDestroy(() => {
        window.removeEventListener('message', pmfunc)
    })
</script>

<div class="top-0 left-0 z-50 fixed w-full h-full flex flex-col justify-center items-center text-textcolor bg-white">
    <div class="bg-darkbg border-b border-b-darkborderc w-full flex p-2">
        <h1 class="text-2xl font-bold max-w-full overflow-hidden whitespace-nowrap text-ellipsis">Upload to Realm</h1>
        <button class="text-textcolor text-lg hover:text-red-500 ml-auto" on:click={close}>&times;</button>
    </div>
    {#if loadingStage < 1}
    <div class="w-full flex justify-center items-center p-4 flex-1">
        <div class="loadmove"/>
    </div>
    {/if}
    <iframe bind:this={iframe}
        src={getUrl()}
        title="upload" class="w-full flex-1" class:hidden={loadingStage < 1}
    />
</div>