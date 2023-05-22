<script lang="ts">
  export let rounded:boolean
  export let src:string|Promise<string>;
  export let size = "22";
  export let onClick = () => {}
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<span class="flex shrink-0 items-center justify-center avatar" on:click={onClick}>
  {#if src}
    {#if src === "slot"}
      <div
        class="bg-skin-border sidebar-avatar rounded-md bg-top bg-darkbg flex items-center justify-center"
        style:width={size + "px"}
        style:height={size + "px"}
        style:minWidth={size + "px"}
        class:rounded-md={!rounded} class:rounded-full={rounded} 
      ><slot /></div>
    {:else}
      {#await src}
        <div
          class="bg-skin-border sidebar-avatar rounded-md bg-top"
          style:width={size + "px"}
          style:height={size + "px"}
          style:minWidth={size + "px"}
          class:rounded-md={!rounded} class:rounded-full={rounded} 
        />
      {:then img}
        <img
          src={img}
          class="bg-skin-border sidebar-avatar rounded-md object-cover object-top"
          style:width={size + "px"}
          style:height={size + "px"}
          style:minWidth={size + "px"}
          class:rounded-md={!rounded} class:rounded-full={rounded} 
          alt="avatar"
        />
      {/await}
    {/if}
  {:else}
    <div
      class="bg-skin-border sidebar-avatar rounded-md bg-top"
      style:width={size + "px"}
      style:height={size + "px"}
      style:minWidth={size + "px"}
      class:rounded-md={!rounded} class:rounded-full={rounded} 
    />
  {/if}
</span>
