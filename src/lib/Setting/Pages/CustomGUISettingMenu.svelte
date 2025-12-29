<script lang="ts">
    interface CustomTree {
        name: string; // dom name, like div, span, etc. for component, we use 'component'
        type: string; // type, used for identifying in editor
        class: string[]; // classes, used for styling in tailwind
        children: CustomTree[]; // children, used for nesting
    }

    let tree:CustomTree[] = $state([]) //children of the main tree
    let mainTree:HTMLDivElement = $state()
    let menuOpen:boolean = $state(false)
    let subMenu = $state(0)
    let selectedContatiner = $state('root')

    const builtContainerTrees:CustomTree[] = [
        {
            type: "leftToRightContainer",
            name: "div",
            class: ["flex", "flex-row", "flex-1"],
            children: []
        },
        {
            type: "topToBottomContainer",
            name: "div",
            class: ["flex", "flex-col", "flex-1"],
            children: []
        },
        {
            type: "centeredleftToRightContainer",
            name: "div",
            class: ["flex", "flex-row", "flex-1", "items-center", "justify-center"],
            children: []
        },
        {
            type: "centeredTopToBottomContainer",
            name: "div",
            class: ["flex", "flex-col", "flex-1", "items-center", "justify-center"],
            children: []
        }
    ]

    const builtComponentTrees:CustomTree[] = [
        {
            type: "fullWidthChat",
            name: "component",
            class: ["flex", "flex-col", "flex-1"],
            children: []
        },
        {
            type: "fixedWidthChat",
            name: "component",
            class: ["flex", "flex-col", "w-96"],
            children: []
        },
        {
            type: "sideBarWithCharacter",
            name: "component",
            class: ["flex", "flex-col", "w-96"],
            children: []
        },
        {
            type: "sideBarWithoutCharacter",
            name: "component",
            class: ["flex", "flex-col", "w-96"],
            children: []
        }
    ]


    function renderTree(dom:HTMLElement, currentTree:CustomTree, treeChain:string = "") {
        let element = document.createElement(currentTree.name)
        element.classList.add(...currentTree.class)
        currentTree.children.forEach((child, i) => {
            renderTree(element, child, treeChain + "." + i)
        })

        if(currentTree.type === 'custom'){
            dom.appendChild(element)
        }
        else{
            const textElement = document.createElement('p')
            textElement.innerText = currentTree.type
            if(treeChain === selectedContatiner){
                element.classList.add("bg-blue-200/50", "border-2", "border-blue-400", "relative", "p-4", "z-20")
                textElement.classList.add("absolute", "top-0", "left-0", "bg-blue-200", "p-1", "text-black")
            }
            else{
                element.classList.add("bg-gray-200/50", "border-2", "border-gray-400", "relative", "p-4", "z-20")
                textElement.classList.add("absolute", "top-0", "left-0", "bg-white", "p-1", "text-black")
            }
            element.appendChild(textElement)
            element.setAttribute("x-tree", treeChain)
            dom.appendChild(element)

            element.addEventListener('mouseup', (e) => {
                console.log(treeChain, e.button)
                e.preventDefault()
                e.stopPropagation()
                switch(e.button){
                    case 0:
                        selectedContatiner = treeChain
                        renderMainTree(tree)
                        break
                    case 2:
                        tree = removeTreeChain(tree, treeChain)
                        renderMainTree(tree)
                        break
                }
            })

            element.addEventListener('contextmenu', (e) => {
                e.preventDefault()
                e.stopPropagation()
            })

        }
    }

    function removeTreeChain(tree:CustomTree[], treeChain:string){
        let treeChainArray = treeChain.split(".")
        let currentTree = tree
        for(let i = 0; i < treeChainArray.length; i++){
            let index = parseInt(treeChainArray[i])
            if(i === treeChainArray.length - 1){
                currentTree.splice(index, 1)
            }
            else{
                currentTree = currentTree[index].children
            }
        }
        return tree
    }

    function renderMainTree(tree:CustomTree[]) {
        mainTree.innerHTML = ""
        tree.forEach((child, i) => {
            renderTree(mainTree, child, i.toString())
        })
    }

    function HTMLtoTree(html:string){
        let parser = new DOMParser()
        let doc = parser.parseFromString(html, 'text/html')
        let body = doc.body
        let tree:CustomTree[] = []
        let children = body.children
        for(let i = 0; i < children.length; i++){
            let child = children[i]
            let treeChild:CustomTree = {
                name: child.tagName.toLowerCase(),
                type: child.tagName.toLowerCase(),
                class: child.className.split(" "),
                children: []
            }
            if(child.children.length > 0){
                treeChild.children = HTMLtoTree(child.innerHTML)
            }
            tree.push(treeChild)
        }
        return tree
    }

    function addContainerToTree(container:CustomTree, treeChain:string){

        if(treeChain === 'root'){
            tree.push(container)
            return
        }

        let treeChainArray = treeChain.split(".")
        let currentTree = tree
        for(let i = 0; i < treeChainArray.length; i++){
            let index = parseInt(treeChainArray[i])
            if(i === treeChainArray.length - 1){
                currentTree[index].children.push(container)
            }
            else{
                currentTree = currentTree[index].children
            }
        }
        
    }

    function treeToHTML(tree:CustomTree[], indent:number = 0){
        let html = ""
        const noClosingTag = ["img", "input", "br", "hr"]
        const ind = "    ".repeat(indent)
        tree.forEach(child => {
            if(child.class.length > 0){
                html += `${ind}<${child.name} class="${child.class.join(" ")}">\n`
            }
            else{
                html += `${ind}<${child.name}>\n`
            }

            if(noClosingTag.includes(child.name)){
                return
            }

            if(child.children.length > 0){
                html += treeToHTML(child.children, indent + 1)
            }
            html += `${ind}</${child.name}>\n`
        })
        return html
    }

    interface Props{
        oncontextmenu?: (event: MouseEvent & {
            currentTarget: EventTarget & HTMLDivElement;
        }) => any
    }

    let {
        oncontextmenu
    }:Props = $props()
