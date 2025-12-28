<script lang="ts">
    
import { DBState } from 'src/ts/stores.svelte';
    import { openURL } from "src/ts/globalApi.svelte";
    
let specialDay = $state('')
    const today = new Date()
    if (today.getMonth() === 11 && today.getDate() >= 19 && today.getDate() <= 25) {
        specialDay = 'christmas'
    }
    if( today.getMonth() === 0 && today.getDate() < 4){
        specialDay = 'newYear'
    }
    if( today.getMonth() === 3 && today.getDate() === 1){
        specialDay = 'aprilFool'
    }
    if( today.getMonth() === 3 && today.getDate() === 13 ){
        specialDay = 'anniversary'
    }
    if( today.getMonth() === 9 && today.getDate() === 31){
        specialDay = 'halloween'
    }
    if( (today.getMonth() === 8 && today.getDate() === 16)){
        if(DBState.db.language === 'ko'){
            specialDay = 'chuseok'
        }
        else if(DBState.db.language === 'zh-Hant' || DBState.db.language === 'zh'){
            specialDay = 'midAutumn'
        }
    }
    let iconAnimation = $state(0)
    let clicks = $state(0)
    let score = $state(0)
    let time = $state(20)
    let miniGameStart = $state(false)

    const onClick = () => {
        if(specialDay === 'newYear'){

        }
    }

</script>


<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<h2 class="text-4xl text-textcolor mb-0 mt-6 font-black relative" class:text-bordered={specialDay === 'newYear'} onclick={onClick}>
    {#if specialDay === 'midAutumn'}
        <span class="text-amber-400">🐉Risuai🐉</span>
    {:else if specialDay === 'chuseok'}
        <div class="flex">
            <span class="text-blue-500">R</span>
            <span class="text-red-500">i</span>
            <span class="text-yellow-500">s</span>
            <span class="text-white">u</span>
            <span class="text-black">A</span>
            <span class="text-blue-500">I</span>
        </div>
    {:else}
        Risuai
    {/if}
    {#if specialDay === 'christmas'}
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        {#if clicks < 5}
            <img src="./santa.png" alt="santa" class="absolute logo-top"
                style:top={(-20 + iconAnimation).toFixed(0) + 'px'}
                style:right={'-30px'}
                onclick={async () => {
                    iconAnimation = Math.random() * 300
                    clicks++
                    if(clicks === 5){
                        iconAnimation = 0
                    }
                }}
            >
        {/if}
    {/if}
    {#if specialDay === 'anniversary'}
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        {#if clicks < 5}
            <img src="./birthday.png" alt="birthday" class="absolute logo-top"
                style:top={(-28 + iconAnimation).toFixed(0) + 'px'}
                style:right={'-30px'}
            >
        {/if}
    {/if}
    {#if specialDay === 'newYear'}
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <img src="./sun.webp" alt="sun" class="absolute -z-10"
            style:top={'-50px'}
            style:right={'0px'}
            onclick={onClick}
        >
    {/if}
</h2>

{#if specialDay === 'anniversary'}
    <h1>
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <span class="text-2xl font-extralight italic text-amber-400 hover:text-amber-600 cursor-pointer transition" role="button" tabindex="-1" onclick={() => {
            openURL('https://risuai.net')
        }}>Happy 2nd Anniversary!</span>
    </h1>
{/if}
{#if clicks >= 5}
    <div class="bg-black w-full p-3 mt-4 mb-4 rounded-md max-w-2xl" id="minigame-div">
        <span class="font-semibold text-lg">Score: {score}</span><br>
        <span class="font-semibold text-lg">Time: {time.toFixed(0)}</span>
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <img src="./santa.png" alt="santa"
            style:margin-left={iconAnimation + 'px'}
            class:grayscale={!miniGameStart}
            onclick={async () => {
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