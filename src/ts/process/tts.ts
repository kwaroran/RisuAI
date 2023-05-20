import { get } from "svelte/store";
import { alertError } from "../alert";
import { DataBase, type character } from "../database";

export async function sayTTS(character:character,text:string) {

    let db = get(DataBase)
    text = text.replace(/\*/g,'')

    if(character.ttsReadOnlyQuoted){
        const matches = text.match(/"(.*?)"/g)
        if(matches.length > 0){
            text = matches.map(match => match.slice(1, -1)).join("");
        }
        else{
            text = ''
        }
    }

    switch(character.ttsMode){
        case "webspeech":{
            if(speechSynthesis && SpeechSynthesisUtterance){
                const utterThis = new SpeechSynthesisUtterance(text);
                const voices = speechSynthesis.getVoices();
                let voiceIndex = 0
                for(let i=0;i<voices.length;i++){
                    if(voices[i].name === character.ttsSpeech){
                        voiceIndex = i
                    }
                }
                utterThis.voice = voices[voiceIndex]
                const speak = speechSynthesis.speak(utterThis)
            }
            break
        }
        case "elevenlab": {
            const audioContext = new AudioContext();
            const da = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${character.ttsSpeech}`, {
                body: JSON.stringify({
                    text: text
                }),
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    'xi-api-key': db.elevenLabKey || undefined
                }
            })
            if(da.status >= 200 && da.status < 300){
                const audioBuffer = await audioContext.decodeAudioData(await da.arrayBuffer())
                const sourceNode = audioContext.createBufferSource();
                sourceNode.buffer = audioBuffer;
                sourceNode.connect(audioContext.destination);            
                sourceNode.start();
            }
            else{
                alertError(await da.text())
            }
        }
    }

}


export function getWebSpeechTTSVoices() {
    return speechSynthesis.getVoices().map(v => {
        return v.name
    })
}

export async function getElevenTTSVoices() {
    let db = get(DataBase)

    const data = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: {
            'xi-api-key': db.elevenLabKey || undefined
        }
    })
    const res = await data.json()

    console.log(res)
    return res.voices
}