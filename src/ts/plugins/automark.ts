const reg:[RegExp,string][] = []


export function autoMarkPlugin(data:string){
    if(reg.length === 0){
        const pluginRegex = [
          {"comment":"[ 💱 ]ㅤ구조변환 #1ㅤ=ㅤ대사 부호 수정","in":"“|”","out":"\"","type":"editdisplay","ableFlag":false},
          {"comment":"[ 💱 ]ㅤ구조변환 #2ㅤ=ㅤ생각 부호 수정","in":"‘|’","out":"'","type":"editdisplay","ableFlag":false},
          {"comment":"[ 🧷 ]ㅤ이탈릭체 #1ㅤ=ㅤ문장 앞 묶음 추가","in":"^(?!\\d\\.)([\\wㄱ-ㅎ가-힣'])(?!.*[{<>}])|(?<=^\\[.*\\] *|^\\(.*\\) *)([\\wㄱ-ㅎ가-힣'])(?!.*[{<>}])","out":"<em>$1$2","type":"editdisplay","ableFlag":true,"flag":"gm"},
          {"comment":"[ 🧷 ]ㅤ이탈릭체 #2ㅤ=ㅤ문장 뒤 묶음 추가","in":"(?<!^ +.*)(\".*|<em>.*)(?<!\")$","out":"$1</em>","type":"editdisplay","ableFlag":true,"flag":"gm"},
          {"comment":"[ 🧷 ]ㅤ대사묶음 #1ㅤ=ㅤ대사 앞 묶음 추가","in":"(?<=<em>.*|^\".*)( +\"[\\S])|(?<=<em>.*|\" +.*)( *\\[)","out":"</em>$1$2","type":"editdisplay","ableFlag":true,"flag":"gm"},
          {"comment":"[ 🧷 ]ㅤ대사묶음 #2ㅤ=ㅤ대사 뒤 묶음 추가","in":"(?<=^\".*|<\\/em>.*)([\\S]\" +|[\\S]\"(?=[,.…ㄱ-ㅎ가-힣]))|(?<=<\\/em>.*)( *\\] *)","out":"$1$2<em>","type":"editdisplay","ableFlag":true,"flag":"gm"},
          {"comment":"[ 🧷 ]ㅤ생각묶음 #1ㅤ=ㅤ생각 앞 묶음 추가","in":"(?<=<em>.*? +|\\[|\\[.* +|\\(|\\(.* +|\"|\".*? +)(?<!style=.*)(')|(?<=<em>)('[\\wㄱ-ㅎ가-힣])","out":"<strong><em>$1$2","type":"editdisplay","ableFlag":true,"flag":"gm"},
          {"comment":"[ 🧷 ]ㅤ생각묶음 #2ㅤ=ㅤ생각 뒤 묶음 추가","in":"(?<=<strong><em>')(.*?')(?= +.+?|[ㄱ-ㅎ가-힣?!:;,.…—-])|(?<=<strong><em>'.*)(')(?=<\\/em>|\")|(?<=\\(<strong><em>')(?=\\))","out":"$1$2</em></strong>","type":"editdisplay","ableFlag":true,"flag":"gm"},
          {"comment":"[ 📝 ]ㅤ추가핫키 #1ㅤ=ㅤ따옴표 추가 : (`)","in":"(?<!`)`(?!`)","out":"\"","type":"editinput","ableFlag":false},
          {"comment":"[ 📝 ]ㅤ추가핫키 #2ㅤ=ㅤOOC 추가 : (``)","in":"^``(?!`) *(.*)$","out":"(OOC: $1)","type":"editinput","ableFlag":true,"flag":"gm"}
        ]
        for(const r of pluginRegex){
            reg.push([new RegExp(r.in, r.ableFlag ? r.flag : 'g'),r.out])
        }
    }
    for(let i=0;i<reg.length;i++){
        data = data.replace(reg[i][0], reg[i][1])
    }


    
    return data
}

