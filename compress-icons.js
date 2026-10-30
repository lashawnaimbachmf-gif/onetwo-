const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, 'static', 'icons');
const files = [
    'icon-upload.png',
    'icon-calendar.png',
    'icon-image.png',
    'icon-calendar-setting.png',
    'icon-edit.png'
];

async function compress() {
    for (const file of files) {
        const inputPath = path.join(iconsDir, file);
        const outputPath = path.join(iconsDir, file);

        const originalSize = fs.statSync(inputPath).size;
        console.log(`${file}: ${(originalSize / 1024).toFixed(1)}KB`);

        await sharp(inputPath)
            .png({ quality: 80, compressionLevel: 9 })
            .toFile(outputPath + '.tmp');

        const newSize = fs.statSync(outputPath + '.tmp').size;
        console.log(`  -> Compressed: ${(newSize / 1024).toFixed(1)}KB (saved ${((originalSize - newSize) / 1024).toFixed(1)}KB)`);

        fs.unlinkSync(inputPath);
        fs.renameSync(outputPath + '.tmp', inputPath);
    }
    console.log('Done!');
}

compress().catch(console.error);