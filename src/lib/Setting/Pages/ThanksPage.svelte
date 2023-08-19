<script lang="ts">
    import { language } from "src/lang";


    interface SupporterImaged{
        name: string,
        image: string,
    }

    interface supporters{
        I: string[],
        II: string[],
        III: string[],
        IV: SupporterImaged[],
        V: SupporterImaged[],
    }

    async function loadSupporters() {
        const dummy:supporters = {
            //random names
            I: ["John", "Doe"],
            II: ["Lorem", "Ipsum"],
            III: ["Dolor", "Sit"],
            IV: [
                {
                    name: "John",
                    image: "https://placehold.co/600x400",
                },
                {
                    name: "Doe",
                    image: "https://placehold.co/600x400",
                },
            ],
            V: [
                {
                    name: "John",
                    image: "https://placehold.co/600x400",
                },
                {
                    name: "Doe",
                    image: "https://placehold.co/600x400",
                },
            ],
        }
        return dummy
    }
</script>
<h2 class="text-2xl font-bold mt-2">{language.supporterThanks}</h2>
<span class="mb-2 text-textcolor2">{language.supporterThanksDesc}</span>

{#await loadSupporters() then supporter}
    <h3 class="text-xl font-bold mt-4">Supporter V</h3>
    <div class="flex w-full flex-wrap gap-2"> 
        {#each supporter.V as support}
            <!-- make a card -->
            <div class="flex flex-col items-center justify-center p-4 border-selected border rounded">
                <img class="w-44 h-44 rounded-t" src={support.image} alt={support.name} />
                <!-- prietty nameplate diamond style -->
                <div class="w-44 bg-selected rounded-b-lg flex justify-center items-center p-2">
                    <span class="font-black prism-font prism-font-gold text-xl">{support.name}</span>
                </div>
            </div>
        {/each}
    </div>
    <h3 class="text-xl font-bold mt-4">Supporter IV</h3>
    <div class="flex w-full flex-wrap gap-2"> 
        {#each supporter.IV as support}
            <!-- make a card -->
            <div class="flex flex-col items-center justify-center p-4 border-selected border rounded">
                <img class="w-32 h-32 rounded-t" src={support.image} alt={support.name} />
                <!-- prietty nameplate diamond style -->
                <div class="w-32 bg-selected rounded-b-lg flex justify-center items-center p-1">
                    <span class="font-black prism-font prism-font-silver text-lg">{support.name}</span>
                </div>
            </div>
        {/each}
    </div>
    <h3 class="text-xl font-bold mt-4">Supporter III</h3>
    <div class="flex w-full flex-wrap gap-2"> 
        {#each supporter.III as support}
            <!-- make a card -->
            <div class="flex flex-col items-center justify-center border-selected border rounded">
                <div class="w-32 flex justify-center items-center p-1">
                    <span class="font-black prism-font prism-font-silver text-lg">{support}</span>
                </div>
            </div>
        {/each}
    </div>
    <h3 class="text-xl font-bold mt-4">Supporter II</h3>
    <div class="flex w-full flex-wrap gap-2"> 
        {#each supporter.II as support}
            <!-- make a card -->
            <div class="flex flex-col items-center justify-center border-selected border rounded">
                <div class="w-32 flex justify-center items-center p-1">
                    <span class="font-bold prism-font prism-font-copper text-lg">{support}</span>
                </div>
            </div>
        {/each}
    </div>
    <h3 class="text-xl font-bold mt-4">Supporter I</h3>
    <div class="flex w-full flex-wrap gap-2"> 
        {#each supporter.I as support}
            <!-- make a card -->
            <div class="flex flex-col items-center justify-center border-selected border rounded">
                <div class="w-32 flex justify-center items-center p-1">
                    <span class="font-bold prism-font prism-font-copper">{support}</span>
                </div>
            </div>
        {/each}
    </div>
{/await}


<style>

    .prism-font-silver{
        background: linear-gradient(to right, #777, #fff ,#777, #fff, #777);
    }
    .prism-font-gold{
        background: linear-gradient(to right, #D4AF32, #fff ,#D4AF32, #fff, #D4AF32);
    }
    .prism-font-ruby{
        background: linear-gradient(to right, #E0115F, #fff ,#E0115F, #fff, #E0115F);
    }
    .prism-font-copper{
        background: linear-gradient(to right, #B87333, #fff ,#B87333, #fff, #B87333);
    }

    .prism-font{
		text-align: center;
		color: transparent;
        background-size: 125px 100%;
		background-clip: text;
		animation-name: shimmer;
		animation-duration: 2s;
		animation-iteration-count: infinite;
		background-repeat: no-repeat;
		background-position: 0 0;
		background-color: #222;
    }
    @keyframes shimmer {
		0% {
			background-position: top left;
		}
		50% {
			background-position: top right;
		}
        0% {
			background-position: top left;
		}
    }
</style>