export function autoMarkNew(dat:string){
    const excludeTexts = ["#","1.","2.","3.","4.","5.","6.","7.","8.","9.","0."]
    const mark = (data:string) => {
        for(const text of excludeTexts){
            if(data.startsWith(text)){
                return document.createTextNode(data)
            }
        }

        let index = 0
        let stacks:Node[] = [document.createElement('p')]
        let stackText = [""]
        let stackType:number[] = [0]
        function isAlpha(str:string) {
            //check if string is alphabet, including extended latin by charcode. string.length === 1
            const code = str.charCodeAt(0)
            return (code > 64 && code < 91) || (code > 96 && code < 123) || (code > 127 && code < 256)
        }
        let stackIndex = 0
        while(index < data.length){
            switch(data[index]){
                case '"':
                case '“':
                case '”':{
                    if(stackType[stackIndex] === 1){
                        const stack = stacks.pop()
                        stackText[stackIndex] += data[index]
                        stack.appendChild(document.createTextNode(stackText.pop()))
                        stackType.pop()
                        stackIndex--
                        stacks[stackIndex].appendChild(stack)
                    }
                    else{
                        stacks[stackIndex].appendChild(document.createTextNode(stackText[stackIndex]))
                        stackText[stackIndex] = ""
                        stacks.push(document.createElement('x-placeholder'))
                        stackText.push(data[index])
                        stackType.push(1)
                        stackIndex++
                    }
                    break
                }
                case "'":
                case "‘":
                case "’":{
                    if(stackType[stackIndex] === 2){
                        if(data[index+1] === undefined || !isAlpha(data[index+1])){
                            const stack = stacks.pop()
                            stackText[stackIndex] += data[index]
                            stack.appendChild(document.createTextNode(stackText.pop()))
                            stackType.pop()
                            stackIndex--
                            stacks[stackIndex].appendChild(stack)
                        }
                        else{
                            stackText[stackIndex] += data[index]
                        }
                    }
                    else{
                        if(data[index-1] === ' ' || data[index-1] === '\n' || data[index-1] === undefined){
                            stacks[stackIndex].appendChild(document.createTextNode(stackText[stackIndex]))
                            stackText[stackIndex] = ""
                            stacks.push(document.createElement('x-em'))
                            stackText.push(data[index])
                            stackType.push(2)
                            stackIndex++
                        }
                        else{
                            stackText[stackIndex] += data[index]
                        }

                    }
                    break
                }
                case '\n':{
                    stacks[stackIndex].appendChild(document.createTextNode(stackText[stackIndex]))
                    stackText[stackIndex] = ""
                    stacks[stackIndex].appendChild(document.createElement('br'))
                }
                default:{
                    stackText[stackIndex] += data[index]
                }
            }
            index++
        }
        for(let i=stackIndex;i>0;i--){
            stacks[i-1].appendChild(document.createTextNode(stackText[i]))
            stacks[i-1].appendChild(stacks[i])
        }
        stacks[0].appendChild(document.createTextNode(stackText[0]))
        const childs = stacks[0].childNodes
        for(let i=0;i<childs.length;i++){
            if(childs[i].nodeType === 3){
                const marked = document.createElement('em')
                marked.appendChild(document.createTextNode(childs[i].textContent))
                stacks[0].replaceChild(marked, childs[i])
            }
        }

        return stacks[0]
    }

    const domparser = new DOMParser()
    const doc = domparser.parseFromString(`<body>${dat}</body>`, 'text/html')
    const body = doc.body
    console.log(body.innerHTML)
    let newChilds:Node[] = []
    for(let i=0;i<body.childNodes.length;i++){
        if(body.childNodes[i].nodeType === 3){
            const lines = body.childNodes[i].textContent.split('\n')
            for(let j=0;j<lines.length;j++){
                newChilds.push(mark(lines[j]))
            }
        }
        else{
            newChilds.push(body.childNodes[i])
        }
    }

    const newBody = document.createElement('body')
    for(let i=0;i<newChilds.length;i++){
        if(newChilds[i] === null){
            continue
        }
        newBody.appendChild(newChilds[i])
    }
    
    return newBody.innerHTML
}