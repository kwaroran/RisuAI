import { runTrigger } from "./process/triggers";
import { runCharacterJS } from "./plugins/embedscript";
import { sleep } from "./util";
import { getCurrentCharacter, getCurrentChat, setCurrentChat } from "./storage/database";


function nodeObserve(node:HTMLElement){
    const triggerName = node.getAttribute('risu-trigger');
    const btnEvent = node.getAttribute('risu-btn');
    const observerAdded = node.getAttribute('risu-observer');

    if(observerAdded){
        return
    }
    if(triggerName){
        node.addEventListener('click', async () => {
            const currentChar = getCurrentCharacter()
            if(currentChar.type === 'group'){
                return;
            }
            const triggerResult = await runTrigger(currentChar, 'manual', {
                chat: getCurrentChat(),
                manualName: triggerName,
            });

            if(triggerResult){
               setCurrentChat(triggerResult.chat);
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