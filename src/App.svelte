<script lang="ts">
    import Sidebar from './lib/SideBars/Sidebar.svelte';
    import { DynamicGUI, settingsOpen, sideBarStore, ShowRealmFrameStore, openPresetList, openPersonaList, MobileGUI, CustomGUISettingMenuStore } from './ts/stores';
    import { DBState, loadedStore } from './ts/storage/database.svelte';
    import ChatScreen from './lib/ChatScreens/ChatScreen.svelte';
    import AlertComp from './lib/Others/AlertComp.svelte';
    import RealmPopUp from './lib/UI/Realm/RealmPopUp.svelte';
    import { alertStore } from './ts/alert';
    import GridChars from './lib/Others/GridCatalog.svelte';
    import WelcomeRisu from './lib/Others/WelcomeRisu.svelte';
    import Settings from './lib/Setting/Settings.svelte';
    import { showRealmInfoStore } from './ts/characterCards';
    import RealmFrame from './lib/UI/Realm/RealmFrame.svelte';
    import { AccountWarning } from './ts/storage/accountStorage';
    import AccountWarningComp from './lib/Others/AccountWarningComp.svelte';
    import Botpreset from './lib/Setting/botpreset.svelte';
    import ListedPersona from './lib/Setting/listedPersona.svelte';
    import MobileHeader from './lib/Mobile/MobileHeader.svelte';
    import MobileBody from './lib/Mobile/MobileBody.svelte';
    import MobileFooter from './lib/Mobile/MobileFooter.svelte';
    import CustomGUISettingMenu from './lib/Setting/Pages/CustomGUISettingMenu.svelte';

  
    let didFirstSetup: boolean  = $derived(DBState.db?.didFirstSetup)
    let gridOpen = $state(false)

</script>

<main class="flex bg-bg w-full h-full max-w-100vw text-textcolor">
    {#if !$loadedStore}
        <div class="w-full h-full flex justify-center items-center text-textcolor text-xl bg-gray-900">
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-textcolor" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            <span>Loading...</span>
        </div>
    {:else if $CustomGUISettingMenuStore}
        <CustomGUISettingMenu />
    {:else if !didFirstSetup}
        <WelcomeRisu />
    {:else if $settingsOpen}
        <Settings />
    {:else if $MobileGUI}
        <div class="w-full h-full flex flex-col">
            <MobileHeader />
            <MobileBody />
            <MobileFooter />
        </div>
    {:else}
        {#if gridOpen}
            <GridChars endGrid={() => {gridOpen = false}} />
        {:else}
            {#if (!$DynamicGUI)}
                <Sidebar openGrid={() => {gridOpen = true}} hidden={!$sideBarStore} />
            {:else}
                <div class="top-0 w-full h-full left-0 z-30 flex flex-row items-center" class:fixed={$sideBarStore} class:hidden={!$sideBarStore} >
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
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
    {#if $ShowRealmFrameStore}
        <RealmFrame />
    {/if}
    {#if $AccountWarning}
        <AccountWarningComp />
    {/if}
    {#if $openPresetList}
        <Botpreset close={() => {$openPresetList = false}} />
    {/if}
    {#if $openPersonaList}
        <ListedPersona close={() => {$openPersonaList = false}} />
    {/if}
</main>