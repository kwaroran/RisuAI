<script lang="ts">
    import { alertStore } from 'src/ts/stores.svelte';

    interface Props {
        message: string;
    }

    let { message }: Props = $props();

    function closeToast() {
        alertStore.set({
            type: 'none',
            msg: '',
        });
    }

    $effect(() => {
        message;

        const closeTimer = setTimeout(closeToast, 1200);

        return () => {
            clearTimeout(closeTimer);
        };
    });
</script>

<div
    class="toast-anime absolute right-0 bottom-0 z-50 flex max-h-11/12 max-w-3xl flex-col overflow-y-auto rounded-md bg-darkbg p-4 text-textcolor break-any"
    onanimationend={closeToast}
>
    {message}
</div>

<style>
    .break-any {
        word-break: normal;
        overflow-wrap: anywhere;
    }

    @keyframes toastAnime {
        0% {
            opacity: 0;
        }
        50% {
            opacity: 1;
        }
        100% {
            opacity: 0;
        }
    }

    .toast-anime {
        animation: toastAnime 1s ease-out;
    }
</style>
