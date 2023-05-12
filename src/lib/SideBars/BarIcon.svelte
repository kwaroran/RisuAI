<!-- TODO: REMOVE AND REFACTOR TO BASE BUTTON UI COMPONENT -->

<script lang="ts">
  export let onClick = () => {};
  export let additionalStyle: string | Promise<string> = "";
</script>

{#await additionalStyle}
  <button on:click={onClick} class="ico"><slot /></button>
{:then as}
  <button on:click={onClick} class="ico" style={as}><slot /></button>
{/await}

<style>
  .ico {
    cursor: pointer;
    border-radius: 0.375rem;
    height: 3.5rem;
    width: 3.5rem;
    min-height: 3.5rem;
    --tw-shadow-color: 0, 0, 0;
    --tw-shadow: 0 10px 15px -3px rgba(var(--tw-shadow-color), 0.1),
      0 4px 6px -2px rgba(var(--tw-shadow-color), 0.05);
    -webkit-box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000),
      var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);
    box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000),
      var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);
    --tw-bg-opacity: 1;
    background-color: rgba(107, 114, 128, var(--tw-bg-opacity));
    display: flex;
    justify-content: center;
    align-items: center;
    transition-property: background-color, border-color, color, fill, stroke;
    transition-duration: 150ms;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  }

  .ico:hover {
    --tw-bg-opacity: 1;
    background-color: rgba(16, 185, 129, var(--tw-bg-opacity));
  }
</style>
