<script lang="ts">
    import { language } from "src/lang";
    import { openURL } from "src/ts/storage/globalApi";
</script>

<h2 class="mb-2 text-2xl font-bold mt-2">{language.community}</h2>
<button
    on:click={async () => {openURL("https://github.com/kwaroran/RisuAI")}}
    class="drop-shadow-lg p-3 border-borderc border-solid mt-2 flex justify-center items-center ml-2 mr-2 border-1 hover:bg-selected text-sm">
    Github
</button>
<button
    on:click={async () => {openURL("https://discord.gg/JzP8tB9ZK8")}}
    class="drop-shadow-lg p-3 border-borderc border-solid mt-2 flex justify-center items-center ml-2 mr-2 border-1 hover:bg-selected text-sm">
    Discord
</button>
<button
    on:click={async () => {openURL("https://www.patreon.com/RisuAI")}}
    class="drop-shadow-lg p-3 border-borderc border-solid mt-2 flex justify-center items-center ml-2 mr-2 border-1 hover:bg-selected text-sm">
    Support Project
</button>