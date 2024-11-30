// Function to get query parameters
function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    return Object.fromEntries(params);
}

// Function to set input values
function setInputValues(data) {
    Object.keys(data).forEach(key => {
        const input = document.getElementById(key);
        if (input) {
            input.value = data[key];
        }
    });
}

// Function to load initial data
function loadInitialData() {
    const queryParams = getQueryParams();
    
    if (Object.keys(queryParams).length > 0) {
        // Load data from query parameters
        setInputValues(queryParams);
    } else {
        // Pre-populate with user ID 'mona'
        setInputValues({
            line1: 'Mona',
            line2: 'Lisa',
            line3: 'Octocat',
            line4: 'GitHub',
            githubhandle: 'mona'
        });
    }

    drawBadge();
}

// Call loadInitialData when the page loads
window.addEventListener('load', loadInitialData);

const inputs = document.querySelectorAll('input:not(#fullstring)');
const fullStringInput = document.getElementById('fullstring');
const qrcodeContainer = document.getElementById('qrcode');
const canvas = document.getElementById('badgeCanvas');
const ctx = canvas.getContext('2d');
const backgroundImage = new Image();
backgroundImage.src = './back.png';

// Function to fetch GitHub user data
async function fetchGitHubUser(username) {
    try {
        if (username.startsWith('@')) {
            username = username.slice(1);
        }
        if (username) 
        {
            const response = await fetch(`https://api.github.com/users/${username}`);
            if (!response.ok) throw new Error('User not found');
            return await response.json();
        }

    } catch (error) {
        console.error('Error fetching GitHub user:', error);
    }
    return null;
}

function cleanJobTitle(title) {
    return title.replace(/\s*@\w+$/, '').trim();
}

function updateInput(input, value) {
    const maxLength = parseInt(input.getAttribute('maxlength'));
    if (maxLength && value.length > maxLength) {
        input.value = value.slice(0, maxLength);
    } else {
        input.value = value;
    }
}

// Function to update form fields with GitHub data
function updateFormWithGitHubData(data) {
    if (data) {
        updateInput(document.getElementById('line1'), data.name ? data.name.split(' ')[0] : '');
        updateInput(document.getElementById('line2'), data.name ? data.name.split(' ').slice(1).join(' ') : '');
        updateInput(document.getElementById('line3'), data.bio ? cleanJobTitle(data.bio.split('.')[0].trim()) : '');
        updateInput(document.getElementById('line4'), data.company);
    }
}

// Event handler for GitHub handle input
const populateFieldsFromGitHubProfile = async () => {
    const githubHandleInput = document.getElementById('githubhandle');
    const username = githubHandleInput.value.trim();

    if (username) {
        const userData = await fetchGitHubUser(username);
        updateFormWithGitHubData(userData);
        drawBadge();
    }
}

// Add event listeners to GitHub handle input
const generateBadgeFromGitHubHandleButton = document.getElementById('populatefromgithubhandle');
generateBadgeFromGitHubHandleButton.addEventListener('click', populateFieldsFromGitHubProfile);

inputs.forEach(input => {
    input.addEventListener('input', (e) => {
        drawBadge();
    });
});

drawBadge();

// Draw the badge to a canvas element
function drawBadge() {
    // Enable crisp font rendering
    ctx.textRendering = 'optimizeLegibility';
    ctx.imageSmoothingEnabled = false;
    ctx.antialias = 'none';
    
    const bottomMargin = 10;
    const leftMargin = 10;
    const topMargin = 10;
    
    ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
    ctx.textBaseline = 'top';
    
    // Draw first name in bold
    ctx.font = 'bold 32px "Mona Sans"';
    ctx.fillStyle = '#000000';
    const line1 = document.getElementById('line1').value;
    ctx.fillText(line1, leftMargin, topMargin);
    
    // Draw last name in bold
    ctx.font = 'bold 24px "Mona Sans"';
    const line2 = document.getElementById('line2').value;
    ctx.fillText(line2, leftMargin, 45);
    
    // Calculate dynamic font size for job title
    ctx.font = `16px "Mona Sans"`;
    const line3 = document.getElementById('line3').value;
    ctx.fillText(line3, leftMargin, 85);

    const line4 = document.getElementById('line4').value;
    ctx.fillText(line4, leftMargin, 106);

    // Convert to 2-bit black and white after drawing so you get an accurate preview
    // of e-ink display
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const bwCanvas = convertTo2BitBW(imageData);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bwCanvas, 0, 0);
}

