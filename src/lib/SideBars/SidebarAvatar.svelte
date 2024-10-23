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
    children?: import('svelte').Snippet;
    oncontextmenu?: (event: MouseEvent & {
        currentTarget: EventTarget & HTMLDivElement;
    }) => any
  }

  let {
    rounded,
    src,
    name,
    size = "22",
    onClick = () => {},
    bordered = false,
    color = '',
    children,
    oncontextmenu
  }: Props = $props();
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<span class="flex shrink-0 items-center justify-center avatar"
      class:border = {bordered}
      class:border-selected={bordered}
      class:rounded-md={bordered}
      oncontextmenu={oncontextmenu}
      onclick={onClick} use:tooltipRight={name}
      role="button"
      tabindex="0"
>
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
      >{@render children?.()}</div>
    {:else}
      {#await src}
        <div
          class="bg-skin-border sidebar-avatar rounded-md bg-top"
          style:width={size + "px"}
          style:height={size + "px"}
          style:minWidth={size + "px"}
          class:rounded-md={!rounded} class:rounded-full={rounded} 
></div>
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
></div>
  {/if}
</span>
