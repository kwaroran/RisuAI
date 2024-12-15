import { runTrigger } from "./process/triggers";
import { runCharacterJS } from "./plugins/embedscript";
import { sleep } from "./util";
import { getCurrentCharacter, getCurrentChat, setCurrentChat } from "./storage/database.svelte";


function nodeObserve(node:HTMLElement){
    const triggerName = node.getAttribute('risu-trigger');
    const btnEvent = node.getAttribute('risu-btn');
    const observerAdded = node.getAttribute('risu-observer');
    const hlLang = node.getAttribute('x-hl-lang');

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

    if(hlLang){
        node.addEventListener('contextmenu', (e)=>{
            e.preventDefault();
            const menu = document.createElement('div');
            menu.setAttribute('class', 'fixed z-50 min-w-[160px] py-2 bg-gray-800 rounded-lg border border-gray-700')

            const copyOption = document.createElement('div');
            copyOption.textContent = 'Copy';
            copyOption.setAttribute('class', 'px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 cursor-pointer')
            copyOption.addEventListener('click', ()=>{
                navigator.clipboard.writeText(node.getAttribute('x-hl-text'));
                menu.remove();
            })

            const downloadOption = document.createElement('div');
            downloadOption.textContent = 'Download';
            downloadOption.setAttribute('class', 'px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 cursor-pointer')
            downloadOption.addEventListener('click', ()=>{
                const a = document.createElement('a');
                a.href = URL.createObjectURL(new Blob([node.getAttribute('x-hl-text')], {type: 'text/plain'}));
                a.download = 'code.' + hlLang;
                a.click();
                menu.remove();
            })

            menu.appendChild(copyOption);
            menu.appendChild(downloadOption);

            menu.style.left = e.clientX + 'px';
            menu.style.top = e.clientY + 'px';

            document.body.appendChild(menu);
            
            document.addEventListener('click', ()=>{
                menu.remove();
            }, {once: true})
        })
    }
}

export async function startObserveDom(){
    //For codeblock we are using MutationObserver since it doesn't appear well

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if(node instanceof HTMLElement){
                    nodeObserve(node);
                }
            })
        })
    })

    //We are using a while loop intead of MutationObserver because MutationObserver is expensive for just a few elements
    while(true){
        document.querySelectorAll('[risu-trigger]').forEach(nodeObserve);
        document.querySelectorAll('[risu-btn]').forEach(nodeObserve);
        document.querySelectorAll('[x-hl-lang]').forEach(nodeObserve);
        await sleep(100);
    }
}