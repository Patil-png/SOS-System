const fs = require('fs');
const https = require('https');
const path = require('path');

const url = "https://storage.googleapis.com/download.tensorflow.org/models/tflite/task_library/audio_classification/android/lite-model_yamnet_classification_tflite_1.tflite";
const destDir = path.join(__dirname, 'assets', 'models');
const dest = path.join(destDir, 'yamnet.tflite');

if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

const file = fs.createWriteStream(dest);
https.get(url, function (response) {
    response.pipe(file);
    file.on('finish', function () {
        file.close(() => console.log('Download completed.'));
    });
}).on('error', function (err) {
    fs.unlink(dest);
    console.error('Error downloading:', err.message);
});
