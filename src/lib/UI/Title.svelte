<script lang="ts">
  import { alertMd, alertNormal } from "src/ts/alert";
  import { DataBase } from "src/ts/storage/database";
    import { openURL } from "src/ts/storage/globalApi";

    let specialDay = ''
    const today = new Date()
    if (today.getMonth() === 11 && today.getDate() >= 19 && today.getDate() <= 25) {
        specialDay = 'christmas'
    }
    if( today.getMonth() === 1 && today.getDate() < 4){
        specialDay = 'newYear'
    }
    let iconAnimation = 0
    let clicks = 0
    let score = 0
    let time = 20
    let miniGameStart = false

    const onClick = () => {
        if(specialDay === 'newYear'){
            const db = $DataBase
            let messages = 0
            let chats = 0
            if(db.statistics?.newYear2024){
                const markdown = `
# Happy New Year!
You've had:
- Sent over ${db.statistics.newYear2024.messages} messages
- Played over ${db.statistics.newYear2024.chats} chats
                `
                alertMd(markdown)
                return
            }
            db.characters.map((c) => {
                c.chats.map((chat) => {
                    messages += chat.message.length
                })
                chats += c.chats.length
            })
            const markdown = `
# Happy New Year!
You've had:
- Sent over ${messages} messages
- Played over ${chats} chats
            `
            db.statistics.newYear2024 = {
                messages,
                chats
            }
            alertMd(markdown)
        }
    }

</script>

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<h2 class="text-4xl text-textcolor mb-0 mt-6 font-black relative" class:text-bordered={specialDay === 'newYear'} on:click={onClick}>RisuAI
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
    {#if specialDay === 'newYear'}
        <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
        <img src="./sun.webp" alt="sun" class="absolute -z-10"
            style:top={'-50px'}
            style:right={'0px'}
            on:click={onClick}
        >
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