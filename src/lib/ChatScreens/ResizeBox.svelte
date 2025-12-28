<script>
    import { CharEmotion, ViewBoxsize } from '../../ts/stores.svelte';
    import { onMount } from 'svelte';
    import TransitionImage from './TransitionImage.svelte';
    import { getEmotion } from '../../ts/util';
    
    import { DBState } from 'src/ts/stores.svelte';

    let box = $state();
    let isResizing = false;
    let initialWidth;
    let initialHeight;
    let initialX;
    let initialY;

    function handleStart(event) {
        isResizing = true;
        initialWidth = box.clientWidth;
        initialHeight = box.clientHeight;
        initialX = event.clientX || event.touches[0].clientX;
        initialY = event.clientY || event.touches[0].clientY;
    }

    function handleEnd() {
        isResizing = false;
    }

    function handleMove(event) {
        if (!isResizing) return;
        event.preventDefault();

        const clientX = event.clientX || event.touches[0].clientX;
        const clientY = event.clientY || event.touches[0].clientY;
        const deltaX = initialX - clientX;
        const deltaY = clientY - initialY;

        const newWidth = Math.min(initialWidth + deltaX, window.innerWidth * 0.8);
        const newHeight = Math.min(initialHeight + deltaY, window.innerHeight * 0.8);

        ViewBoxsize.set({
            width: newWidth,
            height: newHeight
        })
    }

    onMount(() => {
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleEnd);
        window.addEventListener('touchmove', handleMove, { passive: false });
        window.addEventListener('touchend', handleEnd);

        return () => {
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleEnd);
        window.removeEventListener('touchmove', handleMove);
        window.removeEventListener('touchend', handleEnd);
        };
    });
</script>

<style>
    .box {
        position: absolute;
        right: 0px;
        top: 0px;
        border-bottom: 1px solid var(--risu-theme-borderc);
        border-left: 1px solid var(--risu-theme-borderc);
        width: 12rem;
        height: 12rem;
        z-index: 5;
    }

    .resize-handle {
        position: absolute;
        width: 16px;
        height: 16px;
        border-top: 1px solid var(--risu-theme-borderc);
        border-right: 1px solid var(--risu-theme-borderc);
        cursor: sw-resize;
        bottom: 0;
        left: 0;
        z-index: 10;
    }
</style>

<div class="box bg-darkbg/70" bind:this="{box}" style="width: {$ViewBoxsize.width}px; height: {$ViewBoxsize.height}px;">
    <!-- Your content here -->
    <TransitionImage classType='risu' src={getEmotion(DBState.db, $CharEmotion, 'plain')}/>
    <div role="button" tabindex="0"
      class="resize-handle"
      onmousedown={handleStart}
      onmouseup={handleEnd}
      ontouchstart={handleStart}
      ontouchend={handleEnd}
    ></div>
</div>