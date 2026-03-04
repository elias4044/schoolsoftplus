/**
 * @fileoverview Main JavaScript file for the SchoolSoftPlus extension.
 * Handles UI interactions, data fetching, and dynamic content loading.
 */

// ---------------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------------

const ANIMATION_FADE_SLIDE_UP = "fadeSlideUpAnimation";
const EXPANDABLE_ITEM_ANIMATION_DELAY_MS = 50;
const LESSON_ITEM_STAGGER_DELAY_MS = 10;

const CALENDAR_URLS = {
    google: "https://calendar.google.com/calendar",
    outlook: "https://outlook.live.com/calendar",
    apple: "https://www.icloud.com/calendar",
    proton: "https://calendar.proton.me/",
};

// ---------------------------------------------------------------------------------
// DOM Elements
// ---------------------------------------------------------------------------------

// Elements are typically fetched when needed or in DOMContentLoaded,
// but if an element is used very frequently, caching it here can be an option.
// For now, elements are fetched within their respective functions or event listeners.

// ---------------------------------------------------------------------------------
// Global State
// ---------------------------------------------------------------------------------

/**
 * Stores the offset for the currently displayed week in the schedule.
 * 0 = current week, -1 = previous week, 1 = next week, etc.
 * @type {number}
 */
let currentWeekOffset = 0;

/**
 * Caches the full schedule data fetched from the API to avoid redundant requests.
 * @type {Array<Object>}
 */
let scheduleData = [];

// ---------------------------------------------------------------------------------
// Utility Functions
// ---------------------------------------------------------------------------------

/**
 * Applies a staggered animation to a collection of elements.
 * @param {string} selector - The CSS selector for the elements to animate.
 * @param {number} [delayBetween=100] - The delay in milliseconds between each element's animation start.
 * @param {string} [animation="fadeSlideUpAnimation"] - The CSS animation class to apply.
 */
function animateInSequence(selector, delayBetween = 100, animation = ANIMATION_FADE_SLIDE_UP) {
    const elements = document.querySelectorAll(selector);
    elements.forEach((el, index) => {
        el.style.animationDelay = `${index * delayBetween}ms`;
        el.classList.add(animation);
    });
}

/**
 * Displays a loader with a message in a specified container.
 * @param {string} containerId - The ID of the HTML element to display the loader in.
 * @param {string} [message='Loading...'] - The message to display with the loader.
 */
function showLoader(containerId, message = 'Loading...') {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Loader container with ID "${containerId}" not found.`);
        return;
    }

    container.innerHTML = `
        <div class="loader-container">
            <div class="loader-spinner"></div>
            <div class="loader-text">${message}</div>
        </div>
    `;
}

/**
 * Displays a skeleton loader in a specified container.
 * @param {string} containerId - The ID of the HTML element to display the skeleton loader in.
 * @param {number} [count=4] - The number of skeleton bars to display.
 */
function showSkeletonLoader(containerId, count = 4) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Skeleton loader container with ID "${containerId}" not found.`);
        return;
    }

    let skeletons = '';
    for (let i = 0; i < count; i++) {
        // Randomize width for a more dynamic skeleton appearance
        skeletons += `
            <div class="skeleton-loader" style="width: ${Math.floor(Math.random() * 30) + 70}%;"></div>
        `;
    }

    container.innerHTML = `
        <div class="loader-container">
            ${skeletons}
        </div>
    `;
}

/**
 * Formats a date string or Date object into a short month and day format (e.g., "Jan 15").
 * @param {string|Date} dateInput - The date string or Date object.
 * @returns {string} The formatted date string.
 */
