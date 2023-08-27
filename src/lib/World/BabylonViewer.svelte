<script lang="ts">
    import { BabylonLoad } from "src/ts/world/worldloader";
    import { onDestroy, onMount } from "svelte";
    import type * as BABYLON from '@babylonjs/core'
    import type * as BABYLONMMD from 'babylon-mmd';

    let canv:HTMLCanvasElement;
    let mmdModel:BABYLONMMD.MmdModel
    let scene:BABYLON.Scene
    
    onMount(async () => {
        const loaded = await BabylonLoad(canv)
        mmdModel = loaded.mmdModel
        scene = loaded.scene
    })

    onDestroy(() => {
        if(!scene){
            return
        }
        scene.dispose()
    })
</script>

<canvas bind:this={canv} class:hidden={!scene}></canvas>
