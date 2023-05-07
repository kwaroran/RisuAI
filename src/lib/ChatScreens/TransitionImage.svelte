<script lang="ts">
    let currentSrc:string[] = []
    let oldSrc:string[] = [];
    let showOldImage = false;
    let styleType:string = 'normal'
    let oldStyleType:string = 'normal'

    export let src:string[]|Promise<string[]> = [];
    export let classType: 'waifu'|'risu'|'mobile'

    async function processSrc(src:string[]|Promise<string[]>) {
        const resultSrc = await src

        let styl = styleType
        if(resultSrc.length > 1){
            styl = resultSrc[0]
            resultSrc.splice(0, 1)
        }
        if (JSON.stringify(resultSrc) !== JSON.stringify(currentSrc) || styl !== styleType) {
            handleTransitionEnd()
            if(currentSrc.length === 0){
                currentSrc = resultSrc
                styleType = styl
            }
            else{
                oldSrc = currentSrc
                oldStyleType = styleType
                currentSrc = resultSrc
                styleType = styl
                showOldImage = true;
            }
        }
    }

    function handleTransitionEnd() {
        if (showOldImage) {
            showOldImage = false;
        }
    }

    $: processSrc(src)



</script>

<style>
    .image-container {
      position: relative;
      overflow: hidden;
    }

    .image-container img {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: scale-down;
      object-position: 50% 100%;
    }

    .old-image {
        animation: fadeOutFromNone 0.5s ease-out;
    }

    .new-image {
        animation: fadeInFromNone 0.5s ease-out;
    }
    .img-waifu{
        width: 100%; height: 90vh;
        margin-top: 10vh;
    }

    .img-mobile{
        width: 100%;
        height: 100%;
    }

    .img-risu{
        width: 100%;
        position: absolute;
        bottom: 0;
        left: 0;
        height: 100%;
    }

    @keyframes fadeInFromNone {
        0% {
            opacity: 0;
        }

        100% {
            opacity: 1;
        }
    }
    @keyframes fadeOutFromNone {
        0% {
            opacity: 1;
        }
        100% {
            opacity: 0;
        }
    }
</style>

{#if currentSrc && currentSrc.length > 0}
    <div class="image-container"
        class:img-waifu={classType === 'waifu'}
        class:img-risu={classType === 'risu'}
        class:img-mobile={classType === 'mobile'}>
        {#if !showOldImage}
            {#each currentSrc as img, i}
                {#if styleType === 'normal'}
                    <img
                        src={img}
                        alt="img"
                        style:width={`${100 / currentSrc.length}%`}
                        style:left={`${100 / currentSrc.length * i}%`}
                    />
                {:else if styleType === 'emp'}
                    {#if i <= 1}
                        <img
                            src={img}
                            alt="img"
                            style:width={`${80 - (i*10)}%`}
                            style:left={`${30-(i*30)}%`}
                            style:z-index={9 - i}
                        />
                    {/if}
                {/if}
            {/each}
        {:else}
            {#if oldStyleType === 'normal'}
                {#each oldSrc as img2, i}
                    <img
                        src={oldSrc[i]}
                        alt="img"
                        class="old-image"
                        on:animationend={handleTransitionEnd}
                        style:width={`${100 / oldSrc.length}%`}
                        style:left={`${100 / oldSrc.length * i}%`}
                    />
                {/each}
            {:else if oldStyleType === 'emp'}
                
                {#each oldSrc as img2, i}
                    {#if i <= 1}
                        <img
                            src={oldSrc[i]}
                            alt="img"
                            class="old-image"
                            on:animationend={handleTransitionEnd}
                            style:width={`${80 - (i*10)}%`}
                            style:left={`${30-(i*30)}%`}
                            style:z-index={9 - i}
                        />
                    {/if}
                {/each}
            {/if}
            {#if styleType === 'normal'}
                {#each currentSrc as img3, i}
                    <img
                        src={currentSrc[i]}
                        alt="img"
                        class="new-image"
                        style:width={`${100 / currentSrc.length}%`}
                        style:left={`${100 / currentSrc.length * i}%`}
                    />
                {/each}
            {:else if styleType === 'emp'}

                {#each currentSrc as img3, i}
                    {#if i <= 1}
                        <img
                            src={currentSrc[i]}
                            alt="img"
                            class="new-image"
                            style:width={`${80 - (i*10)}%`}
                            style:left={`${30-(i*30)}%`}
                            style:z-index={9 - i}
                        />
                    {/if}
                {/each}
            {/if}
        {/if}
    </div>
{/if}
