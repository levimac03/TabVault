document.addEventListener('DOMContentLoaded', () => {
    let workspaces = [];
    let selectedWorkspaceIndex = -1;

    // Log function to send messages to background script
    function log(message, type = 'info') {
        chrome.runtime.sendMessage({
            action: 'log',
            message: message,
            type: type
        });
    }

    // Load workspaces from storage
    chrome.storage.sync.get(['tabVaultWorkspaces'], (result) => {
        try {
            workspaces = result.tabVaultWorkspaces || [];
            renderWorkspaces();
            log('Workspaces loaded successfully', 'info');
        } catch (error) {
            log('Error loading workspaces: ' + error.message, 'error');
            showToast('Error loading workspaces');
        }
    });

    // Render workspace list
    function renderWorkspaces() {
        const list = document.getElementById('tabvault-list');
        list.innerHTML = '';
        
        if (workspaces.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'tabvault-empty-message';
            emptyMessage.textContent = 'No workspaces saved yet. Save your current tabs to get started.';
            list.appendChild(emptyMessage);
            return;
        }
        
        workspaces.forEach((ws, index) => {
            const div = document.createElement('div');
            div.className = 'tabvault-workspace-box';
            if (index === selectedWorkspaceIndex) {
                div.classList.add('selected');
            }
            
            div.innerHTML = `
                <div class="tabvault-workspace">
                    <span class="tabvault-workspace-name">${ws.name}</span>
                    <span class="tabvault-tab-count">${ws.urls.length} tab${ws.urls.length !== 1 ? 's' : ''}</span>
                    <div class="tabvault-actions">
                        <img class="tabvault-icon" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iIzMzMyIgZD0iTTE5IDE5SDVWNGgxMVYyaC0xM0EyIDIgMCAwIDAgMSA2djE0YTIgMiAwIDAgMCAyIDJoMTRhMiAyIDAgMCAwIDItMlY4aC0yem0tMi42MS00LjU5TDExIDE5LjE3IDcuNDEgMTUuNTkgNiAxN2w2IDYgNi02LTEuNDEtMS40MXoiLz48L3N2Zz4=" alt="Rename">
                        <img class="tabvault-icon" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iI2YwNTQ1NCIgZD0iTTE5IDYuNDFMMTcuNTkgNSAxMiAxMC41OSA2LjQxIDUgNSA2LjQxIDEwLjU5IDEyIDUgMTcuNTkgNi40MSAxOSAxMiAxMy40MSAxNy41OSAxOSAxOSAxNy41OSAxMy40MSAxMnoiLz48L3N2Zz4=" alt="Delete">
                    </div>
                </div>
            `;
            
            // Make the whole workspace box clickable for selection
            div.addEventListener('click', (e) => {
                // Don't select if clicking on an action button
                if (!e.target.classList.contains('tabvault-icon')) {
                    selectWorkspace(index);
                }
            });
            
            div.querySelectorAll('.tabvault-icon')[0].addEventListener('click', (e) => {
                e.stopPropagation();
                renameWorkspace(index);
            });
            
            div.querySelectorAll('.tabvault-icon')[1].addEventListener('click', (e) => {
                e.stopPropagation();
                deleteWorkspace(index);
            });
            
            list.appendChild(div);
        });
    }

    // Select a workspace
    function selectWorkspace(index) {
        selectedWorkspaceIndex = (selectedWorkspaceIndex === index) ? -1 : index;
        renderWorkspaces();
        
        const loadBtn = document.getElementById('tabvault-load-btn');
        loadBtn.disabled = selectedWorkspaceIndex === -1;
    }

    // Show toast
    function showToast(message) {
        const toast = document.getElementById('tabvault-toast');
        toast.textContent = message;
        toast.style.opacity = '1';
        setTimeout(() => { toast.style.opacity = '0'; }, 2000);
    }

    // Save current workspace
    document.getElementById('tabvault-save-btn').addEventListener('click', () => {
        try {
            chrome.tabs.query({ currentWindow: true }, (tabs) => {
                const name = prompt('Enter workspace name:', `Workspace ${new Date().toLocaleDateString()}`);
                if (name) {
                    workspaces.push({ name, urls: tabs.map(tab => tab.url) });
                    chrome.storage.sync.set({ tabVaultWorkspaces: workspaces }, () => {
                        renderWorkspaces();
                        showToast('Workspace Saved!');
                        log(`Workspace "${name}" saved with ${tabs.length} tabs`, 'info');
                    });
                }
            });
        } catch (error) {
            log('Error saving workspace: ' + error.message, 'error');
            showToast('Error saving workspace');
        }
    });

    // Load selected workspace
    document.getElementById('tabvault-load-btn').addEventListener('click', () => {
        if (selectedWorkspaceIndex >= 0) {
            openWorkspace(selectedWorkspaceIndex);
        }
    });

    // Open workspace
    function openWorkspace(index) {
        try {
            const workspace = workspaces[index];
            const urls = workspace.urls;
            
            // Create new tabs for each URL
            urls.forEach(url => chrome.tabs.create({ url }));
            
            log(`Loaded workspace "${workspace.name}" with ${urls.length} tabs`, 'info');
            showToast(`Loading ${workspace.name}`);
        } catch (error) {
            log('Error opening workspace: ' + error.message, 'error');
            showToast('Error opening workspace');
        }
    }

    // Rename workspace
    function renameWorkspace(index) {
        try {
            const oldName = workspaces[index].name;
            const newName = prompt('Enter new name:', oldName);
            if (newName) {
                workspaces[index].name = newName;
                chrome.storage.sync.set({ tabVaultWorkspaces: workspaces }, () => {
                    renderWorkspaces();
                    log(`Renamed workspace from "${oldName}" to "${newName}"`, 'info');
                });
            }
        } catch (error) {
            log('Error renaming workspace: ' + error.message, 'error');
            showToast('Error renaming workspace');
        }
    }

    // Delete workspace
    function deleteWorkspace(index) {
        try {
            const workspaceName = workspaces[index].name;
            if (confirm(`Delete workspace "${workspaceName}"?`)) {
                workspaces.splice(index, 1);
                chrome.storage.sync.set({ tabVaultWorkspaces: workspaces }, () => {
                    if (selectedWorkspaceIndex === index) {
                        selectedWorkspaceIndex = -1;
                        document.getElementById('tabvault-load-btn').disabled = true;
                    } else if (selectedWorkspaceIndex > index) {
                        selectedWorkspaceIndex--;
                    }
                    renderWorkspaces();
                    showToast('Workspace Deleted');
                    log(`Deleted workspace "${workspaceName}"`, 'info');
                });
            }
        } catch (error) {
            log('Error deleting workspace: ' + error.message, 'error');
            showToast('Error deleting workspace');
        }
    }

    // Close button
    document.getElementById('tabvault-close-btn').addEventListener('click', () => {
        window.close();
    });

    // Developer options
    const devConsole = document.getElementById('tabvault-dev-console');
    const devBtn = document.getElementById('tabvault-dev-btn');
    const closeDevConsole = document.querySelector('.tabvault-modal-close');

    devBtn.addEventListener('click', () => {
        devConsole.style.display = 'block';
        loadLogs();
    });

    closeDevConsole.addEventListener('click', () => {
        devConsole.style.display = 'none';
    });

    // Click outside to close
    window.addEventListener('click', (e) => {
        if (e.target === devConsole) {
            devConsole.style.display = 'none';
        }
    });

    function loadLogs() {
        chrome.runtime.sendMessage({ action: 'getLogs' }, (response) => {
            const logContainer = document.getElementById('tabvault-log-container');
            logContainer.innerHTML = '';
            
            if (!response.logs || response.logs.length === 0) {
                logContainer.innerHTML = '<p class="tabvault-log-empty">No logs available</p>';
                return;
            }
            
            response.logs.forEach(logEntry => {
                const logItem = document.createElement('div');
                logItem.className = `tabvault-log-item ${logEntry.type}`;
                
                const time = new Date(logEntry.timestamp).toLocaleTimeString();
                logItem.innerHTML = `
                    <span class="tabvault-log-time">[${time}]</span>
                    <span class="tabvault-log-type">[${logEntry.type.toUpperCase()}]</span>
                    <span class="tabvault-log-message">${logEntry.message}</span>
                `;
                
                logContainer.appendChild(logItem);
            });
            
            // Auto-scroll to bottom
            logContainer.scrollTop = logContainer.scrollHeight;
        });
    }
});