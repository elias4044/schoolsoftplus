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


// Function to set the theme
function setTheme(themeName, contrast) {
    document.documentElement.setAttribute('data-theme', themeName);

    if (contrast) {
        document.documentElement.setAttribute('data-high-contrast', "true");
    }
    
    // Update toggle button icons
    const darkIcon = document.getElementById('theme-toggle-dark-icon');
    const lightIcon = document.getElementById('theme-toggle-light-icon');

    let settings = localStorage.getItem('schoolsoftplus_settings');
    if (!settings) {
        localStorage.setItem('schoolsoftplus_settings', JSON.stringify(defaultSettings));
        settings = localStorage.getItem('schoolsoftplus_settings');
    }

    let settingsObject = JSON.parse(settings);

    // Update dark mode state
    settingsObject.appearance.darkMode = (themeName === 'dark');


    document.documentElement.setAttribute('data-font-size', settingsObject.appearance.fontSize);
    document.documentElement.setAttribute('data-accent-color', settingsObject.appearance.accentColor);

    localStorage.setItem('schoolsoftplus_settings', JSON.stringify(settingsObject));

    if (!darkIcon || !lightIcon) return;

    if (themeName === 'dark') {
        darkIcon.style.display = 'none';
        lightIcon.style.display = 'block';
    } else {
        darkIcon.style.display = 'block';
        lightIcon.style.display = 'none';
    }
}


// Function to toggle between dark and light theme
function toggleTheme() {
    let settings = JSON.parse(localStorage.getItem('schoolsoftplus_settings'));
    if (!settings) {
        localStorage.setItem('schoolsoftplus_settings', JSON.stringify(defaultSettings));
        settings = localStorage.getItem('schoolsoftplus_settings');
    }
    if (settings.appearance.darkMode == true) {
        setTheme('light');
    } else {
        setTheme('dark');
    }
}

// Initialize theme on page load
(function() {

    // Check for saved theme preference or use user's system preference
    let settings = localStorage.getItem('schoolsoftplus_settings');
    if (!settings) {
        localStorage.setItem('schoolsoftplus_settings', JSON.stringify(defaultSettings));
        settings = localStorage.getItem('schoolsoftplus_settings');
    }



    if (settings) {
        const settingsObject = JSON.parse(settings);
        if (settingsObject.appearance.highContrast) {
            if (settingsObject.appearance.darkMode) {
                setTheme('dark', true);
            } else {
                setTheme('light', true);
            }
        } else {
            if (settingsObject.appearance.darkMode) {
                setTheme('dark');
            } else {
                setTheme('light');
            }
        }
    }        else {
        console.warn('No darkMode value found');
    }
    // const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    
    // Add event listener to toggle button
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    } else return;
})();