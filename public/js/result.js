document.addEventListener('DOMContentLoaded', () => {
    loadTestResult();
    
    // Add event listener for the show grade button
    document.getElementById('show-grade-btn').addEventListener('click', toggleGradeDisplay);
});

/**
 * Toggles the display of the grade
 */
function toggleGradeDisplay() {
    const gradeDisplay = document.getElementById('grade-display');
    const button = document.getElementById('show-grade-btn');
    
    if (gradeDisplay.style.display === 'none') {
        gradeDisplay.style.display = 'block';
        gradeDisplay.style.animation = 'fadeIn 0.3s ease-out';
        button.textContent = 'Hide Grade';
        button.classList.add('active');
        
        // Get the test ID from session storage or extract it from the link
        const link = sessionStorage.getItem('selectedItemLink');
        if (link) {
            const urlParams = new URLSearchParams(link.split('?')[1]);
            const requestId = urlParams.get('requestid');
            
            if (requestId) {
                loadGradingCriteria(requestId);
            }
        }
    } else {
        gradeDisplay.style.display = 'none';
        gradeDisplay.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => {
            gradeDisplay.style.display = 'none';
        }, 300);
        button.textContent = 'Show Grade';
        button.classList.remove('active');
    }
}

/**
 * Loads the grading criteria for a test
 * @param {string} testId - The test ID
 */
async function loadGradingCriteria(testId) {
    try {
        const loadingEl = document.getElementById('loading-criteria');
        loadingEl.style.display = 'flex';
        loadingEl.innerHTML = `
            <div class="loader-container">
                <div class="loader-spinner"></div>
                <div class="loader-text">Loading grading criteria...</div>
            </div>
        `;
        
        // Get the cookies from session storage
        const cookieArray = JSON.parse(sessionStorage.getItem('cookies') || '[]');
        if (!cookieArray || !cookieArray.length) {
            console.error('No cookies stored');
            return;
        }
        
        const cookieHeader = cookieArray.join('; ');
        
        // Fetch the grading criteria from the API
        const response = await fetch(`/api/main?testId=${testId}`, {
            method: 'GET',
            headers: {
                'cookies': cookieHeader,
                'api': 'results'
            }
        });
        
        const data = await response.json();

        if (!data.criteria[0]) {
            return; // No criteria found, exit the function
        }
        
        if (data.success && data.criteria) {
            displayGradingCriteria(data.criteria);
        } else {
            document.getElementById('criteria-list').innerHTML = '<p>Failed to load grading criteria.</p>';
        }
    } catch (error) {
        console.error('Error loading grading criteria:', error);
        document.getElementById('criteria-list').innerHTML = '<p>An error occurred while loading grading criteria.</p>';
    } finally {
        document.getElementById('loading-criteria').style.display = 'none';
    }
}

/**
 * Displays the grading criteria
 * @param {Array} criteria - The grading criteria
 */

