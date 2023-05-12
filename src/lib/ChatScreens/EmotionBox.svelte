<script>
  import { DataBase } from "../../ts/database";
  import { CharEmotion } from "../../ts/stores";
  import { getEmotion } from "../../ts/util";
</script>

{#await getEmotion($DataBase, $CharEmotion, "contain") then images}
  {#each images as image, i}
    <div
      style={image +
        `width:${100 / images.length}%;bottom:0;left:${
          (100 / images.length) * i
        }%`}
      class="absolute h-full bg-center"
    />
  {/each}
{/await}

<style>
  .h-full {
    height: 100%;
  }
  .bg-center {
    background-position: center;
  }
</style>
