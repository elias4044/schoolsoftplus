let dataToLoad = null;
let amountOfHomework = 0;
let amountOfTests = 0;


function showSkeletonLoader(containerId, count = 4) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Skeleton loader container with ID "${containerId}" not found.`);
        window.toast({ message: "Skeleton loader container not found", type: "error" });
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

function animateInSequence(selector, delayBetween = 100) {
    const elements = document.querySelectorAll(selector);
    elements.forEach((el, index) => {
        el.style.animationDelay = `${index * delayBetween}ms`;
        el.classList.add('fadeSlideUpAnimation');
    });
}

function getCurrentWeekNumber(date = new Date()) {
    // ISO 8601 week calculation (UTC safe)
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = d.getUTCDay() || 7; // ISO: Monday=1, Sunday=7
    d.setUTCDate(d.getUTCDate() + 4 - day); // move to Thursday
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Move this after DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    animateInSequence(".card");
});

function setupEventListeners() {
    const addNote = document.getElementById("add-note-btn");
    if (!addNote) {
        console.error('Add note button not found');
        return;
    }

    // Remove previous event listeners to prevent duplicates
    const newAddNote = addNote.cloneNode(true);
    addNote.parentNode.replaceChild(newAddNote, addNote);

    newAddNote.addEventListener("click", () => {
        const cookieArray = JSON.parse(sessionStorage.getItem('cookies') || '[]');
        const cookieHeader = cookieArray.join('; ');
        const noteInput = document.getElementById("note");

        newAddNote.disabled = true;

        if (!noteInput || !noteInput.value.trim()) {
            console.error('Note input is empty or not found');
            return;
        }

        fetch('/api/main', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api': 'noteHandle'
            },
            body: JSON.stringify({
                username: sessionStorage.getItem('username'),
                notes: noteInput.value,
                time: new Date().toISOString(),
                cookies: cookieHeader
            })
        })
            .then(response => response.json())
            .then(data => {
                newAddNote.disabled = false;
                if (data && data.success) {
                    // Clear the input field after successful addition
                    noteInput.value = '';
                    // Reload notes to show the new one
                    loadNotes();
                } else {
                    console.error('Failed to add note');
                }
            })
            .catch(error => {
                newAddNote.disabled = false;
                console.error('Error adding note:', error);
            });
    });

    const addGoal = document.getElementById("add-goal-btn");
    if (!addGoal) {
        console.error('Add goal button not found');
        return;
    }

    // Remove previous event listeners to prevent duplicates
    const newAddGoal = addGoal.cloneNode(true);
    addGoal.parentNode.replaceChild(newAddGoal, addGoal);

    newAddGoal.addEventListener("click", () => {
        const cookieArray = JSON.parse(sessionStorage.getItem('cookies') || '[]');
        if (!cookieArray || !cookieArray.length) {
            console.error('No cookies stored');
            window.location.href = "/login.html";
            return null;
        }

        newAddGoal.disabled = true;


        const cookieHeader = cookieArray.join('; ');
        const goalInput = document.getElementById("goal");

        if (!goalInput || !goalInput.value.trim()) {
            console.error('Goal input is empty or not found');
            return;
        }

        fetch('/api/main', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api': 'goalHandle'
            },
            body: JSON.stringify({
                username: sessionStorage.getItem('username'),
                goal: goalInput.value,
                time: new Date().toISOString(),
                cookies: cookieHeader
            })
        })
            .then(response => response.json())
            .then(data => {
                newAddGoal.disabled = false;
                if (data && data.success) {
                    // Clear the input field after successful addition
                    goalInput.value = '';
                    // Reload goals to show the new one
                    loadGoals();
                } else {
                    console.error('Failed to add goal');
                }
            })
            .catch(error => {
                newAddGoal.disabled = false;
                console.error('Error adding goal:', error);
                window.toast({ message: 'Error adding goal', type: 'error' });
            })
    })
}


async function deleteNote(note, time) {
    console.log(note, time);
    try {
        const cookieArray = JSON.parse(sessionStorage.getItem('cookies') || '[]');
        if (!cookieArray || !cookieArray.length) {
            console.error('No cookies stored');
            window.location.href = "/login.html";
            return null;
        }

        document.getElementById('note-list').innerHTML = ''; // Clear the note list before async
        showSkeletonLoader('note-list', 2);
        // Send a request to the server to delete the note

        const cookieHeader = cookieArray.join('; ');
        const username = sessionStorage.getItem('username');
        if (!username) {
            console.error('No username stored');
            return null;
        }
        const response = await fetch('/api/main', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'api': 'noteHandle'
            },
            body: JSON.stringify({
                username,
                cookies: cookieHeader,
                note: note,
                time: time
            }), // Send username and cookies in the request body
        });

        const data = await response.json();
        if (data && data.success) {

            loadNotes();
        } else {
            console.error('Failed to delete note');
            return null;
        }
    } catch (error) {
        console.error('Error deleting note:', error);
        loadNotes(); // Reload notes on error to ensure UI consistency
        window.toast({ message: 'Error deleting note', type: 'error' });
        return null;
    }
}

async function loadNotes() {
    try {
        showSkeletonLoader('note-list', 2);
        const cookieArray = JSON.parse(sessionStorage.getItem('cookies') || '[]');
        if (!cookieArray || !cookieArray.length) {
            console.error('No cookies stored');
            window.location.href = "/login.html";
            return null;
        }

        const cookieHeader = cookieArray.join('; ');
        const username = sessionStorage.getItem('username');
        if (!username) {
            console.error('No username stored');
            return null;
        }
        const response = await fetch('/api/main', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api': 'notes'
            },
            body: JSON.stringify({
                username,
                cookies: cookieHeader
            }), // Send username and cookies in the request body
        });

        const data = await response.json();
        if (data && data.success) {
            const notes = data.data;
            const noteList = document.getElementById('note-list');
            noteList.innerHTML = '';
            let noteCount = 0;
            const noteCountElement = document.getElementById('note-count');
            noteCountElement.textContent = noteCount;

            notes.forEach(note => {
                noteCount++
                noteCountElement.textContent = noteCount;
                const listContainer = document.createElement('div');
                listContainer.classList.add('list-container'); // Add this class to the container div
                noteList.appendChild(listContainer); // Append the container to the not

                const listItem = document.createElement('li');
                listItem.textContent = note.note;
                listItem.classList.add('note-item');


                const timeItem = document.createElement('p');
                timeItem.textContent = note.time;
                timeItem.classList.add('note-time');
                listContainer.appendChild(timeItem); // Append time item to the container

                listContainer.appendChild(listItem); // Append the list item to the container

                listContainer.addEventListener('click', () => {
                    deleteNote(note.note || "", note.time);
                });
            });
            animateInSequence(".note-item");
            noteCountElement.textContent = noteCount;
        } else {
            console.error('Failed to fetch notes');
            return null;
        }
    } catch (error) {
        console.error('Error fetching notes:', error);
        window.toast({ message: 'Error fetching notes', type: 'error' })
        return null;
    }
}




async function deleteGoal(goal, time) {
    try {
        const cookieArray = JSON.parse(sessionStorage.getItem('cookies') || '[]');
        if (!cookieArray || !cookieArray.length) {
            console.error('No cookies stored');
            window.location.href = "/login.html";
            return null;
        }

        document.getElementById('goals-list').innerHTML = ''; // Clear the note list before async
        showSkeletonLoader('goals-list', 2);
        // Send a request to the server to delete the goal

        const cookieHeader = cookieArray.join('; ');
        const username = sessionStorage.getItem('username');
        if (!username) {
            console.error('No username stored');
            return null;
        }
        const response = await fetch('/api/main', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'api': 'goalHandle'
            },
            body: JSON.stringify({
                username,
                cookies: cookieHeader,
                goal: goal || "",
                time: time
            }), // Send username and cookies in the request body
        });

        const data = await response.json();
        if (data && data.success) {

            loadGoals();
        } else {
            console.error('Failed to delete goal');
            return null;
        }
    } catch (error) {
        console.error('Error deleting goal:', error);
        window.toast({ message: 'Error deleting goal', type: 'error' });
        loadGoals(); // Reload notes on error to ensure UI consistency
        return null;
    }
}

async function loadGoals() {
    try {
        showSkeletonLoader('goals-list', 2);
        const cookieArray = JSON.parse(sessionStorage.getItem('cookies') || '[]');
        if (!cookieArray || !cookieArray.length) {
            console.error('No cookies stored');
            window.location.href = "/login.html";
            return null;
        }

        const cookieHeader = cookieArray.join('; ');
        const username = sessionStorage.getItem('username');
        if (!username) {
            console.error('No username stored');
            return null;
        }
        const response = await fetch('/api/main', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api': 'goals'
            },
            body: JSON.stringify({
                username,
                cookies: cookieHeader
            }), // Send username and cookies in the request body
        });

        const data = await response.json();

        if (response.status === 401) {
            window.location.href = "/login.html";
            return null;
        }

        if (data && data.success) {
            const goals = data.data;
            const goalList = document.getElementById('goals-list');
            goalList.innerHTML = '';
            let goalCount = 0;
            const goalCountElement = document.getElementById('goals-count');
            goalCountElement.textContent = goalCount;

            goals.forEach(goal => {
                goalCount++
                goalCountElement.textContent = goalCount;
                const listContainer = document.createElement('div');
                listContainer.classList.add('list-container'); // Add this class to the container div
                goalList.appendChild(listContainer); // Append the container to the not

                const listItem = document.createElement('li');
                listItem.textContent = goal.goal;
                listItem.classList.add('note-item');


                const timeItem = document.createElement('p');
                timeItem.textContent = goal.time;
                timeItem.classList.add('note-time');
                listContainer.appendChild(timeItem); // Append time item to the container

                listContainer.appendChild(listItem); // Append the list item to the container

                listContainer.addEventListener('click', () => {
                    deleteGoal(goal.goal, goal.time);
                });
            });
            animateInSequence(".note-item");
            goalCountElement.textContent = goalCount;
        } else {
            console.error('Failed to fetch notes');
            window.toast({ message: 'Failed to fetch notes', type: 'error' });
            return null;
        }
    } catch (error) {
        console.error('Error fetching notes:', error);
        window.toast({ message: 'Error fetching notes', type: 'error' });
        return null;
    }
}

async function loadNews() {
    const newsContainer = document.getElementById('news-container');

    if (!newsContainer) {
        console.error('News container not found');
        return;
    }

    const cookieArray = JSON.parse(sessionStorage.getItem('cookies') || '[]');
    if (!cookieArray || !cookieArray.length) {
        console.error('No cookies stored');
        window.location.href = "/login.html";
        return null;
    }

    const cookieHeader = cookieArray.join('; ');

    document.querySelector('#news .loader-text').innerHTML = 'Loading news...';

    try {
        const response = await fetch('/api/main', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'api': 'news',
                'Cookies': cookieHeader
            }
        });

        if (response.status === 401) {
            window.location.href = "/login.html";
            return null;
        }

        const data = await response.json();

        if (data && data.success) {
            const news = data.data;
            newsContainer.innerHTML = '';
            news.forEach(newsItem => {

                const newsItemElement = document.createElement('div');
                newsItemElement.classList.add('news-item');
                newsItemElement.dataset.id = newsItem.id;
                newsItemElement.innerHTML = `
                    <h4 class="news-title">${newsItem.title}</h4>
                    ${newsItem.preview ? `<p class="news-preview">${newsItem.preview}</p>` : ''}
                `;
                newsContainer.appendChild(newsItemElement);
            });
            animateInSequence('.news-item');
        } else {
            console.error('Failed to fetch news');
            window.toast({ message: 'Failed to fetch news', type: 'error' });
        }
    } catch (error) {
        console.error('Error fetching news:', error);
        window.toast({ message: 'Error fetching news', type: 'error' });
    }
}

async function loadThisWeeksAssignments() {
    showSkeletonLoader('assignments-list', 2);

    try {
        // --- Get cookies from session ---
        const cookieArray = JSON.parse(sessionStorage.getItem('cookies') || '[]');
        if (!cookieArray || !cookieArray.length) {
            console.error('No cookies stored');
            window.location.href = "/login.html";
            return null;
        }

        const cookieHeader = cookieArray.join('; ');

        // --- Calculate current year & week ---
        const currentYear = new Date().getFullYear();
        const currentWeek = getCurrentWeekNumber();

        // --- Fetch assignments ---
        const response = await fetch(`/api/main?week=${currentWeek}&year=${currentYear}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'api': 'getWeekAssignments',
                'Cookies': cookieHeader
            }
        });

        if (response.status === 401) {
            window.location.href = "/login.html";
            return null;
        }

        const data = await response.json();

        // --- If success, render assignments ---
        if (data && data.success) {
            const assignments = data.data.filter(a => !a.subTitle.includes("Unit Plan")); // filter out unit plans

            const assignmentList = document.getElementById('assignments-list');
            assignmentList.innerHTML = '';

            const assignmentCountElement = document.getElementById('assignments-count');
            assignmentCountElement.textContent = assignments.length;

            if (assignments.length === 0) {
                assignmentList.innerHTML = `<p class="empty-state">No assignments this week 🎉</p>`;
                return;
            }

            // --- Group assignments by day ---
            const grouped = groupAssignmentsByDay(assignments);

            // --- Render each day group ---
            Object.keys(grouped).forEach(day => {
                const dayHeader = document.createElement('h4');
                dayHeader.textContent = day;
                dayHeader.classList.add('day-header2');
                assignmentList.appendChild(dayHeader);

                grouped[day].forEach(assignment => {
                    const listContainer = document.createElement('div');
                    listContainer.classList.add('list-container');

                    let assignmentType = assignment.subTitle

                    if (assignmentType.includes('Assignment') || assignmentType.includes('Classroom Activity')) {
                        assignmentType = 'assignment';
                    } else if (assignmentType.includes('Homework')) {
                        assignmentType = 'homework';
                    } else if (assignmentType.includes('Test')) {
                        assignmentType = 'assignment';
                    } else {
                        assignmentType = 'assignment';
                    }
                    listContainer.onclick = () => {
                        window.location.href = `/subjects/assignment?id=${assignment.id}&type=${assignmentType}`;
                    };


                    const dueDate = duePart.replace('Förfaller ', '');

                    // Title
                    const title = document.createElement('li');
                    title.textContent = assignment.title;
                    title.classList.add('assignment-item');


                    // Type & subject
                    const typeItem = document.createElement('p');
                    typeItem.innerHTML = `<span class="assignment-label">${assignment.subTitle}</span>`;
                    typeItem.classList.add('assignment-meta');

                    listContainer.appendChild(timeItem);
                    listContainer.appendChild(title);
                    listContainer.appendChild(typeItem);

                    assignmentList.appendChild(listContainer);
                });

            });
        }
    } catch (error) {
        console.error('Error fetching this week assignments:', error);
        window.toast({ message: 'Error fetching this week assignments', type: 'error' });
        return null;
    }
}

