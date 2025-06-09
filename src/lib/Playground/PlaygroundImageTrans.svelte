<script lang="ts">
    import { language } from "src/lang";
    import TextInput from "../UI/GUI/TextInput.svelte";
    import TextAreaInput from "../UI/GUI/TextAreaInput.svelte";
    import Button from "../UI/GUI/Button.svelte";
    import { selectSingleFile } from "src/ts/util";
    import { requestChatData } from "src/ts/process/request/request";
    import { alertError } from "src/ts/alert";

    let selLang = $state("en");
    let prompt = $state('extract text chunk from the image, with all the positions and background color, and translate them to {{slot}} in a JSON format.Format of: \n\n [\n  {\n    "bg_hex_color": string\n    "content": string\n    "text_hex_color": string,\n    "x_max": number,\n    "x_min": number,\n    "y_max": number,\n    "y_min": number\n    "translation": string,\n  }\n]\n\n each properties is:\n - x_min, y_min, x_max, y_max: range of 0 (most left/top point of the image) to 1 (most bottom/right point of the image), it is the bounding boxes of the original text chunk.\n - bg_hex_color is the color of the background.\n - text_hex_color is the color of the text.\n - translation is the translated text.\n - content is the original text chunk.');
    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D;
    let inputImage: HTMLImageElement;
    let output = $state('')
    let loading = $state(false);
    let aspectRatio = 1;

    async function imageTranslate() {
        if(loading){
            return;
        }
        loading = true;
        try {
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
            img.src = URL.createObjectURL(new Blob([file.data]));
            await img.decode();
            aspectRatio = img.width / img.height;
            canvas.width = img.width;
            canvas.height = img.height;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);



            const data = canvas.toDataURL('image/png');

            const schema = {
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

            output = d.result
            output = JSON.stringify(JSON.parse(d.result), null, 2);
            loading = false;
            render()
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

            for(let i = 0; i < textSizes.length; i++){
                ctx.font = `${textSizes[i]}px Arial`;
                lineHeight = textSizes[i] * 1.2;
                const lines = text.split('\n');
                let totalHeight = 0;
                let x = 0
                for (let n = 0; n < lines.length; n++) {
                    let testLine = lines[n];
                    let metrics = ctx.measureText(testLine);
                    let testWidth = metrics.width;
                    x += testWidth;
                    if(testWidth > maxWidth){
                        totalHeight = maxHeight + 1;
                        break
                    }

                    if(x > maxWidth){
                        totalHeight += lineHeight;
                        x = testWidth
                    }
                }
                console.log(x, maxWidth, totalHeight, maxHeight, textSizes[i])
                if(totalHeight < maxHeight){
                    break;
                }
            }
            let words = text.split(' ');
            let line = '';
            let y = y_min + lineHeight;
            for (let n = 0; n < words.length; n++) {
                let testLine = line + words[n] + ' ';
                let metrics = ctx.measureText(testLine);
                let testWidth = metrics.width;
                if (testWidth > maxWidth && n > 0) {
                    ctx.fillStyle = item.text_hex_color;
                    ctx.fillText(line, x_min, y);
                    line = words[n] + ' ';
                    y += lineHeight;
                } else {
                    line = testLine;
                }
            }
            ctx.fillStyle = item.text_hex_color;
            ctx.fillText(line, x_min, y);

        }

        console.log('rendered')
        
    }
</script>


<span class="text-textcolor text-lg mt-4">{language.destinationLanguage}</span>
<TextInput bind:value={selLang} />

<span class="text-textcolor text-lg mt-4">{language.prompt}</span>
<TextAreaInput bind:value={prompt} />

<Button className="mt-4" onclick={imageTranslate}>
    {language.imageTranslation}
</Button>

{#if output}
    <span class="text-textcolor text-lg mt-4">JSON</span>
    <TextAreaInput bind:value={output} className="overflow-x-auto" onchange={render} />
{/if}

<canvas class="mt-2" bind:this={canvas} class:blur-effect={loading}></canvas>

<style>
    .blur-effect {
        filter: blur(5px);
        animation: blur-animation 1s infinite alternate;
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
</style>