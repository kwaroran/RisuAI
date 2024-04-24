<script lang="ts">
    import { language } from "src/lang";
    import { Template } from '@huggingface/jinja';
    import TextAreaInput from "../UI/GUI/TextAreaInput.svelte";
    let input = "";
    let json = JSON.stringify({
        "messages": [{
            "role": "user",
            "content": "Hello, I'm a user!"
        }, {
            "role": "assistant",
            "content": "Hello, I'm a bot!"
        }]
    }, null, 4)
    let output = "";
    const onInput = () => {
        try {
            const template = new Template(input);
            const values = JSON.parse(json);
            output = template.render(values);
        } catch (e) {
            output = `Error: ${e}`
        }
    }
</script>

<h2 class="text-4xl text-textcolor my-6 font-black relative">Jinja</h2>

<span class="text-textcolor text-lg">Jinja</span>

<TextAreaInput onInput={onInput} bind:value={input} height="32" />

<span class="text-textcolor text-lg">Data (JSON)</span>

<TextAreaInput bind:value={json} height="32" />

<span class="text-textcolor text-lg">Result</span>

<TextAreaInput value={output} height="32" />