// Replace the font loading with combined font and image loading
Promise.all([
    document.fonts.ready,
    new Promise(resolve => backgroundImage.onload = resolve)
]).then(() => {
    drawBadge();
});

// Update the event listener to handle resize
window.addEventListener('resize', drawBadge);

// Convert image data to 2-bit black and white for e-Ink display
function convertTo2BitBW(imageData) {
    const threshold = 200;  // Adjustable threshold for b/w conversion
    const newCanvas = document.createElement('canvas');
    newCanvas.width = imageData.width;
    newCanvas.height = imageData.height;
    const ctx = newCanvas.getContext('2d');
    
    // Create new imageData
    const newImageData = ctx.createImageData(imageData.width, imageData.height);
    
    for (let i = 0; i < imageData.data.length; i += 4) {
        // Convert to grayscale first using standard BT.2100 / HDR factors
        const gray = (imageData.data[i] * 0.2627 + 
                     imageData.data[i + 1] * 0.678 + 
                     imageData.data[i + 2] * 0.0593);
        
        // Convert to black or white (2-bit)
        const bw = gray < threshold ? 0 : 255;
        
        newImageData.data[i] = bw;     // R
        newImageData.data[i + 1] = bw; // G
        newImageData.data[i + 2] = bw; // B
        newImageData.data[i + 3] = 255;// A
    }
    
    ctx.putImageData(newImageData, 0, 0);
    return newCanvas;
}

// Add the copyToBadge function to handle the file transfer over serial using the Web Serial API
async function copyToBadge() {
    if ('serial' in navigator) {
        try {
            // Request a serial port
            const port = await navigator.serial.requestPort();
            await port.open({ baudRate: 115200 });

            const encoder = new TextEncoderStream();
            const writableStreamClosed = encoder.readable.pipeTo(port.writable);
            const writer = encoder.writable.getWriter();

            const decoder = new TextDecoderStream();
            const readableStreamClosed = port.readable.pipeTo(decoder.writable);
            const reader = decoder.readable.getReader();

            // Helper function to send data
            async function sendCommand(command) {
                await writer.write(command + '\r\n');
            }

            // Enter raw REPL mode in Micropython
            await sendCommand('\x03'); // Ctrl-C
            await sendCommand('\x01'); // Ctrl-A
            await sendCommand('');     // Clear the input buffer

            // Prepare files to send
            const pythonCode = `import badger2040
import pngdec

display = badger2040.Badger2040()
png = pngdec.PNG(display.display)

display.led(128)
display.clear()

try:
    png.open_file("badge.png")
    png.decode()
except (OSError, RuntimeError):
    print("Badge background error")

display.update()`;

            // Get canvas image data as binary
            const canvas = document.getElementById('badgeCanvas');
            const imageBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            const imageArrayBuffer = await imageBlob.arrayBuffer();
            const imageUint8Array = new Uint8Array(imageArrayBuffer);

            // Send main.py
            await sendCommand(`f = open('main.py', 'w')`);
            const pythonLines = pythonCode.split('\n');
            for (const line of pythonLines) {
                await sendCommand(`f.write('${line}\\n')`);
            }
            await sendCommand(`f.close()`);

            // Send badge.png
            await sendCommand(`f = open('badge.png', 'wb')`);
            const chunkSize = 256;
            for (let i = 0; i < imageUint8Array.length; i += chunkSize) {
                const chunk = imageUint8Array.slice(i, i + chunkSize);
                const hexString = Array.from(chunk).map(b => b.toString(16).padStart(2, '0')).join('');
                await sendCommand(`f.write(bytes.fromhex('${hexString}'))`);
            }
            await sendCommand(`f.close()`);

            // Reset device
            await sendCommand('import machine; machine.reset()'); // Reboot badge

            // Exit raw REPL mode
            await sendCommand('\x04'); // Ctrl-D

            // Close streams and port
            writer.close();
            await writableStreamClosed;
            reader.cancel();
            await readableStreamClosed;
            await port.close();

            //alert('Files transferred successfully!');
        } catch (error) {
            console.error('Error:', error);
            //alert('An error occurred while transferring files.');
        }
    } else {
        alert('Web Serial API not supported in this browser.');
    }
}
