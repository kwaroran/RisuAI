<script lang="ts">
  export let isDisabled: boolean = false;
  export let onClick: () => void;
</script>

<button
  disabled={isDisabled}
  on:click={onClick}
  class="flex h-[56px] w-[56px] cursor-pointer select-none items-center justify-center
   transition-colors rounded-full
   border border-textcolor2 text-gray-300
   hover:border-gray-300 
   {isDisabled ? '!cursor-not-allowed' : ''}"
>
  <slot />
</button>
