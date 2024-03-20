<script lang="ts">
  import { alertMd, alertNormal } from "src/ts/alert";
  import { DataBase } from "src/ts/storage/database";
    import { openURL } from "src/ts/storage/globalApi";
  import { sideBarStore } from "src/ts/stores";

    let specialDay = ''
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
    if( today.getMonth() === 3 && today.getDate() === 14){
        specialDay = 'anniversary'
    }
    if( today.getMonth() === 9 && today.getDate() === 31){
        specialDay = 'halloween'
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
- Sent over ${db.statistics.newYear2024.messages.toLocaleString()} messages
- Played over ${db.statistics.newYear2024.chats.toLocaleString()} chats
*Statistics are approximate*
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
- Sent over ${messages.toLocaleString()} messages
- Played over ${chats.toLocaleString()} chats
*Statistics are approximate*
            `
            db.statistics.newYear2024 = {
                messages,
                chats
            }
            alertMd(markdown)
        }
    }

    let aprilFoolButtonClicked = false

</script>

{#if specialDay === 'aprilFool'}
    <button class="bg-red-600 w-full p-2 mt-4 mb-4 rounded-md max-w-2xl border-4 border-red-800 flex flex-col text-white" on:click={() => {
        sideBarStore.set(false)
        aprilFoolButtonClicked = true
    }}>
        <h1 class="font-bold text-2xl">🔥🔥 RisuLLM Released! 🔥🔥</h1>
        <div class="text-gray-200">Click here to get the latest news!</div>
    </button>
{/if}

{#if aprilFoolButtonClicked}

    <div class="bg-black bg-opacity-45 fixed top-0 bottom-0 w-full h-full z-50 flex items-center justify-center">
        <div class="w-3xl max-w-full bg-darkbg rounded-md p-6 flex flex-col transition-shadow shadow-inner prose prose-invert mt-2 my-2 max-h-full overflow-y-auto">
            <h1 class="font-bold text-2xl">RisuLLM Released!

                <button class="float-right" on:click={() => {
                    aprilFoolButtonClicked = false
                }}>✖</button>
            </h1>
            <p>
                After a long time of development, we are proud to announce the release of RisuLLM! RisuLLM is a new open LLM, focused on providing the best experience for all users. We have worked hard to make RisuLLM the best LLM in the world, and we are confident that you will love it.
            </p>
            <p>
                Please note that RisuLLM is still in beta, so there may be some bugs and issues. We are working hard to fix these issues, and we appreciate your patience and understanding. We hope you enjoy using RisuLLM, and we look forward to your feedback.
            </p>
            <p>
                RisuLLM scored 3.14 in HellaSwag, and 400.1 in MMLU. making the most accurate and intelligent LLM in the world over other competitors including open source and commercial LLMs. 
            </p>
            <p>
                Also, RisuLLM also provides a new technique called "Yuju". This technique makes characters more realistic and intelligent, using the latest AI technology. With RStar, characters can understand and respond to your questions and commands in a more natural and human-like way.
            </p>
            <p>
                Last but not least, RisuLLM is also the first LLM to support 3D holographic projection and 3d printing as output, which allows you to interact with your characters in a whole new way.
            </p>
            <p>
                <!-- svelte-ignore a11y-missing-attribute -->
                For more information, please visit our <a class="cursor-pointer" on:click={() => {
                    openURL("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
                }}>official website for RisuLLM</a>. Or, you can join our discord server to get the latest news and updates. Once again, thank you for your support. Let us know if you have any questions or feedback.
            </p>
        </div>
    </div>
{/if}
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