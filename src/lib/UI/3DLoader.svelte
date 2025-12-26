<script>
    // @ts-nocheck - Legacy file, not currently in use
    import { onDestroy, onMount } from 'svelte';

    /** @type {{width?: number, height?: number}} */
    let { width = 800, height = 600 } = $props();

    let canvas = $state();
    let animationFrameId;

    onMount(async () => {
        const { Scene, PerspectiveCamera, WebGLRenderer, AmbientLight, DirectionalLight } = await import('three');
        const { MMDLoader } = await import('three/examples/jsm/loaders/MMDLoader')
        const { MMDAnimationHelper } = await import('three/examples/jsm/animation/MMDAnimationHelper');

        const scene = new Scene();
        const camera = new PerspectiveCamera(75, width / height, 0.1, 1000);
        const renderer = new WebGLRenderer({ canvas, alpha: true });

        scene.add(new AmbientLight(0x666666));
        scene.add(new DirectionalLight(0x887766));

        camera.position.set(0, 10, 20);
        camera.lookAt(scene.position);

        const loader = new MMDLoader();
        const helper = new MMDAnimationHelper();

        loader.load( 'path/to/model.pmd', model => {
            const mesh = helper.createMesh(model);
            scene.add(mesh);

            const vpdLoader = new VPDLoader();

            vpdLoader.load( 'path/to/pose.vpd', vpd => {
            helper.pose(mesh, vpd);
            });

            helper.animate(mesh);
        });


        renderer.setSize(width, height);

        function animate() {
            animationFrameId = requestAnimationFrame(animate);
            renderer.render(scene, camera);
        }

        animate();
    });

    onDestroy(() => {
        cancelAnimationFrame(animationFrameId);
    });
</script>

<div>
<canvas bind:this={canvas} style="width: {width}px; height: {height}px;"></canvas>
</div>
