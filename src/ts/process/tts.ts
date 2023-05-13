export async function sayTTS(text:string) {
    const utterThis = new SpeechSynthesisUtterance(text);
    const voices = speechSynthesis.getVoices();
    utterThis.voice = voices[0]
    speechSynthesis.speak(utterThis)
}