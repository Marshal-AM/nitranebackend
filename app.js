const express = require('express');
const textToSpeech = require('@google-cloud/text-to-speech');
const util = require('util');
const fs = require('fs');
const path = require('path');
const app = express();

process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(__dirname, 'tts creds.json');

// Creates a client
const client = new textToSpeech.TextToSpeechClient();

// Middleware to parse JSON bodies
app.use(express.json());

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

async function generateAudio(text) {
    const request = {
        input: { text: text },
        voice: { languageCode: 'en-IN', name: 'en-IN-Journey-O' },
        audioConfig: { audioEncoding: 'MP3' },
    };

    try {
        const [response] = await client.synthesizeSpeech(request);
        const filename = `audio_${Date.now()}.mp3`;
        const filepath = path.join(uploadsDir, filename);
        await util.promisify(fs.writeFile)(filepath, response.audioContent, 'binary');
        return `/audio/${filename}`;
    } catch (error) {
        console.error('Error generating audio:', error);
        throw error;
    }
}

app.post('/generate-audio', async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        const audioUrl = await generateAudio(text);
        res.json({ url: audioUrl });
    } catch (error) {
        res.status(500).json({ error: 'Error generating audio' });
    }
});

// Serve static audio files
app.use('/audio', express.static(uploadsDir));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});