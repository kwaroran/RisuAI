<script lang="ts">
  import { tooltipRight } from "src/ts/gui/tooltip";

  interface Props {
    rounded: boolean;
    src: string|Promise<string>;
    name: string;
    size?: string;
    onClick?: any;
    bordered?: boolean;
    color?: string;
    backgroundimg?: string;
    children?: import('svelte').Snippet;
    oncontextmenu?: (event: MouseEvent & {
        currentTarget: EventTarget & HTMLDivElement;
    }) => any;
    ariaLabel?: string;
    transition?: boolean;
    opacity?: boolean;
    hidden?: boolean;
  }

  let {
    rounded,
    src,
    name,
    size = "22",
    onClick = () => {},
    bordered = false,
    color = '',
    backgroundimg = '',
    children,
    oncontextmenu,
    ariaLabel,
    transition,
    opacity,
    hidden
  }: Props = $props();
  
  let imgLoaded = $state(false);
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
    class="relative flex flex-col items-center"
    class:transition-all={transition}
    class:duration-200={transition}
    class:opacity-0={transition && opacity}
    class:hidden={hidden}
    class:opacity-1={transition && !opacity}
>
    <img 
        class="object-cover -z-0 w-full h-full"
        class:rounded-full={rounded}
        src={src} alt={`Character avatar for ${name}`}
        loading="lazy"
        onload={() => {
            imgLoaded = true
        }}
    />
    <!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
    <div 
        role="button"
        class="absolute top-0 z-10 w-full h-full bg-transparent" 
        onclick={onClick}
        oncontextmenu={oncontextmenu}
        aria-label={ariaLabel || `Character ${name}`}
    ></div>
</div>
