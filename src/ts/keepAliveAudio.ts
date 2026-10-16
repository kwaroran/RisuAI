/**
 * Inaudible looping audio for the "Keep Session Alive: Via Sound" setting.
 *
 * Chrome ignores the element's volume when deciding whether a tab is playing
 * audio: it measures the output signal and treats anything below -72.25 dBFS
 * as silent, so a scaled-down sound never earns the audible-tab exemptions.
 * It also treats media of 5 seconds or less as transient, which on Android
 * means no media notification and no foreground service keeping it alive.
 *
 * The level is therefore baked into the waveform (a 20 Hz tone at about
 * -57 dBFS, below human hearing but above Chrome's threshold), played at full
 * volume, and the clip runs longer than 5 seconds.
 */
export function createKeepAliveAudio() {
    const sampleRate = 8000
    const seconds = 10
    const frequency = 20
    const amplitude = 0.002
    const samples = sampleRate * seconds
    const view = new DataView(new ArrayBuffer(44 + samples * 2))
    const writeString = (offset: number, str: string) => {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i))
        }
    }

    writeString(0, 'RIFF')
    view.setUint32(4, 36 + samples * 2, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true) // PCM
    view.setUint16(22, 1, true) // mono
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * 2, true)
    view.setUint16(32, 2, true)
    view.setUint16(34, 16, true)
    writeString(36, 'data')
    view.setUint32(40, samples * 2, true)
    for (let i = 0; i < samples; i++) {
        const value = Math.sin(2 * Math.PI * frequency * i / sampleRate) * amplitude
        view.setInt16(44 + i * 2, Math.round(value * 32767), true)
    }

    const audio = new Audio(URL.createObjectURL(new Blob([view.buffer], { type: 'audio/wav' })))
    audio.loop = true
    return audio
}
