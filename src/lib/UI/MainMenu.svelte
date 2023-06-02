<script lang="ts">
  import { appVer } from "src/ts/storage/database";
  import GithubStars from "../Others/GithubStars.svelte";
  import Hub from "./Hub.svelte";

</script>
<div class="h-full w-full flex flex-col overflow-y-auto items-center">
    <h2 class="text-4xl text-white mb-0 mt-6 font-black">RisuAI</h2>
    <h3 class="text-gray-500 mt-1">Version {appVer}</h3>
    <GithubStars />
  <div class="w-full flex p-4 flex-col text-2xl text-white">
    <Hub />
  </div>
</div>