// Update your displayGradingCriteria function:
function displayGradingCriteria(criteria) {
    const criteriaList = document.getElementById('criteria-list');
    criteriaList.innerHTML = '';
    
    // Create container div
    const container = document.createElement('div');
    container.className = 'criteria-container';
    
    // Add view mode selector
    const viewModeContainer = document.createElement('div');
    viewModeContainer.className = 'view-mode-selector';
    viewModeContainer.innerHTML = `
        <label>
            <input type="radio" name="view-mode" value="clean" checked>
            <span>Compact View</span>
        </label>
        <label>
            <input type="radio" name="view-mode" value="info">
            <span>Detailed View</span>
        </label>
    `;
    container.appendChild(viewModeContainer);
    
    // Get the current view mode
    const viewMode = document.querySelector('input[name="view-mode"]:checked').value;
    
    // Create table
    const table = document.createElement('table');
    table.className = 'criteria-table';
    
    // Create the table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    const criteriaHeader = document.createElement('th');
    criteriaHeader.textContent = 'Criteria';
    headerRow.appendChild(criteriaHeader);
    
    const eLevelHeader = document.createElement('th');
    eLevelHeader.textContent = 'E';
    headerRow.appendChild(eLevelHeader);
    
    const cLevelHeader = document.createElement('th');
    cLevelHeader.textContent = 'C';
    headerRow.appendChild(cLevelHeader);
    
    const aLevelHeader = document.createElement('th');
    aLevelHeader.textContent = 'A';
    headerRow.appendChild(aLevelHeader);
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create the table body
    const tbody = document.createElement('tbody');
    
    criteria.forEach(criterion => {
        const row = document.createElement('tr');
        
        // Criteria name/description cell
        const nameCell = document.createElement('td');
        const nameElement = document.createElement('strong');
        nameElement.textContent = criterion.name;
        nameCell.appendChild(nameElement);
        
        if (viewMode === 'info' && criterion.description) {
            const descElement = document.createElement('p');
            descElement.textContent = criterion.description;
            nameCell.appendChild(descElement);
        }
        
        row.appendChild(nameCell);
        
        // E level cell
        const eCell = document.createElement('td');
        if (criterion.levels.E) {
            if (criterion.levels.E.status === 'achieved') {
                eCell.className = 'achieved';
            } else if (criterion.levels.E.status === 'partial') {
                eCell.className = 'partial';
            }
            
            if (viewMode === 'clean') {
                eCell.textContent = '';
            } else {
                eCell.textContent = criterion.levels.E.text;
            }
        }
        row.appendChild(eCell);
        
        // C level cell
        const cCell = document.createElement('td');
        if (criterion.levels.C) {
            if (criterion.levels.C.status === 'achieved') {
                cCell.className = 'achieved';
            } else if (criterion.levels.C.status === 'partial') {
                cCell.className = 'partial';
            }
            
            if (viewMode === 'clean') {
                cCell.textContent = '';
            } else {
                cCell.textContent = criterion.levels.C.text;
            }
        } else {
            console.log("C level not found")
        }
        row.appendChild(cCell);
        
        // A level cell
        const aCell = document.createElement('td');
        if (criterion.levels.A) {
            if (criterion.levels.A.status === 'achieved') {
                aCell.className = 'achieved';
            } else if (criterion.levels.A.status === 'partial') {
                aCell.className = 'partial';
            }
            
            if (viewMode === 'clean') {
                aCell.textContent = '';
            } else {
                aCell.textContent = criterion.levels.A.text;
            }
        }
        row.appendChild(aCell);
        
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    criteriaList.appendChild(table);
    
    // Add event listeners for view mode toggle
    document.querySelectorAll('input[name="view-mode"]').forEach(radio => {
        radio.addEventListener('change', () => {
            container.style.opacity = '0.5';
            setTimeout(() => {
                displayGradingCriteria(criteria);
                container.style.opacity = '1';
            }, 200);
        });
    });
}

/**
 * Loads the test result from the API
 */
async function loadTestResult() {
    try {
        // Show loading animation
        const loadingEl = document.getElementById('result-loading');
        loadingEl.innerHTML = `
            <div class="loader-container">
                <div class="loader-spinner"></div>
                <div class="loader-text">Loading test result...</div>
            </div>
        `;
        
        // Get the link from session storage
        const link = sessionStorage.getItem('selectedItemLink');
        
        if (!link) {
            showError('No test selected');
            return;
        }
        
        // Extract the requestId and subjectId from the link
        const urlParams = new URLSearchParams(link.split('?')[1]);
        const requestId = urlParams.get('requestid');
        const subjectId = urlParams.get('subject');
        
        if (!requestId) {
            showError('Invalid test link');
            return;
        }
        
        // Get the cookies from session storage
        const cookieArray = JSON.parse(sessionStorage.getItem('cookies') || '[]');
        if (!cookieArray || !cookieArray.length) {
            console.error('No cookies stored');
            window.location.href = "login.html";
            return;
        }
        
        const cookieHeader = cookieArray.join('; ');
        
        // Fetch the test result from the API
        const response = await fetch(`/api/main?requestId=${requestId}&subjectId=${subjectId || ''}`, {
            method: 'GET',
            headers: {
                'cookies': cookieHeader,
                'Accept-Charset': 'utf-8', // Explicitly request UTF-8 encoding
                'api':'results'
            }
        });
        
        const data = await response.json();
        
        if (data.success && data.result) {
            displayTestResult(data.result);
        } else {
            showError(data.message || 'Failed to load test result');
            window.location.href = "login.html";
        }
    } catch (error) {
        console.error('Error loading test result:', error);
        showError('An error occurred while loading the test result');
    }
}

/**
 * Displays the test result on the page
 * @param {Object} result - The test result data
 */
function displayTestResult(result) {
    // Hide loading and error messages
    document.getElementById('result-loading').style.display = 'none';
    document.getElementById('result-error').style.display = 'none';
    
    // Show the content with animation
    const contentElement = document.getElementById('result-content');
    contentElement.style.display = 'block';
    contentElement.classList.add('fade-in-animation');
    
    // Set the title
    document.getElementById('result-title').textContent = decodeHtmlEntities(result.title || 'Test Result');
    
    // Animate each section in sequence
    const sections = document.querySelectorAll('.result-section');
    sections.forEach((section, index) => {
        section.style.animationDelay = `${index * 100 + 200}ms`;
        section.classList.add('slide-in-animation');
    });
    
    // Set the details
    document.getElementById('result-date').textContent = decodeHtmlEntities(result.date || 'N/A');
    document.getElementById('result-type').textContent = decodeHtmlEntities(result.type || 'N/A');
    document.getElementById('result-status').textContent = decodeHtmlEntities(result.status || 'N/A');
    document.getElementById('result-creator').textContent = decodeHtmlEntities(result.creator || 'N/A');
    document.getElementById('result-description').textContent = decodeHtmlEntities(result.description || 'No description available');
    document.getElementById('result-comments').textContent = decodeHtmlEntities(result.comments || 'No comments available');
}

/**
 * Decodes HTML entities and ensures proper UTF-8 character display
 * @param {string} text - The text to decode
 * @returns {string} The decoded text
 */
function decodeHtmlEntities(text) {
    if (!text) return '';
    
    const textArea = document.createElement('textarea');
    textArea.innerHTML = text;
    return textArea.value;
}

/**
 * Shows an error message
 * @param {string} message - The error message to display
 */
function showError(message) {
    document.getElementById('result-loading').style.display = 'none';
    document.getElementById('result-content').style.display = 'none';
    
    const errorElement = document.getElementById('result-error');
    errorElement.style.display = 'block';
    errorElement.innerHTML = `<p>${message}</p>`;
}