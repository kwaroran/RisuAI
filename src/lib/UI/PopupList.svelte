<script lang="ts">
    import { MenuIcon } from "@lucide/svelte";
    import { onMount, type Snippet } from "svelte";

    let {
        children,
        customIcon = null,
    }:{
        children: Snippet,
        customIcon?: Snippet | null | undefined,
    } = $props()


    let styleString = $state('')
    let showing = $state(false)

    const showPopup = ((e:MouseEvent) => {
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const mouseX = e.clientX;
        const mouseY = e.clientY;

        if(mouseX < windowWidth / 2) {
            styleString += `left: ${mouseX}px;`;
        } else {
            styleString += `right: ${windowWidth - mouseX}px;`;
        }
        if(mouseY < windowHeight / 2) {
            styleString += `top: ${mouseY}px;`;
        } else {
            styleString += `bottom: ${windowHeight - mouseY}px;`;
        }
        showing = true;
    });

    const close = (() => {
        styleString = '';
        showing = false;
    });

    const onClick = ((e:MouseEvent) => {
        e.stopPropagation();
        if(showing) {
            close();
        } else {
            showPopup(e);
        }
    });
</script>

<svelte:body onclick={close} />
{#if showing}
    <div class="bg-darkbg border-darkborderc border rounded-md p-4 gap-2 flex flex-col fixed z-50 items-start" style={styleString}>
        {@render children()}
    </div>
{/if}
{#if customIcon}
    <button onclick={onClick}>
        {@render customIcon()}
    </button>
{:else}
    <button onclick={onClick} class="hover:text-blue-500 transition-colors button-icon-menu">
        <MenuIcon size={20} />
    </button>

{/if}