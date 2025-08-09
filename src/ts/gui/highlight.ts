type HighlightType = 'decorator'|'deprecated'|'cbsnest0'|'cbsnest1'|'cbsnest2'|'cbsnest3'|'cbsnest4'|'cbsdisplay'|'comment'

type HighLightRange = [number, number]
type HighlightInt = [HighLightRange, HighlightType]
type HighlightIntRanged = [Range, HighlightType]

let highLights = new Map<number, HighlightIntRanged[]>();

export const highlighter = (highlightDom:HTMLElement, id:number) => {
    try {
    
        if(highlightDom){
            if(!CSS.highlights){
                return
            }
    
            const walker = document.createTreeWalker(highlightDom, NodeFilter.SHOW_TEXT)
            const nodes:Node[] = []
            const nodePointers:number[] = []
            let currentNode = walker.nextNode();
            let fullText = ''
            let pointer = 0
            while (currentNode) {
                pointer += currentNode.textContent.length;
                nodes.push(currentNode);
                nodePointers.push(pointer);
                fullText += currentNode.textContent;
                currentNode = walker.nextNode();
            }

            //this is because we need to match the text content case-insensitively
            fullText = fullText.toLocaleLowerCase()
    
            const ranges:HighlightIntRanged[] = []
            const parsed = simpleCBSHighlightParser(fullText)

            const convertToDomRange = (start:number, end:number):Range[] => {
                const startNodeIndex = nodePointers.findIndex((pointer) => pointer >= start);
                const endNodeIndex = nodePointers.findIndex((pointer) => pointer >= end);

                if (startNodeIndex === -1 || endNodeIndex === -1) {
                    return [];
                }

                const startNode = nodes[startNodeIndex];
                const endNode = nodes[endNodeIndex];

                // const range = new Range();
                // range.setStart(startNode, start - (startNodeIndex > 0 ? nodePointers[startNodeIndex - 1] : 0));
                // range.setEnd(endNode, end - (endNodeIndex > 0 ? nodePointers[endNodeIndex - 1] : 0));

                // return [range];

                if(startNode === endNode){
                    const range = new Range();
                    range.setStart(startNode, start - (startNodeIndex > 0 ? nodePointers[startNodeIndex - 1] : 0));
                    range.setEnd(endNode, end - (endNodeIndex > 0 ? nodePointers[endNodeIndex - 1] : 0));
                    return [range];
                }
                else{
                    const startNodeRange = new Range();
                    const endNodeRange = new Range();
                    startNodeRange.setStart(startNode, start - (startNodeIndex > 0 ? nodePointers[startNodeIndex - 1] : 0));
                    startNodeRange.setEnd(startNode, startNode.textContent.length);
                    endNodeRange.setStart(endNode, 0);
                    endNodeRange.setEnd(endNode, end - (endNodeIndex > 0 ? nodePointers[endNodeIndex - 1] : 0));
                    return [startNodeRange, endNodeRange];
                }
            }
            
            for(let i=0;i<parsed.length;i++){
                const rinit = parsed[i]
                const r = rinit[0]
                const domRange = convertToDomRange(r[0], r[1]);
                for(const range of domRange){
                    ranges.push([range, rinit[1]]);
                }
            }

            for(const syntax of highlighterSyntax){
                const regex = syntax.regex
                let match:RegExpExecArray | null;
                while ((match = regex.exec(fullText)) !== null) {
                    const length = match[0].length;
                    const index = match.index;
                    const converted = convertToDomRange(index, index + length);
                    if (converted) {
                        for(const range of converted){
                            ranges.push([range, syntax.type]);
                        }
                    }
                }
            }
    
            highLights.set(id, ranges)
    
            runHighlight()
        }    
    } catch (error) {
        
    }
}

const runHighlight = () => {
    const formatedRanges:{[key:string]:Range[]} = {}
    for(const h of highLights){
        for(const range of h[1]){
            const type = range[1]
            if(!formatedRanges[type]){
                formatedRanges[type] = []
            }
            formatedRanges[type].push(range[0])
        }
    }

    for(const key in formatedRanges){
        const highlight = new Highlight(...formatedRanges[key]);
        CSS.highlights.set(key, highlight);
    }

}

let highlightIds = 0

export const getNewHighlightId = () => {
    return highlightIds++
}

export const removeHighlight = (id:number) => {
    highLights.delete(id)
}

const normalCBS = [
    'char', 'user', 'char_persona', 'description', 'char_desc', 'example_dialogue', 'previous_char_chat',
    'lastcharmessage', 'previous_user_chat', 'lastusermessage',
    'example_message', 'persona', 'user_persona', 'lorebook', 'world_info', 'history', 'messages',
    'chat_index', 'first_msg_index', 'blank', 'none', 'message_time', 'message_date', 'time',
    'date', 'isotime', 'isodate', 'message_idle_duration', 'idle_duration', 'br', 'newline',
    'model', 'axmodel', 'role', 'jbtoggled', 'random', 'maxcontext', 'lastmessage', 'lastmessageid',
    'lastmessageindex', 'emotionlist', 'assetlist', 'prefill_supported', 'unixtime', 'slot', 'module_enabled',
    'is_first_message', '/', '/if', '/each', '/pure', '/if_pure', '/func', '/pure_display'
]

