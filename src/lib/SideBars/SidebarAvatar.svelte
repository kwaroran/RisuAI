<script lang="ts">
  import { DataBase } from "src/ts/database";

  export let src:string|Promise<string>;
  export let size = "22";
</script>

<span class="flex shrink-0 items-center justify-center">
  {#if src}
    {#await src}
      <div
        class="bg-skin-border sidebar-avatar rounded-md bg-top"
        style:width={size + "px"}
        style:height={size + "px"}
        style:minWidth={size + "px"}
        class:rounded-md={!$DataBase.roundIcons} class:rounded-full={$DataBase.roundIcons} 
      />
    {:then img}
      <img
        src={img}
        class="bg-skin-border sidebar-avatar rounded-md object-cover object-top"
        style:width={size + "px"}
        style:height={size + "px"}
        style:minWidth={size + "px"}
        class:rounded-md={!$DataBase.roundIcons} class:rounded-full={$DataBase.roundIcons} 
        alt="avatar"
      />
    {/await}
  {:else}
    <div
      class="bg-skin-border sidebar-avatar rounded-md bg-top"
      style:width={size + "px"}
      style:height={size + "px"}
      style:minWidth={size + "px"}
      class:rounded-md={!$DataBase.roundIcons} class:rounded-full={$DataBase.roundIcons} 
    />
  {/if}
</span>
