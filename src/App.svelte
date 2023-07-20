<script lang="ts">
    import Sidebar from './lib/SideBars/Sidebar.svelte';
    import {ArrowRight} from 'lucide-svelte'
    import { SizeStore, settingsOpen, sideBarStore } from './ts/stores';
    import { DataBase, loadedStore } from './ts/storage/database';
    import ChatScreen from './lib/ChatScreens/ChatScreen.svelte';
    import AlertComp from './lib/Others/AlertComp.svelte';
    import RealmPopUp from './lib/UI/Realm/RealmPopUp.svelte';
    import { alertStore } from './ts/alert';
    import GridChars from './lib/Others/GridCatalog.svelte';
    import WelcomeRisu from './lib/Others/WelcomeRisu.svelte';
    import Settings from './lib/Setting/Settings.svelte';
    import { showRealmInfoStore } from './ts/characterCards';

    let didFirstSetup: boolean  = false
    let gridOpen = false

    DataBase.subscribe(db => {
        if(db.didFirstSetup !== didFirstSetup){
            didFirstSetup = db.didFirstSetup || false
        }
    })

</script>

<main class="flex bg-bg w-full h-full max-w-100vw">
    {#if !$loadedStore}
        <div class="w-full h-full flex justify-center items-center text-gray-200 text-xl">
            <span>Loading...</span>
        </div>
    {:else if !didFirstSetup}
        <WelcomeRisu />
    {:else if $settingsOpen}
        <Settings />
    {:else}
        {#if gridOpen}
            <GridChars endGrid={() => {gridOpen = false}} />
        {:else}
            {#if $sideBarStore}
                {#if ($SizeStore.w > 1028)}
                    <Sidebar openGrid={() => {gridOpen = true}} />
                {:else}
                    <div class="fixed top-0 w-full h-full left-0 z-30 flex flex-row items-center">
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <Sidebar openGrid={() => {gridOpen = true}} />



                    </div>
                {/if}
            {:else}
                <button on:click={() => {sideBarStore.set(true)}} class="fixed top-3 left-0 h-12 w-12 border-none rounded-r-md bg-borderc hover:bg-green-500 transition-colors flex items-center justify-center text-neutral-200 opacity-30 hover:opacity-70 z-20">
                    <ArrowRight />
                </button>
            {/if}
            <ChatScreen />
        {/if}
    {/if}
    {#if $alertStore.type !== 'none'}
        <AlertComp />
    {/if}
    {#if $showRealmInfoStore}
        <RealmPopUp bind:openedData={$showRealmInfoStore} />
    {/if}
</main>