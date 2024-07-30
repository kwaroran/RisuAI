<!-- <input
    class="text-textcolor bg-transparent input-text"
    class:mb-4={marginBottom}
    type="range"
    min={min}
    max={max}
    step={step}
    bind:value
    on:change
> -->

<div class="w-full" class:mb-4={marginBottom}>
  <div 
    class="relative w-full h-8 border-darkborderc border rounded-full cursor-pointer"
    style:background={
      `linear-gradient(to right, var(--risu-theme-darkbutton) 0%, var(--risu-theme-darkbutton) ${(value - min) / (max - min) * 100}%, var(--risu-theme-darkbg) ${(value - min) / (max - min) * 100}%, var(--risu-theme-darkbg) 100%)`
    }
    on:mousedown={(event) => {
      mouseDown = true;
      changeValue(event);
    }}

    on:mousemove={(event) => {
      if (mouseDown) {
        changeValue(event);
      }
    }}

    on:mouseup={() => {
      mouseDown = false;
    }}  

    on:mouseleave={() => {
      mouseDown = false;
    }}
    bind:this={slider}
  >
    <!-- <div 
      class="absolute top-0 left-0 h-8 rounded-full bg-borderc transition-width duration-200"
      style="width: {(value - min) / (max - min) * 100}%;"
    >
    </div> -->
    <span 
      class="absolute top-0 left-4 h-8 rounded-full items-center justify-center flex text-textcolor text-sm"
    >
      {customText === undefined ? (value * multiple).toFixed(fixed) : customText}
    </span>
  </div>
</div>


<script lang="ts">
    export let min:number = undefined
    export let max:number = undefined
    export let value:number
    export let marginBottom = false
    export let step = 1
    export let fixed = 0
    export let multiple = 1
    let slider: HTMLDivElement
    let mouseDown = false
    export let customText: string|undefined = undefined

    function changeValue(event) {
        const rect = slider.getBoundingClientRect();
        const x = event.clientX - rect.left;
        console.log(x, rect.width);
        let newValue = ((x / rect.width) * (max - min)) + min;
        newValue = Math.round(newValue / step) * step;
        value = Math.min(Math.max(newValue, min), max);
    }
</script>