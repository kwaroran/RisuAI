import { get } from "svelte/store";
import { runTrigger } from "./process/triggers";
import { CurrentChat } from "./storage/database";
import { CurrentCharacter } from "./storage/database";
import { runCharacterJS } from "./plugins/embedscript";
import { sleep } from "./util";


function nodeObserve(node:HTMLElement){
    const triggerName = node.getAttribute('risu-trigger');
    const btnEvent = node.getAttribute('risu-btn');
    const observerAdded = node.getAttribute('risu-observer');

    if(observerAdded){
        return
    }
    if(triggerName){
        node.addEventListener('click', async () => {
            const currentChar = get(CurrentCharacter)
            if(currentChar.type === 'group'){
                return;
            }
            const triggerResult = await runTrigger(currentChar, 'manual', {
                chat: get(CurrentChat),
                manualName: triggerName,
            });

            if(triggerResult){
               CurrentChat.set(triggerResult.chat);
            }
            
        }, {
            passive: true,
        });
        node.setAttribute('risu-observer', 'true');
        return
    }

    if(btnEvent){
        node.addEventListener('click',async ()=>{
            await runCharacterJS({
                code: null,
                mode: 'onButtonClick',
                data: btnEvent
            })
        }, {passive: true})
        node.setAttribute('risu-observer', 'true');
        return
    }
}

export async function startObserveDom(){
    //We are using a while loop intead of MutationObserver because MutationObserver is expensive for just a few elements
    while(true){
        document.querySelectorAll('[risu-trigger]').forEach(nodeObserve);
        document.querySelectorAll('[risu-btn]').forEach(nodeObserve);
        await sleep(100);
    }
}