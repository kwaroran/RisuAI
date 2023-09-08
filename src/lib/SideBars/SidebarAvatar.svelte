<script lang="ts">
  import { tooltipRight } from "src/ts/gui/tooltip";

  export let rounded:boolean
  export let src:string|Promise<string>;
  export let name:string
  export let size = "22";
  export let onClick = () => {}
  export let bordered = false
  export let color:string = ''
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<span class="flex shrink-0 items-center justify-center avatar"
      class:border = {bordered}
      class:border-selected={bordered}
      class:rounded-md={bordered}
      on:contextmenu
      on:click={onClick} use:tooltipRight={name}>
  {#if src}
    {#if src === "slot"}
      <div
        class="bg-skin-border sidebar-avatar rounded-md bg-top flex items-center justify-center bg-opacity-50"
        class:bg-darkbg={color === 'default' || color === ''}
        class:bg-red-700={color === 'red'}
        class:bg-yellow-700={color === 'yellow'}
        class:bg-green-700={color === 'green'}
        class:bg-blue-700={color === 'blue'}
        class:bg-indigo-700={color === 'indigo'}
        class:bg-purple-700={color === 'purple'}
        class:bg-pink-700={color === 'pink'}


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
