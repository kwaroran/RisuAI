<script lang="ts">
    import Check from "src/lib/Others/Check.svelte";
    import { language } from "src/lang";
    import { DataBase } from "src/ts/database";

</script>
<h2 class="mb-2 text-2xl font-bold mt-2">{language.accessibility}</h2>

<div class="flex items-center mt-2">
    <Check bind:check={$DataBase.askRemoval}/>
    <span>{language.askRemoval}</span>
</div>

<div class="flex items-center mt-2">
    <Check bind:check={$DataBase.swipe}/>
    <span>{language.SwipeRegenerate}</span>
</div>

<div class="flex items-center mt-2">
    <Check bind:check={$DataBase.instantRemove}/>
    <span>{language.instantRemove}</span>
</div>

<div class="flex items-center mt-2">
    <Check bind:check={$DataBase.sendWithEnter}/>
    <span>{language.sendWithEnter}</span>
</div>
