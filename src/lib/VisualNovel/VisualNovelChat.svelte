<script lang="ts">
    import { CurrentCharacter } from "src/ts/stores";

    
</script>

<div class="w-full flex justify-center absolute bottom-5">
    <div class="w-3xl max-w-full flex flex-col">

        <div class="bg-slate-700 h-12 rounded-lg border-slate-500 border-1 w-40 mb-2 bg-opacity-90 text-center flex items-center justify-center">
            <span class="font-bold p-2">{$CurrentCharacter.name}</span>
        </div>
        <div class="bg-slate-700 h-40 rounded-lg border-slate-500 border-1 w-full bg-opacity-90 text-justify p-4">
            Test
        </div>
    </div>
</div>