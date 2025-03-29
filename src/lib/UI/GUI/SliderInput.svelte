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
    <div class="relative h-8 border-darkborderc border rounded-full cursor-pointer rounded-r-none border-r-0 flex justify-center items-center"
      tabindex="0"
      role="checkbox"
      aria-checked={value !== -1000 && value !== undefined}
      aria-label="Enable or disable slider"
      onkeydown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const newState = !(value !== -1000 && value !== undefined);
          onchange?.();
          if(newState) {
            value = min;
          } else {
            value = -1000;
          }
        }
      }}
    >
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
    class:border-blue-500={isFocused && !(value === -1000 || value === undefined)}
    class:ring-2={isFocused && !(value === -1000 || value === undefined)}
    class:ring-blue-500={isFocused && !(value === -1000 || value === undefined)}
    class:opacity-50={value === -1000 || value === undefined}
    class:cursor-not-allowed={value === -1000 || value === undefined}
    style:background={
      (value === -1000 || value === undefined) ? 
      'var(--risu-theme-darkbg)' : 
      `linear-gradient(to right, var(--risu-theme-darkbutton) 0%, var(--risu-theme-darkbutton) ${(value - min) / (max - min) * 100}%, var(--risu-theme-darkbg) ${(value - min) / (max - min) * 100}%, var(--risu-theme-darkbg) 100%)`
    }
    onpointerdown={(event) => {
      if (value === -1000 || value === undefined) return;
      mouseDown = true;
      changeValue(event);
    }}

    onpointermove={(event) => {
      if (mouseDown && !(value === -1000 || value === undefined)) {
        changeValue(event);
      }
    }}

    onpointerup={() => {
      mouseDown = false;
    }}

    onpointerleave={() => {
      mouseDown = false;
    }}
    tabindex={value === -1000 || value === undefined ? "-1" : "0"}
    aria-valuemin={min}
    aria-valuemax={max}
    aria-valuenow={value === -1000 || value === undefined ? min : value}
    aria-valuetext={value === -1000 || value === undefined ? language.disabled : (value * multiple).toFixed(fixed)}
    aria-label={`Slider control, current value: ${value === -1000 || value === undefined ? language.disabled : (value * multiple).toFixed(fixed)}`}
    aria-disabled={value === -1000 || value === undefined}
    role="slider"
    onfocus={handleFocus}
    onblur={handleBlur}
    onkeydown={(e) => {
      if (value === -1000 || value === undefined) return;
      
      let newValue = value;
      const smallStep = step;
      const largeStep = (max - min) / 10;
      
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault();
        newValue = Math.min(value + smallStep, max);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault();
        newValue = Math.max(value - smallStep, min);
      } else if (e.key === 'PageUp') {
        e.preventDefault();
        newValue = Math.min(value + largeStep, max);
      } else if (e.key === 'PageDown') {
        e.preventDefault();
        newValue = Math.max(value - largeStep, min);
      } else if (e.key === 'Home') {
        e.preventDefault();
        newValue = min;
      } else if (e.key === 'End') {
        e.preventDefault();
        newValue = max;
      }
      
      if (newValue !== value) {
        value = newValue;
        // Update aria attributes
        const element = e.currentTarget;
        element.setAttribute('aria-valuenow', value.toString());
        element.setAttribute('aria-valuetext', (value * multiple).toFixed(fixed));
        element.setAttribute('aria-label', `Slider control, current value: ${(value * multiple).toFixed(fixed)}`);
        showFocusValue = true;
        onchange?.();
      }
    }}
    bind:this={slider}
  >
    <!-- 슬라이더 thumb(손잡이) 추가 -->
    {#if !(value === -1000 || value === undefined)}
      <div 
        class="absolute h-6 w-6 top-1 rounded-full bg-white border-2 border-darkborderc transition-all duration-75 transform -translate-x-1/2"
        class:border-blue-500={isFocused}
        class:scale-110={isFocused}
        style:left={`${(value - min) / (max - min) * 100}%`}
        aria-hidden="true"
      ></div>
    {/if}
    
    <span 
      class="absolute top-0 right-4 h-8 rounded-full items-center justify-center flex text-textcolor text-sm transition-opacity duration-200"
    >
      {customText === undefined ? ((value === -1000 || value === undefined) ? language.disabled : (value * multiple).toFixed(fixed)) : customText}
    </span>
    
    {#if (isFocused || showFocusValue) && !(value === -1000 || value === undefined)}
      <div class="absolute w-auto h-auto px-2 py-1 bg-blue-600 text-white rounded-md text-sm -top-8 transform -translate-x-1/2 transition-opacity duration-200"
        style:left={`${(value - min) / (max - min) * 100}%`}
      >
        {(value * multiple).toFixed(fixed)}
      </div>
    {/if}
  </div>
</div>


<script lang="ts">
  import { language } from "src/lang";
  import CheckInput from "./CheckInput.svelte";

    let slider: HTMLDivElement = $state()
    let mouseDown = $state(false)
    let isFocused = $state(false)
    let showFocusValue = $state(false)
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

    function handleFocus() {
      isFocused = true;
      showFocusValue = true;
    }

    function handleBlur() {
      isFocused = false;
      setTimeout(() => {
        showFocusValue = false;
      }, 1000); // 포커스를 잃은 후 1초 동안 값을 계속 표시
    }
</script>