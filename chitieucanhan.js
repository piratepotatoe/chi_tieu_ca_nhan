// Constants

const TOKEN = `6776895322:AAG49MZk1HPhZg6rosv9_ZrjW-7VbuaiM58`;
const BASE_URL = `https://api.telegram.org/bot${TOKEN}`;
const CHAT_ID = 'xxxx';
const DEPLOYED_URL = 'xxxx';
const SUM_CELL = 'E2';
const METHODS = {
    SEND_MESSAGE: 'sendMessage',
    SET_WEBHOOK: 'setWebhook',
    GET_UPDATES: 'getUpdates',
}

// Utils

const toQueryParamsString = (obj) => {
    return Object.keys(obj)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(obj[key])}`)
        .join('&');
}

// Telegram APIs

const makeRequest = async (method, queryParams = {}) => {
    const url = `${BASE_URL}/${method}?${toQueryParamsString(queryParams)}`
    const response = await UrlFetchApp.fetch(url);
    return response.getContentText();
}


const setWebhook = () => {
    makeRequest(METHODS.SET_WEBHOOK,{
        url: DEPLOYED_URL
    })
}

const getChatId = async () => {
    const res = await makeRequest(METHODS.GET_UPDATES);
    const updates = JSON.parse(res).result;

    if (updates.length > 0) {
        // Loop through all updates and find the first message from a group chat
        for (let update of updates) {
            if (update.message && update.message.chat.type === "group") {
                console.log("Group Chat ID: ", update.message.chat.id);
                break;
            }
        }
    } else {
        console.log("No updates found. Ensure the bot is added to a group and has recent messages.");
    }
}


// Google Sheet

const addNewRow = (content = []) => {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const Avals = sheet.getRange("A1:A").getValues();
    const Alast = Avals.filter(String).length;
    const columnNumber = content.length;
    const newRow = sheet.getRange(Alast + 1, 1, 1, columnNumber);
    newRow.setValues([content]);
}

// Extract label & price

const getMultiplyBase = (unitLabel) => {
    switch (unitLabel) {
        case 'k':
        case 'K':
        case 'nghìn':
        case 'ng':
        case 'ngàn':
            return 1000;
        case 'lít':
        case 'lit':
        case 'l':
            return 100000;
        case 'củ':
        case 'tr':
        case 'm':
        case 'M':
            return 1000000;
        default:
            return 1;
    }
};


const doPost = (request) => {
    const contents = JSON.parse(request.postData.contents);
    const text = contents.message.text;
    const chatId = contents.message.chat.id;
    try {
        addExpense(text);
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
        const totalExpenses = sheet.getRange(SUM_CELL).getValue().toLocaleString('vi-VN', {style: 'currency', currency: 'VND'});
        sendMessage(chatId, `Tổng chi tiêu: ${totalExpenses}`);
    } catch (error) {
        // Log the actual error before sending the error message
        console.error('Error:', error);
        sendMessage(chatId, `Sai format, hãy ghi lại`);
    }
};



const sendMessage = async (chat_id, text) => {
    try {
        await makeRequest(METHODS.SEND_MESSAGE, {
            chat_id: chat_id,
            text: text
        });
    } catch (error) {
        console.error('Error sending message:', error);
    }
};


const addExpense = (text) => {
    // This regex allows for:
    // - Amount and unit at the beginning or end of the string
    // - Descriptive text before or after the amount and unit
    // - Optional spaces around the amount and unit
    // - Case-insensitive matching for the unit
    const regex = /(?:^|\s)(\d+)\s*(k|nghìn|ng|ngàn|lít|lit|l|củ|tr|m)(?:\s|$)|(.+?)\s(\d+)\s*(k|nghìn|ng|ngàn|lít|lit|l|củ|tr|m)?\s*$/i;
    const matches = text.match(regex);

    if (matches) {
        let label, amount, unit;

        // Check if the format is <amount><unit> <label>
        if (matches[1] && matches[2]) {
            amount = matches[1];
            unit = matches[2];
            label = text.replace(matches[0], '').trim(); // Remove matched amount and unit, trim remaining as label
        }
        // Else, the format is <label> <amount><unit>
        else if (matches[3] && matches[4]) {
            label = matches[3];
            amount = matches[4];
            unit = matches[5] || '';
        } else {
            throw new Error('Invalid format');
        }

        const time = new Date().toLocaleString();
        const price = Number(amount) * getMultiplyBase(unit);

        addNewRow([time, label, price]);
    } else {
        throw new Error('Invalid format');
    }
};


