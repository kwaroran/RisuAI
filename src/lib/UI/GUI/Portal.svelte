<script lang="ts">
	import { getAllContexts, mount, unmount } from "svelte";
	import PortalConsumer from "./PortalConsumer.svelte";

    interface Props {
        target?: HTMLElement;
        children: any;
    }

	const { target: target = document.body, children }:Props = $props();
	
	const context = getAllContexts();

	let instance;

	$effect(() => {
		instance = mount(PortalConsumer, { target, props: { children }, context })

		return () =>  {
			unmount(instance);
		}
	});
</script>