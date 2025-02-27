chrome.commands.onCommand.addListener((command) => {
    if (command === 'toggle-tabvault') {
        chrome.action.getPopup({}, (currentPopup) => {
            if (!currentPopup) {
                chrome.action.setPopup({ popup: 'popup.html' });
                chrome.action.openPopup();
            } else {
                chrome.action.setPopup({ popup: '' });
            }
        });
    }
});

// Create a simple logging system
const logMessages = [];

function logToDevConsole(message, type = 'info') {
    const logEntry = {
        timestamp: new Date().toISOString(),
        message: message,
        type: type
    };
    
    logMessages.push(logEntry);
    
    // Store only the last 100 messages
    if (logMessages.length > 100) {
        logMessages.shift();
    }
    
    // Save to storage
    chrome.storage.local.set({ tabVaultLogs: logMessages });
    
    // Also log to actual console for developer debugging
    console[type](message);
}

// Expose logging function to other extension components
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'log') {
        logToDevConsole(request.message, request.type || 'info');
        sendResponse({ success: true });
    } else if (request.action === 'getLogs') {
        chrome.storage.local.get(['tabVaultLogs'], (result) => {
            sendResponse({ logs: result.tabVaultLogs || [] });
        });
        return true; // Required for async sendResponse
    }
});