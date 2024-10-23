import { writeInlayImage } from "./files/image";
import type { character } from "../storage/database.svelte";
import { generateAIImage } from "./stableDiff";

const imggenRegex = [/<ImgGen="(.+?)">/gi, /{{ImgGen="(.+?)"}}/gi] as const

export function runInlayScreen(char:character, data:string):{text:string, promise?:Promise<string>} {
    if(char.inlayViewScreen){      
        if(char.viewScreen === 'emotion'){
            return {text: data.replace(/<Emotion="(.+?)">/gi, '{{emotion::$1}}')}
        }
        if(char.viewScreen === 'imggen'){
            return {
                text: data.replace(imggenRegex[0],'[Generating...]').replace(imggenRegex[1],'[Generating...]'),
                promise : (async () => {
                    for(const regex of imggenRegex){
                        const promises:Promise<string|false>[] = [];
                        const neg = char.newGenData.negative
                        data.replace(regex, (match, p1) => {
                            const prompt = char.newGenData.prompt.replaceAll('{{slot}}', p1)
                            promises.push((async () => {
                                const v = await generateAIImage(prompt, char, neg, 'inlay')
                                if(!v){
                                    return ''
                                }
                                const imgHTML = new Image()
                                imgHTML.src = v
                                const inlay = await writeInlayImage(imgHTML)
                                return inlay
                            })())
                            return match
                        })
                        const d = await Promise.all(promises)
                        data = data.replace(regex, () => {
                            const result = d.shift()
                            if(result === false){
                                return ''
                            }
                            return result
                        })
                    }
                    return data
                })()
            }
        }
        
    }

    return {text: data}
}

export function updateInlayScreen(char:character):character {
    switch(char.viewScreen){
        case 'emotion':
            if(char.inlayViewScreen){
                char.newGenData = {
                    prompt: '',
                    negative: '',
                    instructions: '',
                    emotionInstructions: `You must always output the character's emotional image as a command at the end of a conversation. The command must be selected from a given list, and it's better to have variety than to repeat images used in previous chats. Use one image, depending on the character's emotion. See the list below. Form: <Emotion="<image command>"> Example: <Emotion="Agree"> List of commands: {{slot}}`,
                }
                return char
            }
            char.newGenData = {
                prompt: '',
                negative: '',
                instructions: '',
                emotionInstructions: `You must always output the character's emotional image as a command. The command must be selected from a given list, only output the command, depending on the character's emotion. List of commands: {{slot}}`
            }
            return char
        case 'imggen':
            if(char.inlayViewScreen){
                char.newGenData = {
                    prompt: 'best quality, {{slot}}',
                    negative: 'worse quality',
                    instructions: 'You must always output the character\'s image as a keyword-formatted prompts that can be used in stable diffusion  at the end of a conversation. Use one image, depending on character, place, situation, etc. keyword should be long enough. Form: <ImgGen="<keyword-formatted prompt>">',
                    emotionInstructions: ''
                }
                return char
            }
            char.newGenData = {
                prompt: 'best quality, {{slot}}',
                negative: 'worse quality',
                instructions: 'You must always output the character\'s image as a keyword-formatted prompts that can be used in stable diffusion. only output the that prompt, depending on character, place, situation, etc. keyword should be long enough.',
                emotionInstructions: ''
            }
            return char
        default:
            char.newGenData = {
                prompt: '',
                negative: '',
                instructions: '',
                emotionInstructions: ''
            }
            return char
    }
}