<!-- <input
    class="text-textcolor bg-transparent input-text"
    class:mb-4={marginBottom}
    type="range"
    min={min}
    max={max}
    step={step}
    bind:value
    onchange
> -->

<div class="w-full flex" class:mb-4={marginBottom}>
  {#if disableable}

    <div class="relative h-8 border-darkborderc border rounded-full cursor-pointer rounded-r-none border-r-0 flex justify-center items-center pl-2">
      <CheckInput check={value !== -1000 && value !== undefined} margin={false} onChange={(c) => {
        onchange?.()
        if(c) {
          value = min;
        } else {
          value = -1000;
        }
      }}></CheckInput>
    </div>
  {/if}
  <div 
    class="relative w-full h-8 border-darkborderc border rounded-full cursor-pointer"
    class:rounded-l-none={disableable}
    style:background={
      `linear-gradient(to right, var(--risu-theme-darkbutton) 0%, var(--risu-theme-darkbutton) ${(value - min) / (max - min) * 100}%, var(--risu-theme-darkbg) ${(value - min) / (max - min) * 100}%, var(--risu-theme-darkbg) 100%)`
    }
    onpointerdown={(event) => {
      mouseDown = true;
      changeValue(event);
    }}

    onpointermove={(event) => {
      if (mouseDown) {
        changeValue(event);
      }
    }}


    onpointerup={() => {
      mouseDown = false;
    }}

    onpointerleave={() => {
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
      {customText === undefined ? ((value === -1000 || value === undefined) ? language.disabled : (value * multiple).toFixed(fixed)) : customText}
    </span>
  </div>
</div>


<script lang="ts">
  import { language } from "src/lang";
  import CheckInput from "./CheckInput.svelte";

    let slider: HTMLDivElement = $state()
    let mouseDown = $state(false)
  interface Props {
    min?: number;
    max?: number;
    value: number;
    marginBottom?: boolean;
    step?: number;
    fixed?: number;
    multiple?: number;
    disableable?: boolean;
    customText?: string|undefined;
    onchange?: Function;
  }

  let {
    min = undefined,
    max = undefined,
    value = $bindable(),
    marginBottom = false,
    step = 1,
    fixed = 0,
    multiple = 1,
    disableable = false,
    customText = undefined,
    onchange
  }: Props = $props();

    function changeValue(event) {
        const rect = slider.getBoundingClientRect();
        const x = event.clientX - rect.left;
        console.log(x, rect.width);
        let newValue = ((x / rect.width) * (max - min)) + min;
        newValue = Math.round(newValue / step) * step;
        value = Math.min(Math.max(newValue, min), max);
    }
</script>