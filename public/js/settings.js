// Settings functionality for Schoolsoft+

// DOM elements
const darkModeToggle = document.getElementById('dark-mode-toggle');
const fontSizeSelector = document.getElementById('font-size-selector');
const accentColorSelector = document.getElementById('accent-color-selector');
const dashboardItemsCheckboxes = document.querySelectorAll('input[name="dashboard-items"]');
const autoLogoutTimeSelector = document.getElementById('auto-logout-time');
const saveLoginToggle = document.getElementById('save-login-toggle');
const clearDataBtn = document.getElementById('clear-data-btn');
const calenderType = document.getElementById('calendar-type-selector');

// Settings object structure
// Add to your defaultSettings object
const defaultSettings = {
    appearance: {
        darkMode: false,
        highContrast: false,
        fontSize: 'medium',
        accentColor: 'blue'
    },
    display: {
        timeFormat: '24h',
        dashboardItems: {
            homework: true,
            test: true,   // <--- Changed from 'tests'
            note: true,   // <--- Changed from 'notes'
            goal: true    // <--- Changed from 'goals'
        }
    },
    calender: {
        calenderType: 'google'
    },
    privacy: {
        autoLogoutTime: 30, // minutes
        saveLogin: false
    }
};

// Load settings from localStorage
function loadSettings() {
    const savedSettings = localStorage.getItem('schoolsoftplus_settings');
    let settings = defaultSettings;
    
    if (savedSettings) {
        try {
            settings = JSON.parse(savedSettings);
            // Apply saved settings to UI
            applySettings(settings);
        } catch (error) {
            console.error('Error parsing saved settings:', error);
            // If there's an error, use default settings
            localStorage.setItem('schoolsoftplus_settings', JSON.stringify(defaultSettings));
        }
    } else {
        // If no settings found, save defaults
        localStorage.setItem('schoolsoftplus_settings', JSON.stringify(defaultSettings));
    }
    
    return settings;
}

// Apply settings to UI elements
function applySettings(settings) {
    // Appearance settings
    darkModeToggle.checked = settings.appearance.darkMode;
    fontSizeSelector.value = settings.appearance.fontSize;
    accentColorSelector.value = settings.appearance.accentColor;

    
    // Apply dark mode if enabled
    if (settings.appearance.darkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.setAttribute('data-theme', "light");
    }
    
    // Apply font size
    document.documentElement.setAttribute('data-font-size', settings.appearance.fontSize);
    
    // Apply accent color
    document.documentElement.setAttribute('data-accent-color', settings.appearance.accentColor);
    
    // Display settings
    dashboardItemsCheckboxes.forEach(checkbox => {
        checkbox.checked = settings.display.dashboardItems[checkbox.value] || false;
    });

    // Calender settings
    calenderType.value = settings.calender.calenderType;
    
    // Privacy settings
    autoLogoutTimeSelector.value = settings.privacy.autoLogoutTime;
    saveLoginToggle.checked = settings.privacy.saveLogin;
}

// Save settings to localStorage
function saveSettings() {
    const settings = {
        appearance: {
            darkMode: darkModeToggle.checked,
            highContrast: document.getElementById('high-contrast-toggle').checked,
            fontSize: fontSizeSelector.value,
            accentColor: accentColorSelector.value
        },
        display: {
            dashboardItems: {},
        },
        calender: {
            calenderType: calenderType.value
        },
        privacy: {
            autoLogoutTime: parseInt(autoLogoutTimeSelector.value),
            saveLogin: saveLoginToggle.checked
        }
    };
    
    // Get dashboard items
    dashboardItemsCheckboxes.forEach(checkbox => {
        settings.display.dashboardItems[checkbox.value] = checkbox.checked;
    });
    
    // Save to localStorage
    localStorage.setItem('schoolsoftplus_settings', JSON.stringify(settings));
    
    return settings;
}

