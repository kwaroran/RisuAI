<script lang="ts">
    import Check from "src/lib/UI/GUI/CheckInput.svelte";
    import { language } from "src/lang";
    
    import { DBState } from 'src/ts/stores.svelte';

</script>

<h2 class="mb-2 text-2xl font-bold mt-2">{language.accessibility}</h2>

<div class="flex items-center mt-2">
    <Check bind:check={DBState.db.askRemoval} name={language.askRemoval}/>
</div>

<div class="flex items-center mt-2">
    <Check bind:check={DBState.db.swipe} name={language.SwipeRegenerate}/>
</div>

<div class="flex items-center mt-2">
    <Check bind:check={DBState.db.instantRemove} name={language.instantRemove}/>
</div>

<div class="flex items-center mt-2">
    <Check bind:check={DBState.db.sendWithEnter} name={language.sendWithEnter}/>
</div>

<div class="flex items-center mt-2">
    <Check bind:check={DBState.db.clickToEdit} name={language.clickToEdit}/>
</div>

<div class="flex items-center mt-2">
    <Check bind:check={DBState.db.botSettingAtStart} name={language.botSettingAtStart}/>
</div>

<div class="flex items-center mt-2">
    <Check bind:check={DBState.db.toggleConfirmRecommendedPreset} name={language.toggleConfirmRecommendedPreset}/>
</div>

<div class="flex items-center mt-2">
    <Check bind:check={DBState.db.showMenuChatList} name={language.showMenuChatList}/>
</div>

<div class="flex items-center mt-2">
    <Check bind:check={DBState.db.goCharacterOnImport} name={language.goCharacterOnImport}/>
</div>

<div class="flex items-center mt-2">
    <Check bind:check={DBState.db.sideMenuRerollButton} name={language.sideMenuRerollButton}/>
</div>

<div class="flex items-center mt-2">
    <Check bind:check={DBState.db.requestInfoInsideChat} name={language.requestInfoInsideChat}/>
</div>