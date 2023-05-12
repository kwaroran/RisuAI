<script>
  export let src;
  export let size = "22";
</script>

<span class="flex shrink-0 items-center justify-center">
  {#if src}
    <img
      {src}
      class="bg-skin-border sidebar-avatar rounded-full object-cover"
      style:width={size + "px"}
      style:height={size + "px"}
      style:minWidth={size + "px"}
      alt="avatar"
    />
  {:else}
    <div
      class="bg-skin-border sidebar-avatar rounded-full"
      style:width={size + "px"}
      style:height={size + "px"}
      style:minWidth={size + "px"}
    />
  {/if}
</span>