function formatDateShort(dateInput) {
    const date = (dateInput instanceof Date) ? dateInput : new Date(dateInput);
    return date.toLocaleDateString(navigator.language || 'en-US', { // Use browser's locale or fallback
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Formats a date string (YYYY-MM-DD) to a long, human-readable format.
 * (e.g., "Monday, January 15, 2023").
 * @param {string} dateString - The date string in YYYY-MM-DD format or any format Date constructor accepts.
 * @returns {string} The formatted date.
 */
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString(navigator.language || 'en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * Formats a date string or Date object into a time format with AM/PM.
 * (e.g., "9:30 <span class="ampm">AM</span>").
 * @param {string|Date} dateLike - The date string or Date object.
 * @returns {string} HTML string with the formatted time.
 */
function formatTime(dateLike) {
    const date = (dateLike instanceof Date) ? dateLike : new Date(dateLike);
    // Use browser's locale for time formatting
    const raw = date.toLocaleTimeString(navigator.language || 'en-US', { hour: 'numeric', minute: '2-digit' });
    const parts = raw.match(/^(\d{1,2}:\d{2})\s?([AP]M)$/i); // Handles AM/PM for locales that use it

    return parts
        ? `${parts[1]} <span class="ampm">${parts[2].toUpperCase()}</span>`
        : raw; // Fallback for 24-hour locales or other formats
}

/**
 * Calculates the start date (Monday) of a week, given a week offset.
 * @param {number} [weekOffset=0] - The offset from the current week.
 * @returns {Date} The Date object representing the start of the specified week.
 */
function getWeekStartDate(weekOffset = 0) {
    const date = new Date();
    const dayOfWeek = date.getDay(); // Sunday = 0, Monday = 1, ..., Saturday = 6
    // Adjust to Monday of the current week:
    // If Sunday (0), subtract 6 days. If Monday (1), subtract 0. If Tuesday (2), subtract 1, etc.
    const diffToMonday = (dayOfWeek === 0) ? -6 : (1 - dayOfWeek);
    date.setDate(date.getDate() + diffToMonday);

    date.setDate(date.getDate() + (weekOffset * 7)); // Apply week offset
    date.setHours(0, 0, 0, 0); // Set to the beginning of the day
    return date;
}

/**
 * Calculates the end date (Sunday) of a week, given a week offset.
 * @param {number} [weekOffset=0] - The offset from the current week.
 * @returns {Date} The Date object representing the end of the specified week.
 */
function getWeekEndDate(weekOffset = 0) {
    const date = getWeekStartDate(weekOffset);
    date.setDate(date.getDate() + 6); // Add 6 days to get to Sunday
    date.setHours(23, 59, 59, 999); // Set to the end of the day
    return date;
}

// ---------------------------------------------------------------------------------
// Sidebar and Navigation
// ---------------------------------------------------------------------------------

/**
 * Toggles the visibility of the sidebar.
 */
function toggleSidebar() {
    const sidebar = document.querySelector(".sidebar");
    const mainContent = document.querySelector(".main-content");
    if (sidebar && mainContent) {
        sidebar.classList.toggle("active");
        mainContent.classList.toggle("active");
    } else {
        console.error("Sidebar element not found.");
    }
}

/**
 * Initializes expandable sections in the sidebar.
 * Allows sections to be clicked to show/hide their content with animation.
 */
function initializeExpandableSections() {
    const expandableTitles = document.querySelectorAll('.nav-group-title.expandable');

    expandableTitles.forEach(title => {
        title.addEventListener('click', function () {
            const targetId = this.getAttribute('data-target');
            const targetList = document.getElementById(targetId);

            if (!targetList) {
                console.error(`Target list with ID "${targetId}" not found for expandable title.`);
                return;
            }

            const isExpanded = this.classList.toggle('expanded');
            targetList.classList.toggle('expanded');

            const items = targetList.querySelectorAll('li');
            if (isExpanded) {
                // Animate items in
                items.forEach((item, index) => {
                    const delay = index * EXPANDABLE_ITEM_ANIMATION_DELAY_MS;
                    item.style.transitionDelay = `${delay}ms`;
                    item.style.opacity = '1';
                    item.style.transform = 'translateX(0)';
                });
            } else {
                // Reset styles for hiding animation or immediate hide
                items.forEach(item => {
                    item.style.transitionDelay = '0ms';
                    item.style.opacity = '0';
                    item.style.transform = 'translateX(-10px)'; // Matches common slide-out effect
                });
            }
        });
    });
}

/**
 * Initializes navigation item click handlers.
 * Handles switching content sections and redirecting to external calendars.
 */
function initializeNavItems() {
    const settingsString = localStorage.getItem('schoolsoftplus_settings');
    let settings = null;

    if (!settingsString) {
        // Consider a more user-friendly, non-blocking notification system.
        alert('Critical: Settings failed to load! Some features may not work correctly.');
        // Depending on app structure, might want to return or disable certain features.
    } else {
        try {
            settings = JSON.parse(settingsString);
        } catch (error) {
            console.error("Failed to parse settings from localStorage:", error);
            alert('Error: Settings are corrupted. Please check extension settings or reinstall.');
            // Handle corrupted settings, e.g., by using defaults or disabling features.
        }
    }


    document.querySelectorAll(".nav-item").forEach(item => {
        item.addEventListener("click", () => {
            const sectionName = item.dataset.section;

            if (sectionName === "calender") {
                if (!settings || !settings.calender || !settings.calender.calenderType) {
                    alert('Calendar settings are missing or incomplete. Please check your settings.');
                    return;
                }
                const selectedCalenderType = settings.calender.calenderType;
                const calendarURL = CALENDAR_URLS[selectedCalenderType];

                if (calendarURL) {
                    window.location.href = calendarURL;
                } else {
                    alert(`Calendar type "${selectedCalenderType}" is not supported or configured.`);
                }
                return; // Exit after handling calendar link
            }

            // Handle regular section toggling
            toggleSection(sectionName);

            // Update active state for nav items
            document.querySelectorAll(".nav-item").forEach(nav => nav.classList.remove("active"));
            item.classList.add("active");

            // Optionally close sidebar on mobile after selection
            const sidebar = document.querySelector(".sidebar");
            if (sidebar && sidebar.classList.contains("active") && window.innerWidth < 768) { // Example breakpoint
                toggleSidebar();
            }
        });
    });
}


/**
 * Switches the visible content section and updates the title.
 * Loads schedule data if the schedule section is selected.
 * @param {string} sectionId - The ID of the section to display.
 */
function toggleSection(sectionId) {
    // Hide all content sections
    document.querySelectorAll(".content-section").forEach(sectionEl => {
        sectionEl.classList.remove("active");
    });

    // Show the selected content section
    const activeSection = document.getElementById(sectionId);
    if (activeSection) {
        activeSection.classList.add("active");
    } else {
        console.error(`Content section with ID "${sectionId}" not found.`);
        return;
    }


    // Update the main section title
    const currentSectionTitle = document.getElementById("current-section-title");
    const navItemForSection = document.querySelector(`.nav-item[data-section="${sectionId}"]`);

    if (currentSectionTitle && navItemForSection) {
        currentSectionTitle.textContent = ""
    } else {
        if (!currentSectionTitle) console.error("Element with ID 'current-section-title' not found.");
        if (!navItemForSection) console.error(`Nav item for section "${sectionId}" not found.`);
    }

    // Specific actions for sections
    if (sectionId === 'schedule') {
        // Load schedule for the current week (offset 0) if not already loaded or explicitly requested
        loadSchedule(currentWeekOffset); // Or always load with 0 if that's the desired behavior on section switch
    }
}

// ---------------------------------------------------------------------------------
// Schedule Functionality
// ---------------------------------------------------------------------------------

/**
 * Fetches and loads the schedule data from the API for a given week offset.
 * @param {number} [weekOffset=0] - The offset from the current week to load.
 */
async function loadSchedule(weekOffset = 0) {
    const scheduleContainer = document.getElementById('schedule');
    if (!scheduleContainer) {
        console.error("Schedule container element with ID 'schedule' not found.");
        return;
    }

    try {
        currentWeekOffset = weekOffset; // Update global offset
        showLoader('schedule', 'Loading your schedule...'); // Use the specific container ID

        const cookieArrayString = sessionStorage.getItem('cookies');
        if (!cookieArrayString) {
            console.warn('No cookies found in session storage. User might not be logged in.');
            scheduleContainer.innerHTML = '<p class="error-message">Please log in to view your schedule.</p>';
            return;
        }

        let cookieArray;
        try {
            cookieArray = JSON.parse(cookieArrayString);
            if (!Array.isArray(cookieArray) || cookieArray.length === 0) {
                throw new Error("Cookies are empty or malformed.");
            }
        } catch (e) {
            console.error('Failed to parse cookies from session storage:', e);
            scheduleContainer.innerHTML = '<p class="error-message">Error accessing login information. Please try logging in again.</p>';
            return;
        }

        // Determine if we need to fetch new data
        // Fetch if scheduleData is empty OR if we are requesting a week different from the one implied by offset 0 (initial load)
        // or if weekOffset has changed since last load.
        // This logic might need refinement based on caching strategy.
        // For now, let's assume we always refetch if weekOffset changes from the *very first load*.
        // A more robust cache would check if data for *this specific weekOffset* is already present.
        // The original logic was: `if (scheduleData.length === 0 || weekOffset !== 0)`
        // Let's refine to: fetch if no data, or if requested week is different from last displayed one.
        // For simplicity and to match original intent for now: always fetch if scheduleData is empty,
        // otherwise, display cached data for the current week or fetch for other weeks.
        // The API call itself will handle fetching for the correct (potentially offset) week if the API supports it.
        // If API always returns full schedule, then filtering happens client-side.
        // The provided code seems to fetch full schedule then filter.

        // Let's assume the API call `/api/main` always returns the *entire* schedule,
        // and client-side filtering (`displayScheduleForWeek`) handles the week offset.
        if (scheduleData.length === 0) { // Only fetch if cache is empty
            const response = await fetch('/api/main', {
                headers: {
                    'cookies': cookieArray.join('; '),
                    'api': 'schedule'
                }
            });

            if (!response.ok) {
                // Handle HTTP errors like 401, 403, 500
                const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response.' }));
                throw new Error(errorData.message || `Failed to load schedule. Status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success && data.schedule) {
                scheduleData = data.schedule; // Cache the full schedule
            } else {
                scheduleContainer.innerHTML =
                    `<p class="error-message">${data.message || 'Failed to retrieve schedule data.'}</p>`;
                return; // Stop if data retrieval failed
            }
        }
        // Display the schedule for the (newly) selected week using cached/fresh full data
        displayScheduleForWeek(scheduleData, currentWeekOffset);

    } catch (error) {
        console.error('Error loading schedule:', error);
        scheduleContainer.innerHTML =
            `<p class="error-message">An error occurred while loading the schedule: ${error.message}</p>`;
    }
}

/**
 * Creates the week navigation controls (Previous, Current, Next Week buttons).
 * @param {HTMLElement} parentContainer - The container to append navigation controls to.
 * @param {number} currentOffset - The current week offset.
 */
function createWeekNavigation(parentContainer, currentOffset) {
    const weekNav = document.createElement('div');
    weekNav.className = 'week-navigation';

    const prevWeekBtn = document.createElement('button');
    prevWeekBtn.className = 'week-nav-btn';
    prevWeekBtn.innerHTML = '← Previous Week';
    prevWeekBtn.onclick = () => loadSchedule(currentOffset - 1);
    prevWeekBtn.setAttribute('aria-label', 'Previous Week');


    const currentWeekBtn = document.createElement('button');
    currentWeekBtn.className = 'week-nav-btn current-week-btn';
    currentWeekBtn.innerHTML = 'Current Week';
    currentWeekBtn.onclick = () => loadSchedule(0); // Always load current week
    currentWeekBtn.disabled = currentOffset === 0; // Disable if already on current week
    currentWeekBtn.setAttribute('aria-label', 'Current Week');

    const printBtn = document.createElement('button');
    printBtn.className = 'print-btn week-nav-btn';
    printBtn.innerHTML = 'Print';
    printBtn.onclick = () => printSchedule();
    printBtn.setAttribute('aria-label', 'Print Schedule');



    const nextWeekBtn = document.createElement('button');
    nextWeekBtn.className = 'week-nav-btn';
    nextWeekBtn.innerHTML = 'Next Week →';
    nextWeekBtn.onclick = () => loadSchedule(currentOffset + 1);
    nextWeekBtn.setAttribute('aria-label', 'Next Week');

    weekNav.appendChild(prevWeekBtn);
    weekNav.appendChild(currentWeekBtn);
    weekNav.appendChild(printBtn);
    weekNav.appendChild(nextWeekBtn);

    parentContainer.appendChild(weekNav);
}

/**
 * Creates and appends the week label (e.g., "Jan 15 - Jan 21").
 * @param {HTMLElement} parentContainer - The container to append the label to.
 * @param {Date} weekStartDate - The start date of the week.
 * @param {Date} weekEndDate - The end date of the week.
 */
function createWeekLabel(parentContainer, weekStartDate, weekEndDate) {
    const weekLabel = document.createElement('div');
    weekLabel.className = 'week-label';
    weekLabel.textContent = `${formatDateShort(weekStartDate)} - ${formatDateShort(weekEndDate)}`;
    parentContainer.appendChild(weekLabel);
}

/**
 * Creates a single lesson item element.
 * @param {Object} lesson - The lesson data object.
 * @returns {HTMLElement} The created lesson element.
 */
function createLessonElement(lesson) {
    const lessonElement = document.createElement('div');
    lessonElement.className = 'lesson-item';

    if (lesson.eventColor) {
        lessonElement.style.borderLeft = `4px solid ${lesson.eventColor}`;
    }

    lessonElement.innerHTML = `
        <div class="lesson-time">
            ${formatTime(lesson.startDate)} - ${formatTime(lesson.endDate)}
        </div>
        <div class="lesson-main">
            <h4>${lesson.name || 'Untitled Lesson'}</h4>
            <div class="lesson-details">
                <span><p class="room-label">Room:</p> ${lesson.room || 'N/A'}</span>
                <span><p class="teacher-label">Teacher:</p> ${lesson.teacher || 'N/A'}</span>
            </div>
        </div>
    `;
    return lessonElement;
}


/**
 * Displays the schedule for a specific week, using a grid layout (Mon-Fri).
 * @param {Array<Object>} fullSchedule - The complete schedule data for all weeks.
 * @param {number} [weekOffset=0] - The offset from the current week to display.
 */
function displayScheduleForWeek(fullSchedule, weekOffset = 0) {
    const scheduleContainer = document.getElementById('schedule');
    if (!scheduleContainer) {
        console.error("Schedule container element with ID 'schedule' not found for display.");
        return;
    }
    scheduleContainer.innerHTML = ''; // Clear previous content

    if (!fullSchedule || fullSchedule.length === 0) {
        scheduleContainer.innerHTML = '<p>No schedule data available to display.</p>';
        return;
    }

    // Calculate date range for the selected week
    const weekStartDate = getWeekStartDate(weekOffset); // Monday of the selected week
    const weekEndDate = getWeekEndDate(weekOffset);     // Sunday of the selected week

    // Create and append week navigation and label
    createWeekLabel(scheduleContainer, weekStartDate, weekEndDate);
    createWeekNavigation(scheduleContainer, weekOffset);

    // Filter lessons from the full schedule that fall within the selected week
    const lessonsForThisWeek = fullSchedule.filter(lesson => {
        const lessonDate = new Date(lesson.startDate);
        // Ensure comparison is done correctly (lessonDate should be within weekStart and weekEnd)
        const lessonDayStart = new Date(lessonDate);
        lessonDayStart.setHours(0, 0, 0, 0);

        return lessonDayStart >= weekStartDate && lessonDayStart <= weekEndDate;
    });

    if (lessonsForThisWeek.length === 0) {
        const noLessonsMessage = document.createElement('p');
        noLessonsMessage.className = 'no-lessons-message';
        noLessonsMessage.textContent = 'No lessons scheduled for this week.';
        scheduleContainer.appendChild(noLessonsMessage);
        return;
    }

    // Create the main grid container for days
    const weekScheduleGrid = document.createElement('div');
    weekScheduleGrid.className = 'week-schedule-grid';

    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const lessonsByDay = {};
    dayNames.forEach((_, index) => { lessonsByDay[index + 1] = []; }); // 1=Monday, ..., 5=Friday

    lessonsForThisWeek.forEach(lesson => {
        const lessonDate = new Date(lesson.startDate);
        const dayOfWeek = lessonDate.getDay(); // Sunday=0, Monday=1, ..., Friday=5, Saturday=6

        // Only include Monday (1) to Friday (5)
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            lessonsByDay[dayOfWeek].push(lesson);
        }
    });

    dayNames.forEach((dayName, index) => {
        const dayNumeric = index + 1; // Monday is 1, etc.
        const dayLessons = lessonsByDay[dayNumeric];

        const dayColumn = document.createElement('div');
        dayColumn.className = 'day-column';

        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        const currentDateForHeader = new Date(weekStartDate);
        currentDateForHeader.setDate(weekStartDate.getDate() + index); // index 0 is Monday, 1 is Tuesday...
        dayHeader.textContent = `${dayName} (${formatDateShort(currentDateForHeader)})`;
        dayColumn.appendChild(dayHeader);

        if (dayLessons.length > 0) {
            // Sort lessons by start time
            dayLessons.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
            dayLessons.forEach(lesson => {
                dayColumn.appendChild(createLessonElement(lesson));
            });
        } else {
            const noLessonsEl = document.createElement('div');
            noLessonsEl.className = 'no-lessons';
            noLessonsEl.textContent = 'No lessons';
            dayColumn.appendChild(noLessonsEl);
        }
        weekScheduleGrid.appendChild(dayColumn);
    });

    scheduleContainer.appendChild(weekScheduleGrid);

    // Apply entrance animation to lesson items
    animateInSequence('.lesson-item', LESSON_ITEM_STAGGER_DELAY_MS);
}

async function printSchedule() {
    const scheduleContainer = document.querySelector(".week-schedule-grid")

    const printableSchedule = scheduleContainer.cloneNode(true);
    printableSchedule.id = "printable-schedule";

    const container = document.createElement("div");
    container.classList.add("printable-schedule-container");
    container.id = "printable-schedule-container";

    const creditsContainer = document.createElement("div");
    creditsContainer.classList.add("printable-schedule-credits");

    const qrCode = document.createElement("img")
    qrCode.src = "https://media.pictify.io/3crpr-1755805797092.png"
    qrCode.alt = "https://schoolsoftplus.vercel.app/"
    qrCode.width = 200;
    qrCode.height = 200;
    qrCode.classList.add("qr-code")

    const text = document.createElement("h1")
    text.textContent = "Schoolsoft+ Schedule"
    text.classList.add("printable-schedule-title")


    const subText = document.createElement("h2")
    subText.textContent = "schoolsoftplus.vercel.app"
    subText.classList.add("printable-schedule-subtitle")


    const printableScheduleStyles = document.createElement("style");
    printableScheduleStyles.innerHTML = `
        .printable-schedule-credits {
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .printable-schedule-title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
        }

        .printable-schedule-subtitle {
            font-size: 14px;
            margin-bottom: 10px;
        }

        .qr-code {
            margin-bottom: 10px;
            position: absolute;
            bottom: 10px;
            right: 10px;
        }
    `


    document.body.appendChild(container);
    container.appendChild(printableSchedule);
    creditsContainer.appendChild(qrCode)
    container.appendChild(creditsContainer);
        creditsContainer.appendChild(text)
    creditsContainer.appendChild(subText)
    container.appendChild(printableScheduleStyles);

    await printJS({
        printable: "printable-schedule-container",
        type: "html",
        css: ["css/styles.css", "css/dark-mode.css"],
        documentTitle: "Schoolsoft+ Schedule",
        header: null,
        footer: null,
    });
    document.body.removeChild(container);
}

// ---------------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------------

/**
 * Logs the user out by clearing session cookies and redirecting to the login page.
 */
function logout() {
    sessionStorage.removeItem('cookies');
    // Potentially clear other session-related data
    window.location.href = '/login.html'; // Redirect to login page
}

// ---------------------------------------------------------------------------------
// Event Listeners & Initialization
// ---------------------------------------------------------------------------------

/**
 * Main initialization function, run when the DOM is fully loaded.
 */
document.addEventListener('DOMContentLoaded', function () {
    // Initialize sidebar features
    initializeExpandableSections();

    // Initialize navigation
    initializeNavItems();

    // Setup sidebar toggle buttons
    const mobileToggle = document.getElementById("mobile-sidebar-toggle");
    const desktopToggle = document.getElementById("sidebar-toggle");

    if (mobileToggle) mobileToggle.addEventListener("click", toggleSidebar);
    if (desktopToggle) desktopToggle.addEventListener("click", toggleSidebar);

    // Setup logout button (if one exists with this ID)
    const logoutButton = document.getElementById("logout-button"); // Assuming a logout button ID
    if (logoutButton) logoutButton.addEventListener("click", logout);


    // Initial section load (e.g., default to dashboard or first nav item)
    // Find the first nav-item or a default one to show.
    // For instance, if 'schedule' is the default, uncomment:
    // toggleSection('schedule');
    // document.querySelector('.nav-item[data-section="schedule"]')?.classList.add('active');

    // Or, more generically, activate the first nav item that is not a calendar link
    const firstNav = document.querySelector(".nav-item:not([data-section='calender'])");
    if (firstNav && firstNav.dataset.section) {
        toggleSection(firstNav.dataset.section);
        firstNav.classList.add("active");
    } else {
        // Fallback if no suitable nav item is found
        console.warn("No default section found to activate.");
        // Optionally display a default message or view
        const contentArea = document.querySelector(".content-area"); // Adjust selector as needed
        if (contentArea) contentArea.innerHTML = "<p>Welcome! Please select a section from the navigation.</p>";
    }
});
