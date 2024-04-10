import { get } from "svelte/store";
import { runTrigger } from "./process/triggers";
import { CurrentCharacter, CurrentChat } from "./stores";
import { runCharacterJS } from "./plugins/embedscript";


export function startObserveDom(){
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            const node = mutation.target as HTMLElement;
            const triggerName = node.getAttribute('risu-trigger');
            const btnEvent = node.getAttribute('risu-btn');

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
            }

            if(btnEvent){
                node.addEventListener('click',async ()=>{
                    await runCharacterJS({
                        code: null,
                        mode: 'onButtonClick',
                        data: btnEvent
                    })
                }, {passive: true})
            }

        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributeFilter: ['risu-trigger', 'risu-btn'],
    });
}