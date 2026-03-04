document.addEventListener('DOMContentLoaded', function () {
    // --- DOM Elements ---
    const lunchMenuGrid = document.getElementById('lunch-menu-grid');
    const currentWeekSpan = document.getElementById('current-lunch-week');
    const prevWeekBtn = document.getElementById('prev-week-lunch');
    const nextWeekBtn = document.getElementById('next-week-lunch');
    const loadingIndicator = document.getElementById('lunch-menu-loading');
    const errorDisplay = document.getElementById('lunch-menu-error');
    const initialEmptyState = document.querySelector('#lunchMenu .initial-empty-lunch');

    // --- State ---
    let currentSelectedWeek = getCurrentWeekNumber(); // Start with the current ISO week
    const today = new Date();
    const currentDayIndex = (today.getDay() + 6) % 7; // 0=Monday, 1=Tuesday, ..., 6=Sunday

    const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

    // --- Initialization ---
    function init() {
        if (!currentWeekSpan) { 
            console.warn("Lunch menu elements not found. Skipping initialization.");
            return;
        }
        updateWeekDisplay();
        loadLunchDataForWeek(currentSelectedWeek);

        prevWeekBtn.addEventListener('click', () => {
            currentSelectedWeek--;
            if (currentSelectedWeek < 1) currentSelectedWeek = 52; 
            updateWeekDisplay();
            loadLunchDataForWeek(currentSelectedWeek);
        });

        nextWeekBtn.addEventListener('click', () => {
            currentSelectedWeek++;
            if (currentSelectedWeek > 52) currentSelectedWeek = 1;
            updateWeekDisplay();
            loadLunchDataForWeek(currentSelectedWeek);
        });
    }

    // --- Helper Functions ---
    function getCurrentWeekNumber(date = new Date()) {
        // ISO 8601 week calculation (UTC safe)
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const day = d.getUTCDay() || 7; // ISO: Monday=1, Sunday=7
        d.setUTCDate(d.getUTCDate() + 4 - day); // move to Thursday
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }

    function getISOWeekYear(date = new Date()) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const day = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - day);
        return d.getUTCFullYear();
    }

    function getDateForDayOfWeek(week, year, dayOfWeek) {
        // Calculate ISO week start date (Monday)
        const simple = new Date(Date.UTC(year, 0, 4)); // Jan 4 is always in week 1
        const day = simple.getUTCDay() || 7;
        const week1Monday = new Date(simple);
        week1Monday.setUTCDate(simple.getUTCDate() - day + 1); // Monday of week 1
        const target = new Date(week1Monday);
        target.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7 + dayOfWeek);
        return target;
    }

    function updateWeekDisplay() {
        currentWeekSpan.textContent = currentSelectedWeek;
    }

    function setLoadingState(isLoading) {
        if (isLoading) {
            loadingIndicator.style.display = 'flex';
            lunchMenuGrid.innerHTML = '';
            errorDisplay.style.display = 'none';
            if(initialEmptyState) initialEmptyState.style.display = 'none';
        } else {
            loadingIndicator.style.display = 'none';
        }
    }

    // --- Data Fetching and Rendering ---
    async function loadLunchDataForWeek(week) {
        setLoadingState(true);
        const cookieArray = JSON.parse(sessionStorage.getItem('cookies'));
        if (!cookieArray) {
            console.error("No session cookies found for lunch menu.");
            errorDisplay.textContent = "Your session has expired. Please log in again.";
            errorDisplay.style.display = 'block';
            setLoadingState(false);
            return;
        }
        const cookieHeader = cookieArray.join('; ');

        try {
            const response = await fetch(`/api/main?week=${week}`, {
                method: 'GET',
                headers: {
                    'api': 'lunchMenu',
                    "cookies": cookieHeader,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 401) {
                console.error("Unauthorized access for lunch menu.");
                errorDisplay.textContent = "Access denied. Please ensure you are logged in.";
                errorDisplay.style.display = 'block';
                setLoadingState(false);
                return;
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data && data.success && data.data) {
                renderLunchMenu(data.data, week);
            } else {
                throw new Error(data.message || "Failed to load lunch menu data.");
            }
        } catch (error) {
            console.error("Error loading lunch menu:", error);
            errorDisplay.textContent = `Error: ${error.message || "Could not fetch lunch menu."}`;
            errorDisplay.style.display = 'block';
            lunchMenuGrid.innerHTML = '';
        } finally {
            setLoadingState(false);
        }
    }

    function renderLunchMenu(menuItems, week) {
        lunchMenuGrid.innerHTML = '';
        errorDisplay.style.display = 'none';

        if (!menuItems || menuItems.length === 0) {
            const emptyCard = document.createElement('div');
            emptyCard.className = 'empty-state';
            emptyCard.style.gridColumn = '1 / -1';
            emptyCard.textContent = `No lunch menu available for week ${week}.`;
            lunchMenuGrid.appendChild(emptyCard);
            return;
        }
        
        const currentYear = getISOWeekYear(new Date());

        menuItems.slice(0, 5).forEach((dailyMenu, index) => {
            const dayCard = document.createElement('div');
            dayCard.className = 'lunch-day-card';
            dayCard.dataset.dayIndex = index;

            const dayDate = getDateForDayOfWeek(week, currentYear, index);

            if (week === getCurrentWeekNumber() && index === currentDayIndex) {
                dayCard.classList.add('current-day');
            }

            const dayHeader = document.createElement('div');
            dayHeader.className = 'lunch-day-header';
            
            const dayNameEl = document.createElement('h4');
            dayNameEl.textContent = dayNames[index] || `Day ${index + 1}`;
            
            const dateEl = document.createElement('span');
            dateEl.className = 'lunch-date';
            dateEl.textContent = dayDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

            dayHeader.appendChild(dayNameEl);
            dayHeader.appendChild(dateEl);

            const dayBody = document.createElement('div');
            dayBody.className = 'lunch-day-body';

            if (dailyMenu.dishes && dailyMenu.dishes.length > 0) {
                const dishList = document.createElement('ul');
                dishList.className = 'dish-list';

                dailyMenu.dishes.forEach(dishItem => {
                    const listItem = document.createElement('li');
                    
                    const dishNameSpan = document.createElement('span');
                    dishNameSpan.className = 'dish-name';

                    if (typeof dishItem === 'object' && dishItem !== null && dishItem.dish) {
                        if (dishItem.type) {
                            const dishTypeSpan = document.createElement('span');
                            dishTypeSpan.className = 'dish-type';
                            dishTypeSpan.textContent = `${dishItem.type}: `;
                            dishNameSpan.appendChild(dishTypeSpan);
                        }
                        dishNameSpan.appendChild(document.createTextNode(dishItem.dish));
                        listItem.appendChild(dishNameSpan);

                        if (dishItem.allergens && Array.isArray(dishItem.allergens) && dishItem.allergens.length > 0) {
                            const allergensSpan = document.createElement('span');
                            allergensSpan.className = 'dish-allergens';
                            allergensSpan.textContent = `(${dishItem.allergens.join(', ')})`;
                            listItem.appendChild(allergensSpan);
                        }

                    } else if (typeof dishItem === 'string') {
                        dishNameSpan.textContent = dishItem;
                        listItem.appendChild(dishNameSpan);
                    } else {
                        dishNameSpan.textContent = 'Dish information unavailable';
                        listItem.appendChild(dishNameSpan);
                    }
                    dishList.appendChild(listItem);
                });
                dayBody.appendChild(dishList);
            } else {
                const noInfo = document.createElement('p');
                noInfo.className = 'no-lunch-info';
                noInfo.textContent = 'No lunch information available for this day.';
                dayBody.appendChild(noInfo);
            }

            dayCard.appendChild(dayHeader);
            dayCard.appendChild(dayBody);
            lunchMenuGrid.appendChild(dayCard);
        });

        if(initialEmptyState) initialEmptyState.style.display = 'none';
    }

    // --- Run ---
    if (document.getElementById('lunchMenu')) {
        init();
    } else {
        console.log("Lunch Menu section not primary on this page or not yet visible.");
    }

    window.activateLunchMenu = function() {
        console.log("Lunch Menu explicitly activated.");
        if (!currentWeekSpan || !prevWeekBtn || !nextWeekBtn) {
             console.error("Lunch menu elements missing on activation.");
             return;
        }
        init();
    };
});
