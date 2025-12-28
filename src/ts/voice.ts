
class voiceDetector{

    private userMedia: MediaStream;
    private audioContext: AudioContext;
    private analyser: AnalyserNode;
    private mediaRecorder: MediaRecorder;
    private intervalID: number;
    private audioChunks: {
        data:Blob,
        time: number
    }[];


    async init() {
        this.userMedia = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.audioContext = new AudioContext();
        this.mediaRecorder = new MediaRecorder(this.userMedia);
        this.analyser = this.audioContext.createAnalyser();
        const source = this.audioContext.createMediaStreamSource(this.userMedia);
        source.connect(this.analyser);
        this.audioChunks = [];
        this.mediaRecorder.ondataavailable = (event) => {
            this.audioChunks.push({
                data: event.data,
                time: Date.now()
            });
        };
        this.mediaRecorder.start();        
        //analyze the audio volume every 100ms
        let start = Date.now();
        this.analyser.fftSize = 2048;
        this.intervalID = setInterval(() => {
            const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            this.analyser.getByteTimeDomainData(dataArray);
            const volume = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
            if (Date.now() - start > 10000) {
                this.mediaRecorder.stop();
                clearInterval(this.intervalID);
            }
        }, 100) as any as number;

    }

}