const normalCBSwithParams = [
    'getvar', 'calc', 'addvar', 'setvar', 'setdefaultvar', 'button', 'equal', 'not_equal', 'file',
    'startswith', 'endswith', 'contains', 'replace', 'split', 'join', 'spread', 'trim', 'length',
    'arraylength', 'array_length', 'lower', 'upper', 'capitalize', 'round', 'floor', 'ceil', 'abs',
    'previous_chat_log', 'tonumber', 'arrayelement', 'array_element', 'arrayshift', 'array_shift',
    'arraypop', 'array_pop', 'arraypush', 'array_push', 'arraysplice', 'array_splice',
    'makearray', 'array', 'a', 'make_array', 'history', 'messages', 'range', 'date', 'time', 'datetimeformat', 'date_time_format',
    'random', 'pick', 'roll', 'datetimeformat', 'hidden_key', 'reverse', 'getglobalvar', 'position', 'slot', 'rollp',
    'and', 'or', 'not', 'message_time_array', 'filter', 'greater', 'less', 'greater_equal', 'less_equal', 'arg'
]

const displayRelatedCBS = [
    'raw', 'img', 'video', 'audio', 'bg', 'emotion', 'asset', 'video-img', 'comment', 'image'
];

const nestedCBS = [
    '#if', '#if_pure ', '#pure ', '#each ', '#func', '#pure_display'
]

const specialCBS = [
    'random:', 'pick:', 'roll:', 'datetimeformat:', '? ', 'hidden_key: ', 'reverse: ', ...nestedCBS
]

const deprecatedCBS = [
    'personality', 'scenario', 'main_prompt', 'system_prompt', 'ujb', 'global_note', 'system_note',
]

const deprecatedCBSwithParams = [
    'remaind', 'pow'
]

export const decorators = [
    'activate_only_after', 'activate_only_every', 'keep_activate_after_match', 'dont_activate_after_match', 'depth', 'reverse_depth',
    'instruct_depth', 'reverse_instruct_depth', 'instruct_scan_depth', 'role', 'scan_depth', 'is_greeting', 'position', 'ignore_on_max_context',
    'additional_keys', 'exclude_keys', 'is_user_icon', 'activate', 'dont_activate', 'disable_ui_prompt', 'probability', 'exclude_keys_all', 'match_full_word', 'match_partial_word'
]

const deprecatedDecorators = [
    'end', 'assistant', 'user', 'system'
]

export const AllCBS = [...normalCBS, ...(normalCBSwithParams.concat(displayRelatedCBS).map((v) => {
    return v + ':'
})), ...nestedCBS]

const highlighterSyntax = [
    {
        regex: /<(char|user|bot)>/gi,
        type: 'deprecated'
    },
    {
        regex: new RegExp(`@@@?(${decorators.join('|')})`, 'gi'),
        type: 'decorator'
    },
    {
        regex: new RegExp(`@@@?(${deprecatedDecorators.join('|')})`, 'gi'),
        type: 'deprecated'
    },
] as const


function simpleCBSHighlightParser(text:string){
    let depth = 0
    let pointer = 0
    let depthStarts = new Uint8Array(100)
    let highlightMode = new Uint8Array(100)

    const ranges:HighlightInt[] = []
    const excludesRanges:[number,number][] = []

    text = text.toLowerCase()

    const checkHighlight = () => {
        if(depth !== 0 && highlightMode[depth] === 0){
            highlightMode[depth] = 10
            const upString = text.slice(depthStarts[depth], pointer)

            if(highlightMode[depth] === 10){
                for(const arg of normalCBS){
                    if(upString === arg){
                        highlightMode[depth] = 1
                        break
                    }
                }
            }

            if(highlightMode[depth] === 10){
                for(const arg of deprecatedCBS){
                    if(upString === arg){
                        highlightMode[depth] = 3
                        break
                    }
                }
            }

            if(highlightMode[depth] === 10){
                for(const arg of normalCBSwithParams){
                    if(upString.startsWith(arg + '::')){
                        highlightMode[depth] = 1
                        break
                    }
                }
            }

            if(highlightMode[depth] === 10){
                for(const arg of deprecatedCBSwithParams){
                    if(upString.startsWith(arg + '::')){
                        highlightMode[depth] = 3
                        break
                    }
                }
            }
            
            if(highlightMode[depth] === 10){
                for(const arg of displayRelatedCBS){
                    if(upString.startsWith(arg + '::')){
                        highlightMode[depth] = 2
                        break
                    }
                }
            }

            if(highlightMode[depth] === 10){
                for(const arg of specialCBS){
                    if(upString.startsWith(arg)){
                        highlightMode[depth] = 1
                        break
                    }
                }
            }

            if(upString.startsWith('// ')){
                highlightMode[depth] = 4
            }

            colorHighlight()
        }
    }

    const colorHighlight = () => {
        if(highlightMode[depth] !== 10){
            const range:HighLightRange = [depthStarts[depth] - 2, pointer + 2]
            switch(highlightMode[depth]){
                case 1:
                    ranges.push([range, `cbsnest${depth % 5}` as HighlightType])
                    break;
                case 2:
                    ranges.push([range, 'cbsdisplay'])
                    break;
                case 3:
                    ranges.push([range, 'deprecated'])
                    break;
                case 4:
                    ranges.push([range, 'comment'])
                    break;
            }
        }
    }

    while(pointer < text.length){
        const c = text[pointer]
        const nextC = text[pointer + 1]
        if(c === '{' && nextC === '{'){
            checkHighlight()
            depth++
            pointer++
            depthStarts[depth] = pointer + 1
            highlightMode[depth] = 0
        }else if(c === '}' && nextC === '}'){
            if(highlightMode[depth] === 0){
                checkHighlight()
            }
            else{
                colorHighlight()
            }
            depth--
            pointer++
            depthStarts[depth] = pointer
        }
        pointer++
    }

    return ranges
}