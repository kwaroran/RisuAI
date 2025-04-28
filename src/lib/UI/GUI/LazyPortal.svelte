<script lang="ts">
	import { getAllContexts, mount, onDestroy, onMount, unmount } from "svelte";
    //@ts-ignore
	import PortalConsumer from "./PortalConsumer.svelte";
    import { sleep } from "src/ts/util";

    interface Props {
        target?: HTMLElement;
        children: any;
        root?: HTMLElement
        idx?: number
    }

	const { target: target = document.body, children, root, idx }:Props = $props();
    const paddingEle = document.createElement('div')	
	const context = getAllContexts();

	let instance;
    let seen = $state(false)

    onMount(() => {

        paddingEle.style.height = '48px';
        paddingEle.style.width = '100%'
        paddingEle.style.backgroundColor = '#ffffff'
        paddingEle.style.color = 'black'
        target.appendChild(paddingEle)

    
        sleep(100).then(() => {
            const observer = new IntersectionObserver((v) => {
                if(v[0].intersectionRatio > 0.5){
                    seen = true
                    target.removeChild(paddingEle)
                    observer.disconnect()
                }
            }, {
                threshold: 0.5,
            })

            observer.observe(target)
            
            return () => {
                if(!seen){
                    observer.disconnect()
                }
            }
        })
    })

	$effect(() => {
        if(seen){
            instance = mount(PortalConsumer, { target, props: { children }, context })
        }

		return () =>  {
            if(instance){
                unmount(instance);
                try {
                    target.removeChild(paddingEle)                   
                } catch (error) {}
            }
		}
	});
</script>