import { alertError } from "../alert";
import { getCurrentCharacter, getDatabase, type character } from "../storage/database.svelte";
import { runTranslator, translateVox } from "../translator/translator";
import { globalFetch, loadAsset } from "../globalApi.svelte";
import { language } from "src/lang";
import { sleep } from "../util";
import { runVITS } from "./transformers";
import {
    getTTSPreprocessors,
    getTTSPostprocessors,
    runHookPipeline,
    type BeforeTTSContext,
    type BeforeTTSResult,
    type AfterTTSContext,
    type AfterTTSResult,
} from "./ttsHooks";
import {
    buildMinimaxTTSRequest,
    decodeMinimaxTTSAudio,
    minimaxTTSMimeType,
} from "./ttsMinimax";

let sourceNode:AudioBufferSourceNode = null

/**
 * Run every registered TTS postprocessor hook against the audio bytes, honoring
 * replacement audio / mimeType / skip semantics. Before each hook invocation a
 * fresh slice of the current base audio is handed to the hook as its disposable
 * copy — the plugin sandbox postMessage layer transfers that buffer into the
 * iframe and neuters it on the host side, so reusing a single slice across
 * multiple hooks would leave all hooks after the first with a detached buffer.
 *
 * Returns the final audio bytes (possibly replaced by a hook), the final
 * mimeType, and whether a hook requested a skip.
 */
async function runPostprocessorPipeline(
    audio: ArrayBuffer,
    mimeType: string,
    ctx: { ttsMode: string; characterId: string },
): Promise<{ audio: ArrayBuffer; mimeType: string; skip: boolean }> {
    const hooks = getTTSPostprocessors();
    if (hooks.length === 0) return { audio, mimeType, skip: false };

    let currentAudio = audio;
    let currentMime = mimeType;

    for (const hook of hooks) {
        const disposable = currentAudio.slice(0); // fresh clone per hook
        let result: AfterTTSResult | void;
        try {
            result = await Promise.resolve().then(() =>
                hook({
                    audio: disposable,
                    mimeType: currentMime,
                    ttsMode: ctx.ttsMode,
                    characterId: ctx.characterId,
                })
            );
        } catch (err) {
            console.error('[TTS postprocessor] threw, continuing with next hook:', err);
            continue;
        }

        if (!result) continue;
        if (result.skip) return { audio: currentAudio, mimeType: currentMime, skip: true };
        if (result.audio && result.audio.byteLength > 0) currentAudio = result.audio;
        if (typeof result.mimeType === 'string' && result.mimeType) currentMime = result.mimeType;
    }

    return { audio: currentAudio, mimeType: currentMime, skip: false };
}

async function playAudio(audio: ArrayBuffer, mimeType: string, ctx: { ttsMode: string; characterId: string }): Promise<void> {
    const processed = await runPostprocessorPipeline(audio, mimeType, ctx);
    if (processed.skip) return;

    const audioContext = new AudioContext();
    const decoded = await audioContext.decodeAudioData(processed.audio);
    sourceNode = audioContext.createBufferSource();
    sourceNode.buffer = decoded;
    sourceNode.connect(audioContext.destination);
    sourceNode.start();
}

