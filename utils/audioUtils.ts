import { Mp3Encoder } from 'lamejs';
import saveAs from 'file-saver';
import { ExportFormat, Mp3Quality } from '../types';

const convertWavToMp3 = async (wavBlob: Blob, quality: Mp3Quality): Promise<Blob> => {
    const wavBuffer = await wavBlob.arrayBuffer();
    const wavDataView = new DataView(wavBuffer);

    // Basic WAV header parsing to get audio format, channels, sample rate, and data
    const format = wavDataView.getUint16(20, true);
    if (format !== 1) { // 1 = PCM
        throw new Error('Only PCM WAV files can be converted.');
    }
    
    const numChannels = wavDataView.getUint16(22, true);
    const sampleRate = wavDataView.getUint32(24, true);
    const bitsPerSample = wavDataView.getUint16(34, true);

    if (bitsPerSample !== 16) {
        throw new Error('Only 16-bit WAV files can be converted.');
    }

    // Find the 'data' subchunk
    let pos = 12; // First subchunk ID from RIFF header
    while (pos < wavDataView.byteLength) {
        const id = String.fromCharCode(wavDataView.getUint8(pos), wavDataView.getUint8(pos + 1), wavDataView.getUint8(pos + 2), wavDataView.getUint8(pos + 3));
        const size = wavDataView.getUint32(pos + 4, true);
        if (id === 'data') {
            pos += 8; // move to start of data
            break;
        }
        pos += 8 + size;
    }
    
    if (pos >= wavDataView.byteLength) {
        throw new Error('WAV "data" chunk not found.');
    }

    const pcmData = new Int16Array(wavBuffer, pos);

    const bitrateMap = {
        'Compressed': 64,
        'Standard': 128,
        'Max': 320,
    };
    
    const encoder = new Mp3Encoder(numChannels, sampleRate, bitrateMap[quality]);
    const mp3Data = [];

    const sampleBlockSize = 1152; // For MPEG-1, Layer III
    for (let i = 0; i < pcmData.length; i += sampleBlockSize) {
        const sampleChunk = pcmData.subarray(i, i + sampleBlockSize);
        const mp3buf = encoder.encodeBuffer(sampleChunk);
        if (mp3buf.length > 0) {
            mp3Data.push(mp3buf);
        }
    }
    const mp3buf = encoder.flush();
    if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
    }
    
    return new Blob(mp3Data, { type: 'audio/mpeg' });
};


export const exportAudio = async (
    audioUrl: string, 
    format: ExportFormat, 
    quality: Mp3Quality,
    filename: string
) => {
    try {
        const response = await fetch(audioUrl);
        const wavBlob = await response.blob();

        if (format === 'MP3') {
            const mp3Blob = await convertWavToMp3(wavBlob, quality);
            saveAs(mp3Blob, `${filename}.mp3`);
        } else {
            saveAs(wavBlob, `${filename}.wav`);
        }
    } catch (error) {
        console.error('Failed to export audio:', error);
        alert(`Error exporting audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};
