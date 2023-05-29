import { get } from "svelte/store";
import { alertError } from "../alert";
import { DataBase, type character } from "../storage/database";
import { translateVox } from "../translator/translator";

let sourceNode:AudioBufferSourceNode = null

export async function sayTTS(character:character,text:string) {

    let db = get(DataBase)
    text = text.replace(/\*/g,'')

    if(character.ttsReadOnlyQuoted){
        const matches = text.match(/"(.*?)"/g)
        if(matches && matches.length > 0){
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
                sourceNode = audioContext.createBufferSource();
                sourceNode.buffer = audioBuffer;
                sourceNode.connect(audioContext.destination);            
                sourceNode.start();
            }
            else{
                alertError(await da.text())
            }
        }
        case "VOICEVOX": {
            const jpText = await translateVox(text)
            const audioContext = new AudioContext();
            const query = await fetch(`${db.voicevoxUrl}/audio_query?text=${jpText}&speaker=${character.ttsSpeech}`, {
                method: 'POST',
                headers: { "Content-Type": "application/json"},
            })
            if (query.status == 200){
                const queryJson = await query.json();
                const bodyData = {
                    accent_phrases: queryJson.accent_phrases,
                    speedScale: character.voicevoxConfig.SPEED_SCALE,
                    pitchScale: character.voicevoxConfig.PITCH_SCALE,
                    volumeScale: character.voicevoxConfig.VOLUME_SCALE,
                    intonationScale: character.voicevoxConfig.INTONATION_SCALE,
                    prePhonemeLength: queryJson.prePhonemeLength,
                    postPhonemeLength: queryJson.postPhonemeLength,
                    outputSamplingRate: queryJson.outputSamplingRate,
                    outputStereo: queryJson.outputStereo,
                    kana: queryJson.kana,
                }
                const getVoice = await fetch(`${db.voicevoxUrl}/synthesis?speaker=${character.ttsSpeech}`, {
                    method: 'POST',
                    headers: { "Content-Type": "application/json"},
                    body: JSON.stringify(bodyData),
                })
                if (getVoice.status == 200 && getVoice.headers.get('content-type') === 'audio/wav'){
                    const audioBuffer = await audioContext.decodeAudioData(await getVoice.arrayBuffer())
                    sourceNode = audioContext.createBufferSource();
                    sourceNode.buffer = audioBuffer;
                    sourceNode.connect(audioContext.destination);
                    sourceNode.start();
                }
            }
        }
    }

}

export function stopTTS(){
    if(sourceNode){
        sourceNode.stop()
    }
    if(speechSynthesis && SpeechSynthesisUtterance){
        speechSynthesis.cancel()
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

export async function getVOICEVOXVoices() {
    const db = get(DataBase);
    const speakerData = await fetch(`${db.voicevoxUrl}/speakers`)
    const speakerList = await speakerData.json()
    const speakersInfo = speakerList.map((speaker) => {
      const styles = speaker.styles.map((style) => {
        return {name: style.name, id: `${style.id}`}
      })
      return {name: speaker.name, list: JSON.stringify(styles)}
    })
    speakersInfo.unshift({ name: "None", list: null})
    return speakersInfo;
}