// --- Helper: Group by day name (Mon, Tue, etc.)
function groupAssignmentsByDay(assignments) {
    const groups = {};
    assignments.forEach(a => {
        const dateStr = a.sortDate.split(' ')[0]; // "2025-09-17"
        const dateObj = new Date(dateStr);
        const dayName = dateObj.toLocaleDateString(undefined, { weekday: 'long' });
        if (!groups[dayName]) groups[dayName] = [];
        groups[dayName].push(a);
    });
    return groups;
}

// --- Helper: Format "2025-09-17 16:00" nicely
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}


async function finalCheck() {
    const noteList = document.getElementById("note-list") || null;
    const goalsList = document.getElementById("goals-list") || null;

    if (!noteList || !goalsList) {
        console.warn("No lists found for final check.");
        return false;
    }

    if (noteList.childElementCount === 0) {
        noteList.innerHTML = "<p class='no-results'>No Notes</p>";
    }

    if (goalsList.childElementCount === 0) {
        goalsList.innerHTML = "<p class='no-results'>No Goals</p>";
    }

    return true;
}

/**
 * Attaches click event handlers to all clickable items
 */
function attachClickHandlers() {
    // Handle test items
    document.querySelectorAll('.test-item.clickable').forEach(item => {
        item.addEventListener('click', () => {
            console.log('Test item clicked!');
            if (item.dataset.link) {
                sessionStorage.setItem('selectedItemLink', item.dataset.link);
                window.location.href = 'result.html';
            }
        });
    });
}


// Initialize when the page loads
window.addEventListener('load', async function () {
    loadNotes();
    loadGoals();
    loadThisWeeksAssignments();
    loadNews();
    // Set up event listeners after a short delay to ensure DOM is ready
    setTimeout(setupEventListeners, 500);
    setTimeout(attachClickHandlers, 500);
    setTimeout(finalCheck, 500);
});

// Also set up event listeners when DOM is fully loaded
document.addEventListener('DOMContentLoaded', setupEventListeners);