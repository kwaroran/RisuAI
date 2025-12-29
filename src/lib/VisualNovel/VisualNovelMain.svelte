<script lang="ts">
    import { getCustomBackground } from "../../ts/util";
    
    import { DBState } from 'src/ts/stores.svelte';
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
            if(DBState.db.customBackground !== lastBg){
                lastBg = DBState.db.customBackground
                bgImg = await getCustomBackground(DBState.db.customBackground)
            }
        })()
    });
</script>
<div class="grow h-full min-w-0 relative justify-center flex">
    <SideBarArrow />
    <BackgroundDom />
    <div style={wallPaper} class="h-full w-full bg-cover">
        <VisualNovelChat />
    </div>
</div>