export async function sayTTS(character:character,text:string) {
    try {
        if(!character){
            const v = getCurrentCharacter()
            if(v.type === 'group'){
                return
            }
            character = v
        }

        if(!text){
            return
        }
    
        let db = getDatabase()
        text = text.replace(/\*/g,'')
    
        if(character.ttsReadOnlyQuoted){
            const matches = text.match(/["「](.*?)["」]/g)
            if(matches && matches.length > 0){
                text = matches.map(match => match.slice(1, -1)).join("");
            }
            else{
                text = ''
            }
        }

        const beforeResult = await runHookPipeline<BeforeTTSContext, BeforeTTSResult>(
            getTTSPreprocessors(),
            { text, ttsMode: character.ttsMode ?? '', characterId: character.chaId },
        );
        if (beforeResult.skip) {
            return;
        }
        text = beforeResult.ctx.text;

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
                const da = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${character.ttsSpeech}`, {
                    body: JSON.stringify({
                        text: text,
                        model_id: "eleven_multilingual_v2"
                    }),
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        'xi-api-key': db.elevenLabKey || undefined
                    }
                })
                if(da.status >= 200 && da.status < 300){
                    const buffer = await da.arrayBuffer()
                    const mimeType = da.headers.get('content-type') || 'audio/mpeg'
                    await playAudio(buffer, mimeType, { ttsMode: character.ttsMode ?? '', characterId: character.chaId })
                }
                else{
                    alertError(await da.text())
                }
                break
            }
            case "VOICEVOX": {
                const jpText = await translateVox(text)
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
                        await playAudio(await getVoice.arrayBuffer(), 'audio/wav', { ttsMode: character.ttsMode ?? '', characterId: character.chaId })
                    }
                }
                break
            }
            case 'openai':{
                const cfg = character.oaiTTSConfig?.enabled ? character.oaiTTSConfig : null
                const baseURL = (cfg?.baseURL?.trim() || 'https://api.openai.com/v1').replace(/\/+$/, '')
                const apiKey  = (cfg?.apiKey || db.openAIKey || '').trim()
                const model   = cfg?.model || 'tts-1'
                const voice   = cfg?.voice || character.oaiVoice || 'alloy'
                const format  = cfg?.format || 'mp3'

                const res = await globalFetch(`${baseURL}/audio/speech`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(apiKey ? { 'Authorization': 'Bearer ' + apiKey } : {}),
                    },
                    body: {
                        model,
                        input: text,
                        voice,
                        response_format: format,
                    },
                    rawResponse: true,
                })
                const dat = res.data

                if(res.ok){
                    try {
                        const audio = Buffer.from(dat).buffer
                        await playAudio(audio, 'audio/mpeg', { ttsMode: character.ttsMode ?? '', characterId: character.chaId })
                    } catch (error) {
                        alertError(language.errors.httpError + `${error}`)
                    }
                }
                else{
                    if(dat.error && dat.error.message){
                        alertError((language.errors.httpError + `${dat.error.message}`))
                    }
                    else{
                        alertError((language.errors.httpError + `${Buffer.from(res.data).toString()}`))
                    }
                }
                break;

            }
            case 'novelai': {
                if(text === ''){
                    break;
                }
                const encodedText = encodeURIComponent(text);
                const encodedSeed = encodeURIComponent(character.naittsConfig.voice);

                const url = `https://api.novelai.net/ai/generate-voice?text=${encodedText}&voice=-1&seed=${encodedSeed}&opus=false&version=${character.naittsConfig.version}`;

                const response = await globalFetch(url, {
                    method: 'GET',
                    headers: {
                        "Authorization": "Bearer " + db.NAIApiKey,
                    },
                    rawResponse: true
                });

                if (response.ok) {
                    await playAudio(response.data.buffer, 'audio/wav', { ttsMode: character.ttsMode ?? '', characterId: character.chaId })
                } else {
                    alertError("Error fetching or decoding audio data");
                }
                break;
            }
            case 'huggingface': {
                while(true){
                    if(character.hfTTS.language !== 'en'){
                        text = await runTranslator(text, false, 'en', character.hfTTS.language)
                    }
                    const response = await fetch(`https://api-inference.huggingface.co/models/${character.hfTTS.model}`, {
                        method: 'POST',
                        headers: {
                            "Authorization": "Bearer " + db.huggingfaceKey,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            inputs: text,
                        })
                    });

                    if(response.status === 503 && response.headers.get('content-type') === 'application/json'){
                        const json = await response.json()
                        if(json.estimated_time){
                            await sleep(json.estimated_time * 1000)
                            continue
                        }
                    }
                    else if(response.status >= 400){
                        alertError(language.errors.httpError + `${await response.text()}`)
                        return
                    }
                    else if (response.status === 200) {
                        const buffer = await response.arrayBuffer();
                        const mimeType = response.headers.get('content-type') || 'audio/wav'
                        await playAudio(buffer, mimeType, { ttsMode: character.ttsMode ?? '', characterId: character.chaId })
                    } else {
                        alertError("Error fetching or decoding audio data");
                    }
                    return
                }
            }
            case 'vits':{
                await runVITS(text, character.vits)
                break;
            }
            case 'gptsovits':{
                const audio: Uint8Array = await loadAsset(character.gptSoVitsConfig.ref_audio_data.assetId);
                const base64Audio = btoa(new Uint8Array(audio).reduce((data, byte) => data + String.fromCharCode(byte), ''));

                const body = {
                    text: text,
                    text_lang: character.gptSoVitsConfig.text_lang,
                    ref_audio_path: undefined,
                    ref_audio_name: character.gptSoVitsConfig.ref_audio_data.fileName,
                    ref_audio_data: base64Audio,
                    prompt_text: undefined,
                    prompt_lang: character.gptSoVitsConfig.prompt_lang,
                    top_p: character.gptSoVitsConfig.top_p,
                    temperature: character.gptSoVitsConfig.temperature,
                    speed_factor: character.gptSoVitsConfig.speed,
                    top_k: character.gptSoVitsConfig.top_k,
                    text_split_method: character.gptSoVitsConfig.text_split_method,
                    parallel_infer: true,
                    // media_type: character.gptSoVitsConfig.ref_audio_data.fileName.split('.')[1],
                    ref_free: character.gptSoVitsConfig.use_long_audio || !character.gptSoVitsConfig.use_prompt,
                }

                if (character.gptSoVitsConfig.use_prompt){
                    body.prompt_text = character.gptSoVitsConfig.prompt
                }

                if (character.gptSoVitsConfig.use_auto_path){
                    console.log('auto')
                    const path = await globalFetch(`${character.gptSoVitsConfig.url}/get_path`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        rawResponse: false,
                        plainFetchDeforce: true,
                    })
                    console.log(path)
                    if(path.ok){
                        body.ref_audio_path = path.data.message + '/public/audio/' + character.gptSoVitsConfig.ref_audio_data.fileName
                    }
                    else{
                        throw new Error('Failed to Auto get path')
                    }
                } else {
                    body.ref_audio_path = character.gptSoVitsConfig.ref_audio_path + '/public/audio/' + character.gptSoVitsConfig.ref_audio_data.fileName
                }
                console.log(body)

                const response = await globalFetch(`${character.gptSoVitsConfig.url}/tts`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: body,
                    rawResponse: true,
                })
                console.log(response)

                if (response.ok) {
                    const mimeType = 'audio/wav'
                    const hookCtx = { ttsMode: character.ttsMode ?? '', characterId: character.chaId }
                    const volume = character.gptSoVitsConfig.volume
                    if (volume !== undefined && volume !== 1.0) {
                        // Volume != 1.0 requires a GainNode in the graph, so we can't
                        // route through playAudio directly. Run the postprocessor
                        // pipeline first to honor plugin hooks consistently, then
                        // build the gain-enabled graph with the final bytes.
                        const processed = await runPostprocessorPipeline(response.data.buffer, mimeType, hookCtx)
                        if (!processed.skip) {
                            const audioContext = new AudioContext();
                            const decoded = await audioContext.decodeAudioData(processed.audio);
                            sourceNode = audioContext.createBufferSource();
                            sourceNode.buffer = decoded;
                            const gainNode = audioContext.createGain();
                            gainNode.gain.value = volume;
                            sourceNode.connect(gainNode);
                            gainNode.connect(audioContext.destination);
                            sourceNode.start();
                        }
                    } else {
                        await playAudio(response.data.buffer, mimeType, hookCtx)
                    }
                } else {
                    const textBuffer: Uint8Array = response.data.buffer
                    const text = Buffer.from(textBuffer).toString('utf-8')
                    throw new Error(text);
                }
                break;
            }
            case 'fishspeech':{
                if (character.fishSpeechConfig.model._id === ''){
                    throw new Error('FishSpeech Model is not selected')
                }

                const body = {
                    text: text,
                    reference_id: character.fishSpeechConfig.model._id,
                    chunk_length: character.fishSpeechConfig.chunk_length,
                    normalize: character.fishSpeechConfig.normalize,
                    format: 'mp3',
                    mp3_bitrate: 192,
                }


                console.log(body)

                const response = await globalFetch(`https://api.fish.audio/v1/tts`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${db.fishSpeechKey}`
                    },
                    body: body,
                    rawResponse: true,
                })
                console.log(response)

                if (response.ok) {
                    await playAudio(response.data.buffer, 'audio/mpeg', { ttsMode: character.ttsMode ?? '', characterId: character.chaId })
                } else {
                    const textBuffer: Uint8Array = response.data.buffer
                    const text = Buffer.from(textBuffer).toString('utf-8')
                    throw new Error(text);
                }
                break;
            }
            case 'minimax':{
                if(text === ''){
                    break;
                }

                const cfg = character.minimaxTTSConfig ?? {}
                const apiKey = (db.minimaxTTSKey || '').trim()
                if(apiKey === ''){
                    throw new Error('MiniMax API key is not set')
                }

                const request = buildMinimaxTTSRequest(text, cfg)

                // The endpoint answers with a JSON envelope, so the parsed
                // response is used instead of rawResponse bytes here.
                const response = await globalFetch(request.url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                    },
                    body: request.body,
                })

                if(!response.ok){
                    const data = response.data
                    throw new Error(typeof data === 'string' ? data : JSON.stringify(data))
                }

                const audio = decodeMinimaxTTSAudio(response.data)
                await playAudio(audio, minimaxTTSMimeType(cfg.format), { ttsMode: character.ttsMode ?? '', characterId: character.chaId })
                break;
            }
        }
    } catch (error) {
        alertError(`TTS Error: ${error}`)
    }
}



export const oaiVoices = [
    'alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'
]

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
    let db = getDatabase()

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
    const db = getDatabase();
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

export function getNovelAIVoices(){
    return [
        {
            gender: "UNISEX",
            voices: ['Anananan']
        },
        {
            gender: "FEMALE",
            voices: ['Aini', 'Orea', 'Claea', 'Lim', 'Aurae', 'Naia']
        },
        {
            gender: "MALE",
            voices: ['Aulon', 'Elei', 'Ogma', 'Raid', 'Pega', 'Lam']
        }
    ];
}

export function FixNAITTS(data:character){
    if (data.naittsConfig === undefined){
        // Mirror the defaults used by CharConfig.svelte's $effect.pre
        // initializer so that the NovelAI request URL — which templates
        // in `version` and branches on `customvoice` — gets valid values
        // instead of the literal string "undefined".
        data.naittsConfig = {
            customvoice: false,
            voice: 'Anananan',
            version: 'v2',
        }
    }

    return data
}
