<script lang="ts">
    import { openURL } from "src/ts/storage/globalApi";

    let specialDay = ''
    const today = new Date()
    if (today.getMonth() === 11 && today.getDate() >= 19 && today.getDate() <= 25) {
        specialDay = 'christmas'
    }
    let iconAnimation = 0
    let clicks = 0
    let score = 0
    let time = 20
    let miniGameStart = false

</script>

<h2 class="text-4xl text-textcolor mb-0 mt-6 font-black relative">RisuAI
    {#if specialDay === 'christmas'}
        <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
        {#if clicks < 5}
            <img src="./santa.png" alt="santa" class="absolute logo-top"
                style:top={(-20 + iconAnimation).toFixed(0) + 'px'}
                style:right={'-30px'}
                on:click={async () => {
                    iconAnimation = Math.random() * 300
                    clicks++
                    if(clicks === 5){
                        iconAnimation = 0
                    }
                }}
            >
        {/if}
    {/if}
</h2>

{#if clicks >= 5}
    <div class="bg-black w-full p-3 mt-4 mb-4 rounded-md max-w-2xl" id="minigame-div">
        <span class="font-semibold text-lg">Score: {score}</span><br>
        <span class="font-semibold text-lg">Time: {time.toFixed(0)}</span>
        <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
        <img src="./santa.png" alt="santa"
            style:margin-left={iconAnimation + 'px'}
            class:grayscale={!miniGameStart}
            on:click={async () => {
                const miniGameDiv = document.getElementById('minigame-div')
                const max = miniGameDiv.clientWidth - 70
                iconAnimation = Math.random() * max
                if(!miniGameStart){
                    if(time === 0){
                        time = 20
                        iconAnimation = 0
                        return
                    }
                    time = 20
                    score = 1
                    miniGameStart = true
                    const timer = setInterval(() => {
                        time -= 1
                        if(time <= 0){
                            miniGameStart = false
                            clearInterval(timer)
                        }
                    }, 700)
                }
                else{
                    score++
                }
            }}
        >
    </div>
{/if}