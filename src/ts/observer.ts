import { get } from "svelte/store";
import { runTrigger } from "./process/triggers";
import { CurrentCharacter, CurrentChat } from "./stores";
import { runCharacterJS } from "./plugins/embedscript";


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

export function startObserveDom(){
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            const node = mutation.target as HTMLElement;
            if(node.nodeType !== 1){
                return;
            }
            node.querySelectorAll('[risu-trigger]').forEach(nodeObserve);
            node.querySelectorAll('[risu-btn]').forEach(nodeObserve);
            nodeObserve(node)
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributeFilter: ['risu-trigger', 'risu-btn'],
        attributes: true,
    });
}