<script lang="ts">
    import { language } from "src/lang";
    import TextInput from "../UI/GUI/TextInput.svelte";
    import TextAreaInput from "../UI/GUI/TextAreaInput.svelte";
    import Button from "../UI/GUI/Button.svelte";
    import { jsonOutputTrimmer, selectSingleFile } from "src/ts/util";
    import { requestChatData } from "src/ts/process/request/request";
    import { alertError } from "src/ts/alert";
    import SelectInput from "../UI/GUI/SelectInput.svelte";
    import NumberInput from "../UI/GUI/NumberInput.svelte";

    const autoPrompt = ('extract text chunk from the image, with all the positions and background color, and translate them to {{slot}} in a JSON format.Format of: \n\n [\n  {\n    "bg_hex_color": string\n    "content": string\n    "text_hex_color": string,\n    "x_max": number,\n    "x_min": number,\n    "y_max": number,\n    "y_min": number\n    "translation": string,\n  }\n]\n\n each properties is:\n - x_min, y_min, x_max, y_max: range of 0 (most left/top point of the image) to 1 (most bottom/right point of the image), it is the bounding boxes of the original text chunk.\n - bg_hex_color is the color of the background.\n - text_hex_color is the color of the text.\n - translation is the translated text.\n - content is the original text chunk.').replace(/\n/g, '\\n');
    const manualPrompt = (`extract text from the image, and translate it to {{slot}} in a JSON format. Format of: \n\n{\n  "content": string,\n  "translation": string\n}\n\n each properties is:\n - content: the original text chunk.\n - translation: the translated text.`).replace(/\n/g, '\\n');

    let mode:'auto'|'manual' = $state('auto');
    let fontSize = $state(0);
    let selLang = $state("en");
    let prompt = $state(autoPrompt);
    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D;
    let inputImage: HTMLImageElement;
    let output = $state('')
    let loading = $state(false);
    let aspectRatio = 1;
    let fontFamily = $state('Arial');

    async function selectFile(){
        const file = await selectSingleFile(['png', 'jpg', 'jpeg','gif','webp','avif']);
        if (!file){
            loading = false;
            return;
        };

        if(!ctx){
            ctx = canvas.getContext('2d');
        }
        const img = new Image();
        inputImage = img;
        //@ts-expect-error Uint8Array buffer type (ArrayBufferLike) is incompatible with BlobPart's ArrayBuffer
        img.src = URL.createObjectURL(new Blob([file.data]));
        await img.decode();
        aspectRatio = img.width / img.height;
        canvas.width = img.width;
        canvas.height = img.height;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        output = ''
    }

    async function imageTranslate(type:number = 0) {
        if(loading){
            return;
        }
        loading = true;
        try {
            if(mode === 'auto'){
            await selectFile()
            }

            let data:string = ''

            let [x_min, y_min, x_max, y_max] = [0, 0, 1, 1];
            if(mode === 'auto'){
                data = canvas.toDataURL('image/png');
            }
            else{
                if(!inputImage){
                    return alertError('Please select an image first');
                }
                const slicedCanvas = document.createElement('canvas');
                slicedCanvas.width = canvas.width;
                slicedCanvas.height = canvas.height;
                const slicedCtx = slicedCanvas.getContext('2d');
                if(!slicedCtx){
                    return alertError('Failed to create canvas context');
                }
                const selectionRect = selection.getBoundingClientRect();
                const canvasRect = canvas.getBoundingClientRect();
                x_min = (selectionRect.left - canvasRect.left) / canvas.width;
                y_min = (selectionRect.top - canvasRect.top) / canvas.height;
                x_max = (selectionRect.right - canvasRect.left) / canvas.width;
                y_max = (selectionRect.bottom - canvasRect.top) / canvas.height;
                const width = x_max - x_min;
                const height = y_max - y_min;
                slicedCtx.drawImage(inputImage, x_min * canvas.width, y_min * canvas.height, width * canvas.width, height * canvas.height, 0, 0, slicedCanvas.width, slicedCanvas.height);
                data = slicedCanvas.toDataURL('image/png');
            }

            const schema = mode === 'auto' ? {
                "$schema": "https://json-schema.org/draft/2020-12/schema",
                "additionalProperties": false,
                "type": "ARRAY",
                "items": {
                    "type": "object",
                    "additionalProperties": false,
                    "properties": {
                        "y_min": {
                            "type": "number"
                        },
                        "x_min": {
                            "type": "number"
                        },
                        "y_max": {
                            "type": "number"
                        },
                        "x_max": {
                            "type": "number"
                        },
                        "bg_hex_color": {
                            "type": "string"
                        },
                        "text_hex_color": {
                            "type": "string"
                        },
                        "content": {
                            "type": "string"
                        },
                        "translation": {
                            "type": "string"
                        }
                    },
                    "required": [
                        "y_min",
                        "x_min",
                        "y_max",
                        "x_max",
                        "content",
                        "translation",
                        "bg_hex_color",
                        "text_hex_color"
                    ]
                },
            } : { //auto
                '$schema': 'https://json-schema.org/draft/2020-12/schema',
                'type': 'object',
                'additionalProperties': false,
                'properties': {
                    'content': {
                        'type': 'string'
                    },
                    'translation': {
                        'type': 'string'
                    },
                    "bg_hex_color": {
                        "type": "string"
                    },
                    "text_hex_color": {
                        "type": "string"
                    },
                },
                "required": [
                    'content',
                    'translation',
                    'bg_hex_color',
                    'text_hex_color'
                ]
            }
    

            const d = await requestChatData({
                formated: [{
                    role: 'user',
                    content: prompt.replace('{{slot}}', selLang),
                    multimodals: [{
                        type: 'image',
                        base64: data,
                    }],
                }],
                bias: {},
                schema: JSON.stringify(schema)
            }, 'translate')

            if(d.type === 'streaming' || d.type === 'multiline'){
                loading = false;
                return alertError('This model is not supported in the playground')
            }

            if(d.type !== 'success'){
                alertError(d.result)
            }

            if(mode === 'manual'){
                let outputObj:any[] = []
                console.log(d.result)
                console.log(jsonOutputTrimmer(d.result))
                const resultParsed = JSON.parse(jsonOutputTrimmer(d.result));
                if(output){
                    try {
                    outputObj = JSON.parse(output);                        
                    } catch (error) {
                    
                    }
                }
                outputObj.push({
                    x_min: x_min,
                    y_min: y_min,
                    x_max: x_max,
                    y_max: y_max,
                    bg_hex_color: resultParsed.bg_hex_color,
                    text_hex_color: resultParsed.text_hex_color,
                    content: resultParsed.content,
                    translation: resultParsed.translation,
                    center: true,
                    fontSize: fontSize, //0 = auto
                });
                console.log(outputObj)
                output = JSON.stringify(outputObj, null, 2);
                loading = false;
                render();
                return;
            }
            else{

                output = d.result
                output = JSON.stringify(JSON.parse(jsonOutputTrimmer(d.result)), null, 2);
                loading = false;
                render()
            }

        } catch (error) {
            alertError(JSON.stringify(error))
        } finally {
            loading = false;
        }
    }


    async function render() {
        if(!inputImage){
            return
        }
        if(!ctx){
            ctx = canvas.getContext('2d');
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(inputImage, 0, 0, canvas.width, canvas.height);

        const data = JSON.parse(output);

        for (const item of data) {
            let [x_min, y_min, x_max, y_max] = [item.x_min, item.y_min, item.x_max, item.y_max];

            if(x_min <= 1){
                x_min *= canvas.width;
                y_min *= canvas.height;
                x_max *= canvas.width;
                y_max *= canvas.height;
            }

            ctx.fillStyle = item.bg_hex_color;
            ctx.fillRect(x_min, y_min, x_max - x_min, y_max - y_min);
            // ctx.fillStyle = item.text_hex_color;
            // ctx.fillText(item.translation, x_min, y_min);

            //make text wrap, and fit the text in the box
            const text = item.translation;
            const maxWidth = x_max - x_min;
            const maxHeight = y_max - y_min;
            const textSizes = [288, 216, 192, 144, 120, 108, 96, 84, 76, 72, 68, 64, 60, 56, 52, 48, 44, 40, 36, 32, 28, 24, 20, 18, 16, 14, 12, 10];
            let lineHeight = 0;
            let fillText:[string,number,number][] = []
            for(let i = 0; i < textSizes.length; i++){
                let fontSize = textSizes[i];
                if(item.fontSize && item.fontSize < fontSize){
                    fontSize = item.fontSize;
                }
                ctx.font = `${fontSize}px ${fontFamily}`;
                fillText = [];
                lineHeight = fontSize * 1.2;
                let words = text.split(/[\n\r\s]+/);
                let line = '';
                let y = y_min + lineHeight;
                for (let n = 0; n < words.length; n++) {
                    let testLine = line + words[n] + ' ';
                    let metrics = ctx.measureText(testLine);
                    let testWidth = metrics.width;

                    if(ctx.measureText(words[n]).width > maxWidth){
                        y = y_max+1 //to avoid rendering text that is too long
                        continue
                    }
                    if (testWidth > maxWidth && n > 0) {
                        ctx.fillStyle = item.text_hex_color;
                        let x = x_min
                        if(item.center){
                            x = x_min + (maxWidth - ctx.measureText(line).width) / 2;
                        }
                        fillText.push([line, x, y]);
                        line = words[n] + ' ';
                        y += lineHeight;
                    } else {
                        line = testLine;
                    }
                }
                if(y > y_max){
                    continue
                }
                ctx.fillStyle = item.text_hex_color;
                let x = x_min;
                if(item.center){
                    x = x_min + (maxWidth - ctx.measureText(line).width) / 2;
                }
                fillText.push([line, x, y]);
                break
            }

            for(const [textLine, x, y] of fillText){
                ctx.fillText(textLine, x, y);
            }

        }

        console.log('rendered')
        
    }

    $effect(() => {
        if(mode === 'auto'){
            prompt = autoPrompt;
        } else {
            prompt = manualPrompt;
        }
        render();
    });

    let selection: HTMLDivElement;
    let mouseDown = false;
</script>
<SelectInput bind:value={mode} className="w-1/2">
    <option value="auto">{"auto"}</option>
    <option value="manual">{"manual"}</option>
</SelectInput>

<span class="text-textcolor text-lg mt-4">{language.destinationLanguage}</span>
<TextInput bind:value={selLang} />

<span class="text-textcolor text-lg mt-4">{language.prompt}</span>
<TextAreaInput bind:value={prompt} />


<span class="text-textcolor text-lg mt-4">{language.font}</span>
<TextInput bind:value={fontFamily} />

<span class="text-textcolor text-lg mt-4">fontSize</span>
<NumberInput bind:value={fontSize} />

{#if mode === 'manual'}
    <Button className="mt-4" onclick={selectFile}>
        {language.image}
    </Button>
{/if}

<Button className="mt-4" onclick={() => imageTranslate(0)}>
    {loading ? 'loading' : language.imageTranslation}
</Button>



{#if output}
    <span class="text-textcolor text-lg mt-4">JSON</span>
    <TextAreaInput bind:value={output} className="overflow-x-auto" onchange={render} />
{/if}

<div class="relative mt-2">
    <canvas bind:this={canvas} class:blur-effect={loading && mode === 'auto'} onpointerdown={(e) => {
        if(mode === 'manual'){
            mouseDown = true;
            selection.classList.remove('hidden');
            selection.style.width = '0px';
            selection.style.height = '0px';
            selection.style.left = '0px';
            selection.style.top = '0px';
            const rect = canvas.getBoundingClientRect();

            const startX = e.clientX - rect.left;
            const startY = e.clientY - rect.top;

            selection.style.left = `${startX}px`;
            selection.style.top = `${startY}px`;
        }}}
        
        onpointermove={(e) => {
            if(mode === 'manual' && mouseDown){
                const rect = canvas.getBoundingClientRect();
                const currentX = e.clientX - rect.left;
                const currentY = e.clientY - rect.top;

                const width = currentX - parseFloat(selection.style.left);
                const height = currentY - parseFloat(selection.style.top);

                selection.style.width = `${Math.abs(width)}px`;
                selection.style.height = `${Math.abs(height)}px`;
                selection.style.left = `${Math.min(currentX, parseFloat(selection.style.left))}px`;
                selection.style.top = `${Math.min(currentY, parseFloat(selection.style.top))}px`;
                console.log(selection.style.left, selection.style.top, selection.style.width, selection.style.height);
            }
        }}
        
        onpointerup={() => {
            if(mode === 'manual'){
                mouseDown = false;
            }
        }}
        ></canvas>
    <div
        bind:this={selection}
        class="absolute top-0 left-0 w-0 h-0 pointer-events-none z-10 opacity-50 bg-blue-500"
        class:backdrop-blur={loading && mode === 'manual'}
    ></div>
</div>

<style>
    .blur-effect {
        filter: blur(5px);
        animation: blur-animation 1s infinite alternate;
    }
    .backdrop-blur {
        backdrop-filter: blur(5px);
        animation: backdrop-blur-animation 1s infinite alternate;
        transition: background-color 0.3s ease;
    }
    @keyframes blur-animation {
        0% {
            filter: blur(5px);
        }
        50% {
            filter: blur(10px);
        }
        100% {
            filter: blur(5px);
        }
    }
    @keyframes backdrop-blur-animation {
        0% {
            backdrop-filter: blur(5px);
            background-color: rgb(59 130 246 / 50%);
        }
        50% {
            backdrop-filter: blur(10px);
            background-color: rgb(59 130 246 / 70%);
        }
        100% {
            backdrop-filter: blur(5px);
            background-color: rgb(59 130 246 / 50%);
        }
    }
</style>