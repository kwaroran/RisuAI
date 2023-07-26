<script lang="ts">
    import Check from "src/lib/UI/GUI/CheckInput.svelte";
    import { language } from "src/lang";
    import { DataBase } from "src/ts/storage/database";

</script>
<h2 class="mb-2 text-2xl font-bold mt-2">{language.accessibility}</h2>

<div class="flex items-center mt-2">
    <Check bind:check={$DataBase.askRemoval} name={language.askRemoval}/>
</div>

<div class="flex items-center mt-2">
    <Check bind:check={$DataBase.swipe} name={language.SwipeRegenerate}/>
</div>

<div class="flex items-center mt-2">
    <Check bind:check={$DataBase.instantRemove} name={language.instantRemove}/>
</div>

<div class="flex items-center mt-2">
    <Check bind:check={$DataBase.sendWithEnter} name={language.sendWithEnter}/>
</div>

<div class="flex items-center mt-2">
    <Check bind:check={$DataBase.clickToEdit} name={language.clickToEdit}/>
</div>

<div class="flex items-center mt-2">
    <Check bind:check={$DataBase.botSettingAtStart} name={language.botSettingAtStart}/>
</div>

<div class="flex items-center mt-2">
    <Check bind:check={$DataBase.toggleConfirmRecommendedPreset} name={language.toggleConfirmRecommendedPreset}/>
</div>