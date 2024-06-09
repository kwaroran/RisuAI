
const excludesDat = ['<','>','{','}','[',']','(',')','-',':',';','…','—','–','_','*','+','/','\\','|','!','?','.',',',' ']
const selfClosingTags = [
    'br','hr','img','input','meta','link','base','area','col','command','embed','keygen','param','source','track','wbr',
    //self closing tags defined by HTML5
    '!'
    //for doctype <!DOCTYPE html> and comment <!-- -->
]

const checkSelfClosingTag = (dat:string) => {
    dat = dat.substring(0, 10) //we only need to check the first 10 characters, to avoid checking the whole string
    dat = dat.toLowerCase() //we don't care about the case
    for(const tag of selfClosingTags){
        if(dat.startsWith(tag)){
            return true
        }
    }
    return false
}

export function risuFormater(dat:string){
    const lines:[string,string][] = [['','']] // [type, content]
    let htmlType = 0 // 0: not inside tag, 1: closing tag, 2: opening tag
    for(let i=0;i<dat.length;i++){

        //html tag handling
        if(dat[i] === '<' && lines[lines.length-1][0] !== 'code-block'){
            lines.push(['html-tag',''])
            if(dat[i+1] === '/'){
                htmlType = 1
            }
            else{
                htmlType = 2
            }
        }

        if(dat[i] === '>' && lines[lines.length-1][0] === 'html-tag'){
            const pop = lines.pop()
            const tagAttr = pop[1].substring(1).trim()
            if(htmlType === 1){
                const pop2 = lines.pop() //probably html-inner
                const chunk = pop2[1] + pop[1] + '>'
                if(lines[lines.length-1][0] === ''){
                    lines.push(['html-chunk',chunk])
                    lines.push(['',''])
                }
                else{
                    lines[lines.length-1][1] += chunk
                }
                continue
            }
            else if(checkSelfClosingTag(tagAttr)){
                const chunk = pop[1] + '>'
                if(lines[lines.length-1][0] === ''){
                    lines.push(['html-chunk',chunk])
                    lines.push(['',''])
                }
                else{
                    lines[lines.length-1][1] += chunk
                }
                continue
            }
            else{
                lines.push(['html-inner',pop[1]])
            }
            htmlType = 0
        }

        //code block handling

        if(dat[i] === '`' && dat[i+1] === '`' && dat[i+2] === '`' && lines[lines.length-1][0] === ''){
            if(lines[lines.length-1][0] === 'code-block'){
                lines[lines.length-1][1] += '```'
                lines.push(['',''])
            }
            else{
                lines.push(['code-block','```'])
            }
            i += 2
            continue
        }
        

        if(dat[i] === '\n' && lines[lines.length-1][0] === ''){
            lines.push(['newline','\n'])
            lines.push(['',''])
        }
        else{
            lines[lines.length-1][1] += dat[i]
        }
    }

    console.log(lines)

    let result = ''
    for(let i=0;i<lines.length;i++){
        if(lines[i][0] !== ''){
            result += lines[i][1]
            continue
        }

        let line = lines[i][1]
        let isNumbered = false
        let endMarked = false
        if(excludesDat.includes(line[0]) || (line[1] === '.' && ['1','2','3','4','5','6','7','8','9'].includes(line[0]))){
            isNumbered = true
        }
        if(line.endsWith('>') || line.endsWith('}') || line.startsWith('<')){
            endMarked = true
        }

        if(isNumbered || endMarked){
            result += line
            continue
        }

        let depth = 0
        let depthChunk:string[] = ['']
        let depthChunkType:string[] = ['']

        //spaces for detection
        line = ' ' + line + ' '

        for(let j=0;j<line.length;j++){
            switch(line[j]){
                case '"':
                case '“':
                case '”':{
                    if(depthChunkType[depth] === '"'){
                        depthChunkType.pop()
                        const pop = depthChunk.pop()
                        depth--
                        depthChunk[depth] += `<mark risu-mark="quote2">${pop}${line[j]}</mark>`
                    }
                    else{
                        depthChunkType.push('"')
                        depthChunk.push(line[j])
                        depth++
                    }
                    break
                }
                case "'":
                case '‘':
                case '’':{
                    if(depthChunkType[depth] === "'"){
                        if(line[j-1] === ' ' || line[j+1] !== ' ' || (line[j-2] === 'i' && line[j-1] === 'n')){
                            //this is not a quote
                            depthChunk[depth] += line[j]
                        }
                        else{
                            depthChunkType.pop()
                            const pop = depthChunk.pop()
                            depth--
                            depthChunk[depth] += `<mark risu-mark="quote1">${pop}${line[j]}</mark>`
                        }
                    }
                    else{
                        if(line[j-1] !== ' ' || line[j+1] === ' '){
                            //this is not a quote
                            depthChunk[depth] += line[j]
                        }
                        else{
                            depthChunkType.push("'")
                            depthChunk.push(line[j])
                            depth++
                        }
                    }
                    break
                
                }

                default:{
                    depthChunk[depth] += line[j]
                }
            }
        }

        let lineResult = ''

        while(depthChunk.length > 0){
            lineResult = depthChunk.pop() + lineResult
        }

        if(lineResult.startsWith(' ')){
            lineResult = lineResult.substring(1)
        }
        if(lineResult.endsWith(' ')){
            lineResult = lineResult.substring(0,lineResult.length-1)
        }

        console.log(lineResult)

        result += lineResult
    }

    console.log(result)
    return result.trim()
}