// Event listeners for settings changes
function setupEventListeners() {
    // Appearance settings
    darkModeToggle.addEventListener('change', () => {
        if (darkModeToggle.checked) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.setAttribute('data-theme', "light");
        }
        saveSettings();
    });

    document.getElementById('high-contrast-toggle').addEventListener('change', () => {
        if (document.getElementById('high-contrast-toggle').checked) {
            document.documentElement.setAttribute('data-high-contrast', 'true');
        } else {
            document.documentElement.removeAttribute('data-high-contrast');}
        saveSettings();
    });
    
    fontSizeSelector.addEventListener('change', () => {
        document.documentElement.setAttribute('data-font-size', fontSizeSelector.value);
        saveSettings();
    });
    
    accentColorSelector.addEventListener('change', () => {
        document.documentElement.setAttribute('data-accent-color', accentColorSelector.value);
        saveSettings();
    });
    
    // Display settings
    dashboardItemsCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            // Update dashboard visibility based on settings
            updateDashboardVisibility();
            saveSettings();
        });
    });
        
    // Privacy settings
    autoLogoutTimeSelector.addEventListener('change', () => {
        const logoutTime = parseInt(autoLogoutTimeSelector.value);
        if (logoutTime > 0) {
            setupAutoLogout(logoutTime);
        } else {
            clearAutoLogout();
        }
        saveSettings();
    });

    calenderType.addEventListener('change', saveSettings);
    
    saveLoginToggle.addEventListener('change', saveSettings);
    
    // Clear data button
    clearDataBtn.addEventListener('click', clearLocalData);
}

// Update dashboard items visibility based on settings
function updateDashboardVisibility() {
    dashboardItemsCheckboxes.forEach(checkbox => {
        const cardId = `${checkbox.value}-card`;
        const card = document.getElementById(cardId);
        if (card) {
            card.style.display = checkbox.checked ? 'block' : 'none';
        }
    });
}

// Auto logout functionality
let autoLogoutTimer;

function setupAutoLogout(minutes) {
    clearAutoLogout(); // Clear any existing timer
    
    if (minutes > 0) {
        const milliseconds = minutes * 60 * 1000;
        autoLogoutTimer = setTimeout(() => {
            logout();
        }, milliseconds);
        
        // Reset timer on user activity
        ['click', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, resetAutoLogoutTimer);
        });
    }
}

function resetAutoLogoutTimer() {
    const settings = JSON.parse(localStorage.getItem('schoolsoftplus_settings'));
    const logoutTime = settings.privacy.autoLogoutTime;
    
    if (logoutTime > 0) {
        clearAutoLogout();
        setupAutoLogout(logoutTime);
    }
}

function clearAutoLogout() {
    if (autoLogoutTimer) {
        clearTimeout(autoLogoutTimer);
    }
    
    // Remove event listeners
    ['click', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
        document.removeEventListener(event, resetAutoLogoutTimer);
    });
}

// Clear all local data
function clearLocalData() {
    if (confirm('Are you sure you want to clear all locally stored data? This will log you out.')) {
        // Clear all localStorage items except theme preference
        const themePreference = localStorage.getItem('theme-preference');
        localStorage.clear();
        if (themePreference) {
            localStorage.setItem('theme-preference', themePreference);
        }
        
        // Reset to default settings
        localStorage.setItem('schoolsoftplus_settings', JSON.stringify(defaultSettings));
        
        // Reload the page to apply changes
        window.location.href = '/login.html';
    }
}

// Initialize settings
document.addEventListener('DOMContentLoaded', () => {
    const settings = loadSettings();
    setupEventListeners();
    
    // Setup auto logout if enabled
    if (settings.privacy.autoLogoutTime > 0) {
        setupAutoLogout(settings.privacy.autoLogoutTime);
    }
    
    // Update dashboard visibility
    updateDashboardVisibility();
    
    
    // Setup refresh session button
    document.getElementById('refresh-session-btn').addEventListener('click', () => {
        // Implement session refresh logic here
        alert('Session refreshed successfully!');
    });
    
    // Setup logout button
    document.getElementById('logout-btn').addEventListener('click', logout);
});

// Logout function
function logout() {
    // Clear session data
    sessionStorage.clear();
    
    // Clear localStorage if save login is not enabled
    const settings = JSON.parse(localStorage.getItem('schoolsoftplus_settings'));
    if (!settings.privacy.saveLogin) {
        // Keep only settings and theme preference
        const settingsData = localStorage.getItem('schoolsoftplus_settings');
        const themePreference = localStorage.getItem('theme-preference');
        
        localStorage.clear();
        
        if (settingsData) {
            localStorage.setItem('schoolsoftplus_settings', settingsData);
        }
        
        if (themePreference) {
            localStorage.setItem('theme-preference', themePreference);
        }
    }
    
    // Redirect to login page
    window.location.href = '/login.html';
}

// Function to update time displays based on format
function updateTimeDisplays() {
    const timeFormat = document.getElementById('time-format-selector').value;
    const timeElements = document.querySelectorAll('.time-display');
    
    timeElements.forEach(element => {
        const timestamp = element.getAttribute('data-timestamp');
        if (timestamp) {
            const date = new Date(parseInt(timestamp));
            if (timeFormat === '12h') {
                element.textContent = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
            } else {
                element.textContent = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
            }
        }
    });
}