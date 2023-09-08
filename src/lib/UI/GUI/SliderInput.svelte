<input
    class="text-textcolor bg-transparent input-text"
    class:mb-4={marginBottom}
    type="range"
    min={min}
    max={max}
    step={step}
    bind:value
    on:change
>

<!-- <div class="p-6 max-w-sm mx-auto bg-gray-800 rounded-xl shadow-md flex items-center space-x-4 w-full" class:mb-4={marginBottom}>
    <div 
      class="relative w-full h-2 bg-darkbutton rounded-full cursor-pointer"
      on:click={changeValue}
    >
      <div 
        class="absolute top-0 left-0 h-2 rounded-full bg-indigo-500 transition-width duration-200"
        style="width: {(value - min) / (max - min) * 100}%;"
      >
      </div>
      <div 
        class="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-white rounded-full shadow"
        style="left: {(value - min) / (max - min) * 100}%;"
      >
      </div>
    </div>
</div> -->


<script lang="ts">
    export let min:number = undefined
    export let max:number = undefined
    export let value:number
    export let marginBottom = false
    export let step = 1

    function changeValue(event) {
        const rect = event.target.getBoundingClientRect();
        const x = event.clientX - rect.left;
        let newValue = ((x / rect.width) * (max - min)) + min;
        newValue = Math.round(newValue / step) * step;
        value = Math.min(Math.max(newValue, min), max);
    }
</script>