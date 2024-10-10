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
            firstname: 'Mona',
            lastname: 'Lisa',
            company: 'GitHub',
            jobtitle: 'Octocat',
            pronouns: '',
            githubhandle: 'mona'
        });
    }
    
    // Update full string after setting initial values
    updateFullString();
}

// Call loadInitialData when the page loads
window.addEventListener('load', loadInitialData);

const inputs = document.querySelectorAll('input:not(#fullstring)');
const fullStringInput = document.getElementById('fullstring');
const qrcodeContainer = document.getElementById('qrcode');

function updateFullString() {
    const id = '01234567890'; // Static ID for this example
    
    // Create an object to store field values by name
    const fieldValues = {};
    inputs.forEach(input => {
        if (input.name === 'githubhandle') {
            fieldValues[input.name] = input.value ? `@${input.value}` : '';
        } else {
            fieldValues[input.name] = input.value;
        }
    });

    // Define the order of fields
    const fieldOrder = ['firstname', 'lastname', 'company', 'jobtitle', 'pronouns', 'githubhandle'];

    // Map the ordered fields to their values
    const orderedValues = fieldOrder.map(fieldName => fieldValues[fieldName] || '');

    // Join the values and create the full string
    fullStringInput.value = `${id}iD^${orderedValues.join('^')}^`;
    generateQRCode();
}

function generateQRCode() {
    qrcodeContainer.innerHTML = '';
    const qr = qrcode(0, 'L');
    qr.addData(fullStringInput.value);
    qr.make();
    qrcodeContainer.innerHTML = qr.createImgTag(5);
}

// Debounce function to limit API calls
function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

// Function to fetch GitHub user data
async function fetchGitHubUser(username) {
    try {
        const response = await fetch(`https://api.github.com/users/${username}`);
        if (!response.ok) throw new Error('User not found');
        return await response.json();
    } catch (error) {
        console.error('Error fetching GitHub user:', error);
        return null;
    }
}

// Function to update form fields with GitHub data
function updateFormWithGitHubData(data) {
    if (data) {
        document.getElementById('firstname').value = data.name ? data.name.split(' ')[0] : '';
        document.getElementById('lastname').value = data.name ? data.name.split(' ').slice(1).join(' ') : '';
        document.getElementById('company').value = data.company ? data.company.replace(/^@/, '') : '';
        document.getElementById('jobtitle').value = data.bio ? data.bio.split('.')[0].trim() : '';
        updateFullString(); // Update the full string with new data
    }
}

// Event handler for GitHub handle input
const handleGitHubInput = debounce(async (event) => {
    const username = event.target.value.trim();
    if (username) {
        const userData = await fetchGitHubUser(username);
        updateFormWithGitHubData(userData);
    }
}, 250); // 250ms delay

// Add event listeners to GitHub handle input
const githubHandleInput = document.getElementById('githubhandle');
githubHandleInput.addEventListener('input', handleGitHubInput);
githubHandleInput.addEventListener('blur', handleGitHubInput);

inputs.forEach(input => {
    input.addEventListener('input', updateFullString);
});

updateFullString(); // Initial generation

const otherInputs = document.querySelectorAll('input:not(#fullstring)');

function parseFullString(fullString) {
    const parts = fullString.split('^');
    const id = parts[0].replace('iD', '');
    const fields = ['firstname', 'lastname', 'company', 'jobtitle', 'pronouns', 'githubhandle'];
    const values = parts.slice(1, -1); // Exclude the last empty element

    const result = { id };
    fields.forEach((field, index) => {
        result[field] = values[index] || '';
    });

    if (result.githubhandle && !result.githubhandle.startsWith('@')) {
        result.githubhandle = '@' + result.githubhandle;
    }

    return result;
}

function updateFieldsFromFullString() {
    const parsed = parseFullString(fullStringInput.value);
    
    otherInputs.forEach(input => {
        if (parsed.hasOwnProperty(input.name)) {
            input.value = parsed[input.name];
        }
    });
}

const debounceUpdateFields = debounce(updateFieldsFromFullString, 250);

fullStringInput.addEventListener('input', debounceUpdateFields);
fullStringInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        updateFieldsFromFullString();
    }
});
