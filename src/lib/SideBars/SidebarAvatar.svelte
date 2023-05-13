<script lang="ts">
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
      />
    {:then img}
      <img
        src={img}
        class="bg-skin-border sidebar-avatar rounded-md object-cover object-top"
        style:width={size + "px"}
        style:height={size + "px"}
        style:minWidth={size + "px"}
        alt="avatar"
      />
    {/await}
  {:else}
    <div
      class="bg-skin-border sidebar-avatar rounded-md bg-top"
      style:width={size + "px"}
      style:height={size + "px"}
      style:minWidth={size + "px"}
    />
  {/if}
</span>