</script>

<!-- svelte-ignore a11y_role_has_required_aria_props -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="w-full h-full relative flex p-4 border"
    class:border-blue-500={selectedContatiner === 'root'}
    role="option"
    tabindex="0"
    onclick={() => {
        selectedContatiner = 'root'
        renderMainTree(tree)
    }}
    oncontextmenu={(e) => {
        e.preventDefault()
        oncontextmenu?.(e)
    }}
    bind:this={mainTree}
>
    
</div>
{#if menuOpen}
<div class="w-138 max-w-full h-full bg-white text-black border-l border-l-black p-4 flex flex-col gap-2 z-20">
    <div class="flex">
        <button class="mr-2 p-2 border border-black rounded-sm" class:text-gray-500={subMenu !== 0} onclick={() => {
            subMenu = 0
        }}>Component</button>
        <button class="mr-2 p-2 border border-black rounded-sm" class:text-gray-500={subMenu !== 1} onclick={() => {
            subMenu = 1
        }}>Container</button>
        <button class="mr-2 p-2 border border-black rounded-sm" class:text-gray-500={subMenu !== 2} onclick={() => {
            subMenu = 2
        }}>Help</button>
    </div>
    <div class="border-b border-b-gray-200">

    </div>
    {#if subMenu === 0}
        {#each builtComponentTrees as component, i}
            <button class="p-2 border border-black rounded-sm" onclick={() => {
                addContainerToTree(safeStructuredClone(component), selectedContatiner)
                renderMainTree(tree)
            }}>{component.type}</button>
        {/each}
    {:else if subMenu === 1}
        {#each builtContainerTrees as container, i}
            <button class="p-2 border border-black rounded-sm" onclick={() => {
                addContainerToTree(safeStructuredClone(container), selectedContatiner)
                renderMainTree(tree)
            }}>{container.type}</button>
        {/each}
    {:else if subMenu === 2}
        <p>Left click to select, Right click to delete</p>
        <p>Press a component/container in the menu to add it to the selected container</p>
    {/if}
</div>
{:else}
    <button class="absolute top-0 right-0 z-20 p-2 border bg-white rounded-sm" onclick={() => {
        menuOpen = !menuOpen
    }}>Menu</button>
{/if}