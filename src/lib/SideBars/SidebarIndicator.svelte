<script lang="ts">
  export let isActive: boolean;
</script>

<div
  class="
      group-hover:bg-white
      absolute
      left-[-4px]
      h-[8px]
      w-[8px]
      rounded-full
      transition-all
      duration-300
      {isActive ? 'bg-white !h-[20px]' : 'group-hover:h-[10px]'}
    "
/>
