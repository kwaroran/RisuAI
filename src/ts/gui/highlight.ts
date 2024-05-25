type HighlightType = 'decorator'|'deprecated'|'cbsnest0'|'cbsnest1'|'cbsnest2'|'cbsnest3'|'cbsnest4'

type HighlightInt = [Range, HighlightType]

let highLights = new Map<number, HighlightInt[]>();

export const highlighter = (highlightDom:HTMLElement, id:number) => {
    if(highlightDom){
        if(!CSS.highlights){
            return
        }

        const walker = document.createTreeWalker(highlightDom, NodeFilter.SHOW_TEXT)
        const nodes:Node[] = []
        let currentNode = walker.nextNode();
        while (currentNode) {
            nodes.push(currentNode);
            currentNode = walker.nextNode();
        }
        const str = "{{char}}"
        if (!str) {
            return;
        }

        const ranges:HighlightInt[] = []

        nodes.map((el) => {
            // const indices = [];
            const text = el.textContent.toLowerCase()
            // let startPos = 0;
            // while (startPos < text.length) {
            //     const index = text.indexOf(str, startPos);
            //     if (index === -1) break;
            //     indices.push(index);
            //     startPos = index + str.length;
            // }

            // // Create a range object for each instance of
            // // str we found in the text node.
            // return indices.map((index) => {
            //     const range = new Range();
            //     range.setStart(el, index);
            //     range.setEnd(el, index + str.length);
            //     return range;
            // });

            const cbsParsed = simpleCBSHighlightParser(el,text)
            ranges.push(...cbsParsed)

            for(const syntax of highlighterSyntax){
                const regex = syntax.regex
                let match:RegExpExecArray | null;
                while ((match = regex.exec(text)) !== null) {
                    const length = match[0].length;
                    const index = match.index;
                    const range = new Range();
                    range.setStart(el, index);
                    range.setEnd(el, index + length);
                    ranges.push([range, syntax.type])
                }
            }
        });

        highLights.set(id, ranges)

        runHighlight()
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
    'previous_char_chat', 'lastcharmessage', 'previous_user_chat', 'lastusermessage', 'char', 'bot',
    'user', 'char_persona', 'description', 'char_desc', 'example_dialogue',
    'example_message', 'persona', 'user_persona', 'lorebook', 'world_info', 'history', 'messages',
    'chat_index', 'first_msg_index', 'blank', 'none', 'message_time', 'message_date', 'time',
    'date', 'isotime', 'isodate', 'message_idle_duration', 'idle_duration', 'br', 'newline',
    'model', 'axmodel', 'role', 'jbtoggled', 'random', 'maxcontext', 'lastmessage', 'lastmessageid',
    'lastmessageindex', 'emotionlist', 'assetlist', 'prefill_supported', 'unixtime', '/', '/if', '/each', '/pure', '/if_pure',
]

const normalCBSwithParams = [
    'getvar', 'calc', 'addvar', 'setvar', 'setdefaultvar', 'button', 'equal', 'not_equal', 'file',
    'startswith', 'endswith', 'contains', 'replace', 'split', 'join', 'spread', 'trim', 'length',
    'arraylength', 'array_length', 'lower', 'upper', 'capitalize', 'round', 'floor', 'ceil', 'abs',
    'previous_chat_log', 'tonumber', 'arrayelement', 'array_element', 'arrayshift', 'array_shift',
    'arraypop', 'array_pop', 'arraypush', 'array_push', 'arraysplice', 'array_splice',
    'makearray', 'array', 'a', 'make_array', 'history', 'messages', 'range', 'date', 'time', 'datetimeformat', 'date_time_format',
    'random', 'pick', 'roll', 'datetimeformat', 'hidden_key', 'reverse', 'comment'
]

const specialCBS = [
    '#if', '#if_pure ', '#pure ', '#each ', 'random:', 'pick:', 'roll:', 'datetimeformat:', '? ', 'hidden_key: ', 'reverse: ', 'comment: ',
]

const deprecatedCBS = [
    'personality', 'scenario', 'main_prompt', 'system_prompt', 'ujb', 'global_note', 'system_note',
]

const deprecatedCBSwithParams = [
    'greater', 'less', 'greater_equal', 'less_equal', 'and', 'or', 'not', 'remaind', 'pow'
]

const decorators = [
    'activate_only_after', 'activate_only_every', 'keep_activate_after_match', 'dont_activate_after_match', 'depth', 'reverse_depth',
    'instruct_depth', 'reverse_instruct_depth', 'instruct_scan_depth', 'role', 'scan_depth', 'is_greeting', 'position', 'ignore_on_max_context',
    'additional_keys', 'exclude_keys', 'is_user_icon', 'activate', 'dont_activate', 'disable_ui_prompt'
]

const deprecatedDecorators = [
    'end', 'assistant', 'user', 'system'
]
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


function simpleCBSHighlightParser(node:Node,text:string){
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
                for(const arg of specialCBS){
                    if(upString.startsWith(arg)){
                        highlightMode[depth] = 1
                        break
                    }
                }
            }

            colorHighlight()
        }
    }

    const colorHighlight = () => {
        if(highlightMode[depth] !== 10){
            const range = new Range();
            range.setStart(node, depthStarts[depth] - 2);
            range.setEnd(node, pointer + 2);
            switch(highlightMode[depth]){
                case 1:
                    ranges.push([range, `cbsnest${depth % 5}` as HighlightType])
                    break;
                case 3:
                    ranges.push([range, 'deprecated'])
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