<script lang="ts">
  import { untrack } from "svelte";
  import { tooltipRight } from "src/ts/gui/tooltip";

  type AvatarImageSource = string | Promise<string> | (() => string | Promise<string>);

  interface Props {
    rounded: boolean;
    src: AvatarImageSource;
    name: string;
    size?: string;
    onClick?: any;
    bordered?: boolean;
    color?: string;
    backgroundimg?: string|Promise<string>;
    children?: import('svelte').Snippet;
    oncontextmenu?: (event: MouseEvent & {
        currentTarget: EventTarget & HTMLDivElement;
    }) => any
    chaId?: string;
    srcKey?: string;
    onVisible?: () => void | Promise<void>;
    onError?: () => void;
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
    chaId,
    srcKey,
    onVisible,
    onError
  }: Props = $props();

  let avatarRoot: HTMLSpanElement;
  let visible = $state(false);
  let resolvedSrc: string | Promise<string> = $state('');
  let loadedKey = '';
  let handledVisibleKey: string | undefined;

  $effect(() => {
    if (!avatarRoot) {
      return;
    }

    const isLazySource = untrack(() => typeof src === 'function');
    if (!isLazySource) {
      visible = true;
      return;
    }

    if (visible) {
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      visible = true;
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        visible = true;
        observer.disconnect();
      }
    }, {
      root: null,
      rootMargin: '160px 0px',
      threshold: 0,
    });

    observer.observe(avatarRoot);

    return () => {
      observer.disconnect();
    };
  });

  $effect(() => {
    if (!visible) {
      return;
    }

    const key = srcKey ?? (typeof src === 'function' ? '' : String(src));
    if (handledVisibleKey === key) {
      return;
    }

    const onVisibleHandler = untrack(() => onVisible);
    if (!onVisibleHandler) {
      return;
    }

    handledVisibleKey = key;
    void onVisibleHandler();
  });

  $effect(() => {
    const key = srcKey ?? (typeof src === 'function' ? '' : String(src));

    if (!src) {
      resolvedSrc = '';
      loadedKey = '';
      return;
    }

    if (typeof src !== 'function') {
      resolvedSrc = src;
      loadedKey = key;
      return;
    }

    if (!visible) {
      return;
    }

    if (loadedKey === key && resolvedSrc) {
      return;
    }

    resolvedSrc = src();
    loadedKey = key;
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<span class="flex shrink-0 items-center justify-center avatar"
      bind:this={avatarRoot}
      class:border = {bordered}
      class:border-selected={bordered}
      class:rounded-md={bordered}
      oncontextmenu={oncontextmenu}
      onclick={onClick} use:tooltipRight={name}
      role="button"
      tabindex="0"
      data-char-id={chaId}
>
  {#if src}
    {#if src === "slot"}
      {#await backgroundimg}
      <div
        class="bg-skin-border sidebar-avatar rounded-md bg-top flex items-center justify-center {
          color === 'red' ? 'bg-red-700/50' :
          color === 'yellow' ? 'bg-yellow-700/50' :
          color === 'green' ? 'bg-green-700/50' :
          color === 'blue' ? 'bg-blue-700/50' :
          color === 'indigo' ? 'bg-indigo-700/50' :
          color === 'purple' ? 'bg-purple-700/50' :
          color === 'pink' ? 'bg-pink-700/50' :
          'bg-darkbg/50'
        }"
        style:width={size + "px"}
        style:height={size + "px"}
        style:minWidth={size + "px"}
        class:rounded-md={!rounded} class:rounded-full={rounded}
      ></div>
      {:then resolvedBgImg}
      <div
        class="bg-skin-border sidebar-avatar rounded-md bg-top flex items-center justify-center {
          color === 'red' ? 'bg-red-700/50' :
          color === 'yellow' ? 'bg-yellow-700/50' :
          color === 'green' ? 'bg-green-700/50' :
          color === 'blue' ? 'bg-blue-700/50' :
          color === 'indigo' ? 'bg-indigo-700/50' :
          color === 'purple' ? 'bg-purple-700/50' :
          color === 'pink' ? 'bg-pink-700/50' :
          'bg-darkbg/50'
        }"
        style:width={size + "px"}
        style:height={size + "px"}
        style:minWidth={size + "px"}
        style:background-image={resolvedBgImg ? `url('${resolvedBgImg}')` : undefined}
        style:background-size={resolvedBgImg ? "cover" : undefined}
        style:background-position={resolvedBgImg ? "center" : undefined}
        class:rounded-md={!rounded} class:rounded-full={rounded}
      >
      {#if !resolvedBgImg}
        {@render children?.()}
      {/if}
        </div>
    {/await}
    {:else}
      {#if resolvedSrc}
      {#await resolvedSrc}
        <div
          class="bg-skin-border sidebar-avatar rounded-md bg-top"
          style:width={size + "px"}
          style:height={size + "px"}
          style:minWidth={size + "px"}
          class:rounded-md={!rounded} class:rounded-full={rounded} 
></div>
      {:then img}
        {#if img}
        <img
          src={img}
          onerror={onError}
          class="bg-skin-border sidebar-avatar rounded-md object-cover object-top"
          style:width={size + "px"}
          style:height={size + "px"}
          style:minWidth={size + "px"}
          class:rounded-md={!rounded} class:rounded-full={rounded} 
          alt="avatar"
        />
        {:else}
        <div
          class="bg-skin-border sidebar-avatar rounded-md bg-top"
          style:width={size + "px"}
          style:height={size + "px"}
          style:minWidth={size + "px"}
          class:rounded-md={!rounded} class:rounded-full={rounded}
        ></div>
        {/if}
      {/await}
      {:else}
      <div
        class="bg-skin-border sidebar-avatar rounded-md bg-top"
        style:width={size + "px"}
        style:height={size + "px"}
        style:minWidth={size + "px"}
        class:rounded-md={!rounded} class:rounded-full={rounded}
      ></div>
      {/if}
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
