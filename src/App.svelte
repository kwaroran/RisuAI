<script lang="ts">
    import Sidebar from './lib/SideBars/Sidebar.svelte';
    import {ArrowRight} from 'lucide-svelte'
    import { DynamicGUI, settingsOpen, sideBarStore } from './ts/stores';
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

<main class="flex bg-bg w-full h-full max-w-100vw text-textcolor">
    {#if !$loadedStore}
        <div class="w-full h-full flex justify-center items-center text-textcolor text-xl">
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
            {#if (!$DynamicGUI)}
                <Sidebar openGrid={() => {gridOpen = true}} hidden={!$sideBarStore} />
            {:else}
                <div class="top-0 w-full h-full left-0 z-30 flex flex-row items-center" class:fixed={$sideBarStore} class:hidden={!$sideBarStore} >
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <Sidebar openGrid={() => {gridOpen = true}}  hidden={false} />



                </div>
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