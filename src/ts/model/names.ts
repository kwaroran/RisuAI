
export function getModelName(name:string){
    switch(name){
        case "gpt35":
            return "GPT-3.5 Turbo"
        case "gpt35_0613":
            return "GPT-3.5 Turbo 0613"
        case "gpt35_0301":
            return "GPT-3.5 Turbo 0301"
        case "gpt35_16k":
            return "GPT-3.5 Turbo 16k"
        case "gpt35_16k_0613":
            return "GPT-3.5 Turbo 16k 0613"
        case 'instructgpt35':
            return 'GPT-3.5 Turbo Instruct'
        case "gpt4":
            return "GPT-4"
        case "gpt4_0301":
            return "GPT-4 0301"
        case "gpt4_32k":
            return "GPT-4 32k"
        case "gpt4_0613":
            return "GPT-4 0613"
        case "gpt4_32k_0613":
            return "GPT-4 32k 0613"
        case "gpt4_1106":
            return "GPT-4 Turbo 1106"
        case 'gpt45':
            return 'GPT-4.5'
        case "gpt35_1106":
            return "GPT-3.5 Turbo 1106"
        case 'local_gptq':
            return 'Local Model GPTQ'
        case "palm2":
            return "PaLM2 Bison"
        case "textgen_webui":
            return "Oobabooga Legacy"
        case 'ooba':
            return 'Oobabooga'
        case "mancer":
            return "Mancer"
        case "kobold":
            return "Kobold"
        case "custom":
            return "Plugin"
        case "novelai":
            return "NovelAI Clio"
        case "novelai_kayra":
            return "NovelAI Kayra"
        case "novellist":
            return "NovelList SuperTrin"
        case "novellist damsel":
            return "NovelList Damsel"
        case 'reverse_proxy':
            return "Custom (OpenAI-compatible)"
        case 'openrouter':
            return "OpenRouter"
        case 'gptvi4_1106':
            return "GPT-4 Turbo 1106 Vision"
        case 'palm2_unicorn':
            return "PaLM2 Unicorn"
        case 'mistral-tiny':
            return "Mistral Tiny"
        case 'mistral-small':
            return "Mistral Small"
        case 'mistral-medium':
            return "Mistral Medium"
        case 'gemini-pro':
            return "Gemini Pro"
        case 'horde:::auto':
            return 'Horde Auto Model'
        case 'gpt4_0125':
            return 'GPT-4 Turbo 0125'
        case 'gpt35_0125':
            return 'GPT-3.5 Turbo 0125'
        case 'gemini-ultra':
            return 'Gemini Ultra'
        case 'gemini-ultra-vision':
            return 'Gemini Ultra Vision'
        case 'claude-3-opus-20240229':
            return 'Claude 3 Opus (20240229)'
        case 'claude-3-sonnet-20240229':
            return 'Claude 3 Sonnet (20240229)'
        case 'mistral-large-latest':
            return 'Mistral Large'
        case 'mistral-small-latest':
            return 'Mistral Small'
        case 'mistral-medium-latest':
            return 'Mistral Medium'
        case 'claude-3-haiku-20240307':
            return 'Claude 3 Haiku (20240307)'
        default:
            if(name.startsWith("horde:::")){
                const split = name.split(":::")
                return `Horde ${split[1]}`
            }
            if(name.startsWith('tf:::')){
                const split = name.split(":::")
                return `${split[1]}`
            }
            if(name.startsWith('local_')){
                const realName = name.replace('local_', '').split(/(\\|\/)/g).at(-1)
                return `GGUF ${realName}`
            }
            return name
    }
}

export function getModelShortName(model:string){
    if(model.startsWith("gpt35")){
        return "GPT-3.5"
    }
    if(model.startsWith("gpt4")){
        return "GPT-4"
    }
    if(model.startsWith("gptvi4")){
        return "GPT-4V"
    }
    if(model.startsWith("mistral")){
        return getModelName(model).split(" ").at(-1)
    }
    if(model.startsWith("mancer")){
        return "Mancer"
    }
    if(model.startsWith('tf:::')){
        const split = model.split(":::")
        return split[1]
    }
    if(model.startsWith('local_')){
        const realName = model.replace('local_', '').split(/(\\|\/)/g).at(-1)
        return realName
    }
    if(model.startsWith('horde:::')){
        const split = model.split(":::")
        return split[1]
    }

    if(model.startsWith('claude-3')){
        const split = model.split("-")
        if(!isNaN(parseInt(split[split.length-1]))){
            return split[split.length-2]
        }
        else{
            return split[split.length-1]
        }
    }
    if(model.startsWith('reverse_proxy')){
        return 'Custom'
    }
    if(model.startsWith('oaicomp')){
        return 'Custom'
    }
    return getModelName(model)

}