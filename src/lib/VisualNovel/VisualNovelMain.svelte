<script lang="ts">
    import { getCustomBackground, getEmotion } from "../../ts/util";
    import { DataBase } from "../../ts/storage/database";
    import BackgroundDom from "../ChatScreens/BackgroundDom.svelte";
    import SideBarArrow from "../UI/GUI/SideBarArrow.svelte";
    import defaultWallpaper from './test.png'
    import VisualNovelChat from "./VisualNovelChat.svelte";

    const wallPaper = `background-image: url(${defaultWallpaper})`
    let forceRender:() => void = $state()
    let bgImg= $state('')
    let lastBg = $state('')
    $effect.pre(() => {
        (async () =>{
            if($DataBase.customBackground !== lastBg){
                lastBg = $DataBase.customBackground
                bgImg = await getCustomBackground($DataBase.customBackground)
            }
        })()
    });
</script>
<div class="flex-grow h-full min-w-0 relative justify-center flex">
    <SideBarArrow />
    <BackgroundDom />
    <div style={wallPaper} class="h-full w-full bg-cover" onclick={() => {
        forceRender()
    }}>
        <VisualNovelChat />
    </div>
</div>