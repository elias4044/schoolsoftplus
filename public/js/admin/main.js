// Admin Dashboard Main Script
// Handles loading and displaying Vercel project information

let currentDeploymentId = null;
const username = getUsername(); // You'll need to get this from your auth system
let cookies;

// Initialize dashboard on load
document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
});

async function initDashboard() {
    const cookieArray = JSON.parse(sessionStorage.getItem('cookies') || '[]');
    if (!cookieArray || !cookieArray.length) {
        window.location.href = "/login.html";
    }
    cookies = cookieArray.join('; ');
    try {
        // Load all data in parallel
        await Promise.all([
            loadProjectStatus(),
            loadLatestDeployment(),
            loadProjectInfo(),
            loadDeployments(),
            loadFirestoreData()
        ]);
    } catch (error) {
        console.error('Failed to initialize dashboard:', error);
        showError('Failed to load dashboard data. Please refresh the page.');
    }
}

// Refresh all data
async function refreshData() {
    const btn = event.target.closest('button');
    const originalHTML = btn.innerHTML;

    btn.disabled = true;
    btn.innerHTML = '<span class="loader-spinner" style="width: 16px; height: 16px; border-width: 2px;"></span>';

    await initDashboard();

    btn.disabled = false;
    btn.innerHTML = originalHTML;
}

// Load project status (uptime)
async function loadProjectStatus() {
    try {
        const response = await fetch(`/api/admin?api=project-status&username=${username}`, {
            headers: {
                cookies
            }
        });

        if (!response.ok) throw new Error('Failed to fetch project status');

        const result = await response.json();
        const data = result.data;

        // Update status
        const statusEl = document.getElementById('project-status');
        const statusCard = document.getElementById('status-card');
        const statusChange = document.getElementById('status-change');

        if (data.status === 'online') {
            statusEl.innerHTML = '🟢 Online';
            statusEl.style.color = 'var(--success-color, #4caf50)';
            statusChange.innerHTML = `<span class="positive">✓ System operational</span>`;
        } else {
            statusEl.innerHTML = '🔴 Offline';
            statusEl.style.color = 'var(--danger-color, #f44336)';
            statusChange.innerHTML = `<span class="negative">✗ System down</span>`;
            statusCard.classList.add('card-danger');
        }

        // Update success rate
        document.getElementById('success-rate').textContent = data.metrics.successRate + '%';

        // Update average build time
        const avgTime = data.metrics.avgBuildTimeMs;
        if (avgTime) {
            const seconds = (avgTime / 1000).toFixed(1);
            document.getElementById('avg-build-time').textContent = seconds + 's';
        } else {
            document.getElementById('avg-build-time').textContent = 'N/A';
        }

    } catch (error) {
        console.error('Error loading project status:', error);
        document.getElementById('project-status').textContent = 'Error';
        document.getElementById('success-rate').textContent = 'Error';
        document.getElementById('avg-build-time').textContent = 'Error';
    }
}

// Load latest deployment info
async function loadLatestDeployment() {
    try {
        const response = await fetch(`/api/admin?api=latest-deployment&username=${username}`, {
            headers: {
                cookies
            }
        });

        if (!response.ok) throw new Error('Failed to fetch latest deployment');

        const result = await response.json();
        const data = result.data;

        currentDeploymentId = data.uid;

        const container = document.getElementById('latest-deployment');

        const buildTime = data.buildTimeMs ? `${(data.buildTimeMs / 1000).toFixed(1)}s` : 'N/A';
        const createdDate = new Date(data.createdAt).toLocaleString();
        const readyDate = data.readyAt ? new Date(data.readyAt).toLocaleString() : 'N/A';

        container.innerHTML = `
            <div class="flex flex-col gap-2">
                <div class="flex justify-between items-center">
                    <span style="color: var(--text-secondary);">Status:</span>
                    <span class="badge ${getStateBadgeClass(data.state)}">${data.state}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span style="color: var(--text-secondary);">URL:</span>
                    <a href="https://${data.url}" target="_blank" style="color: var(--primary-color);">${data.url}</a>
                </div>
                <div class="flex justify-between items-center">
                    <span style="color: var(--text-secondary);">Build Time:</span>
                    <strong>${buildTime}</strong>
                </div>
                <div class="flex justify-between items-center">
                    <span style="color: var(--text-secondary);">Created:</span>
                    <span>${createdDate}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span style="color: var(--text-secondary);">Ready:</span>
                    <span>${readyDate}</span>
                </div>
                ${data.gitCommit ? `
                <div class="flex justify-between items-center" style="margin-top: 8px; padding-top: 12px; border-top: 1px solid var(--border-color, rgba(255,255,255,0.1));">
                    <span style="color: var(--text-secondary);">Branch:</span>
                    <code style="background: var(--input-bg, rgba(0,0,0,0.3)); padding: 2px 8px; border-radius: 4px;">${data.gitBranch || 'N/A'}</code>
                </div>
                <div style="margin-top: 8px;">
                    <span style="color: var(--text-secondary); display: block; margin-bottom: 4px;">Commit:</span>
                    <code style="background: var(--input-bg, rgba(0,0,0,0.3)); padding: 8px; border-radius: 4px; display: block; font-size: 12px;">${data.gitCommit}</code>
                </div>
                ` : ''}
            </div>
        `;

        // Auto-fill deployment ID for logs
        document.getElementById('deployment-id-input').value = data.uid;

    } catch (error) {
        console.error('Error loading latest deployment:', error);
        document.getElementById('latest-deployment').innerHTML = `
            <div class="alert alert-danger">Failed to load deployment information</div>
        `;
    }
}

// Load project information
async function loadProjectInfo() {
    try {
        const response = await fetch(`/api/admin?api=project-info&username=${username}`, {
            headers: {
                cookies
            }
        });

        if (!response.ok) throw new Error('Failed to fetch project info');

        const result = await response.json();
        const data = result.data;

        const container = document.getElementById('project-info');

        container.innerHTML = `
            <div class="flex flex-col gap-2">
                <div class="flex justify-between">
                    <span style="color: var(--text-secondary);">Name:</span>
                    <strong>${data.name}</strong>
                </div>
                <div class="flex justify-between">
                    <span style="color: var(--text-secondary);">Framework:</span>
                    <span class="badge badge-secondary">${data.framework || 'N/A'}</span>
                </div>
                <div class="flex justify-between">
                    <span style="color: var(--text-secondary);">Node Version:</span>
                    <code style="background: var(--input-bg, rgba(0,0,0,0.3)); padding: 2px 8px; border-radius: 4px;">${data.nodeVersion || 'N/A'}</code>
                </div>
                ${data.gitRepository ? `
                <div class="flex justify-between" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border-color, rgba(255,255,255,0.1));">
                    <span style="color: var(--text-secondary);">Repository:</span>
                    <code style="font-size: 12px;">${data.gitRepository.org}/${data.gitRepository.repo}</code>
                </div>
                ` : ''}
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border-color, rgba(255,255,255,0.1));">
                    <span style="color: var(--text-secondary); display: block; margin-bottom: 4px;">Domains:</span>
                    ${data.domains.length > 0 ? data.domains.map(d => `
                        <div style="font-size: 12px; padding: 4px 0;">
                            <a href="https://${d}" target="_blank" style="color: var(--primary-color);">${d}</a>
                        </div>
                    `).join('') : '<span style="color: var(--text-secondary); font-size: 13px;">No custom domains</span>'}
                </div>
            </div>
        `;

    } catch (error) {
        console.error('Error loading project info:', error);
        document.getElementById('project-info').innerHTML = `
            <div class="alert alert-danger">Failed to load project information</div>
        `;
    }
}

// Load deployments table
async function loadDeployments() {
    try {
        const target = document.getElementById('deployment-filter').value;
        const params = new URLSearchParams({
            username: username,
            limit: '10'
        });

        if (target) params.append('target', target);

        const response = await fetch(`/api/admin?api=deployments&${params}`, {
            headers: {
                cookies
            }
        });

        if (!response.ok) throw new Error('Failed to fetch deployments');

        const result = await response.json();
        const deployments = result.data;

        const tbody = document.getElementById('deployments-body');

        if (deployments.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                        No deployments found
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = deployments.map(d => {
            const buildTime = d.buildingAt && d.ready ?
                `${((d.ready - d.buildingAt) / 1000).toFixed(1)}s` : 'N/A';
            const createdDate = new Date(d.createdAt).toLocaleString();
            const commit = d.gitSource?.message || 'N/A';
            const branch = d.gitSource?.branch || 'N/A';

            return `
                <tr onclick="selectDeployment('${d.uid}')" style="cursor: pointer;">
                    <td><span class="badge ${getStateBadgeClass(d.state)}">${d.state}</span></td>
                    <td><a href="https://${d.url}" target="_blank" style="color: var(--primary-color);">${d.url.substring(0, 30)}...</a></td>
                    <td><code style="font-size: 11px;">${branch}</code></td>
                    <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${commit}">${commit}</td>
                    <td style="font-size: 13px;">${createdDate}</td>
                    <td>${buildTime}</td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        console.error('Error loading deployments:', error);
        document.getElementById('deployments-body').innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px;">
                    <div class="alert alert-danger">Failed to load deployments</div>
                </td>
            </tr>
        `;
    }
}

// Select deployment for logs
function selectDeployment(uid) {
    document.getElementById('deployment-id-input').value = uid;
    document.getElementById('deployment-id-input').focus();
}

// Load logs for a deployment
async function loadLogs() {
    const deploymentId = document.getElementById('deployment-id-input').value.trim();

    if (!deploymentId) {
        alert('Please enter a deployment ID');
        return;
    }

    const btn = document.getElementById('load-logs-btn');
    const originalHTML = btn.innerHTML;

    btn.disabled = true;
    btn.innerHTML = '<span class="loader-spinner" style="width: 16px; height: 16px; border-width: 2px;"></span> Loading...';

    try {
        const response = await fetch(`/api/admin?api=deployment-logs&username=${username}&deploymentId=${deploymentId}&limit=200`, {
            headers: {
                cookies
            }
        });

        if (!response.ok) throw new Error('Failed to fetch logs');

        const result = await response.json();
        const logs = result.data;

        const logsContainer = document.getElementById('logs-container');
        const logsContent = document.getElementById('logs-content');

        // Format logs
        if (logs && Array.isArray(logs)) {
            const formattedLogs = logs.map(log => {
                const timestamp = new Date(log.created).toLocaleTimeString();
                return `[${timestamp}] ${log.text || log.payload?.text || JSON.stringify(log)}`;
            }).join('\n');

            logsContent.textContent = formattedLogs || 'No logs available';
        } else {
            logsContent.textContent = JSON.stringify(logs, null, 2);
        }

        logsContainer.style.display = 'block';

    } catch (error) {
        console.error('Error loading logs:', error);
        alert('Failed to load logs: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    }
}

async function loadFirestoreData() {
    try {
        const response = await fetch(`/api/admin?api=firestore-data&username=${username}`, {
            headers: { cookies }
        });

        if (!response.ok) throw new Error('Failed to fetch data from Firestore');

        const result = await response.json();
        const data = result.data;

        const container = document.getElementById('firestore-data-container');

        if (!data) {
            container.innerHTML = '<div class="alert alert-warning">No data available</div>';
            return;
        }

        // --- GLOBAL STATS ---
        const statsHTML = `
    <div class="grid">
        <div class="card stats-card">
            <div class="stats-label">Unique Logins</div>
            <div class="stats-value">${data.unique_logins}</div>
        </div>
        <div class="card stats-card">
            <div class="stats-label">Total Logins</div>
            <div class="stats-value">${data.total_logins}</div>
        </div>
        <div class="card stats-card">
            <div class="stats-label">Successful Logins</div>
            <div class="stats-value">${data.total_successful_logins}</div>
        </div>
        <div class="card stats-card">
            <div class="stats-label">Total API Calls</div>
            <div class="stats-value">${data.total_api_calls}</div>
        </div>
    </div>
`;

        // --- USERS TABLE ---
        const userRows = data.users.map(u => {
            const goals = u.data?.goals?.length
                ? u.data.goals.map(g =>
                    `<li>${g.goal} <small>(${new Date(g.time).toLocaleDateString()})</small></li>`
                ).join('')
                : '<li style="color:var(--text-secondary);">No goals</li>';

            const notes = u.data?.notes?.length
                ? u.data.notes.map(n =>
                    `<li>${n.note} <small>(${new Date(n.time).toLocaleDateString()})</small></li>`
                ).join('')
                : '<li style="color:var(--text-secondary);">No notes</li>';

            return `
        <tr>
            <td>${u.username}</td>
            <td>${u.login_count}</td>
            <td>${new Date(u.first_login).toLocaleDateString()}</td>
            <td>${new Date(u.last_login).toLocaleDateString()}</td>
            <td>
                <details>
                    <summary>View</summary>
                    <div class="data-details">
                        <div><strong>Goals</strong></div>
                        <ul>${goals}</ul>
                        <div><strong>Notes</strong></div>
                        <ul>${notes}</ul>
                    </div>
                </details>
            </td>
        </tr>
    `;
        }).join('');

        const tableHTML = `
    <div class="card span-full" style="margin-top: 20px;">
        <div class="card-header">
            <div>
                <h3 class="card-title">Users</h3>
                <p class="card-subtitle">All user data from Firestore</p>
            </div>
        </div>
        <div class="card-body">
            <div class="table-container">
                <table class="table" id="firestore-users-table">
                    <thead>
                        <tr>
                            <th>Username</th>
                            <th>Logins</th>
                            <th>First Login</th>
                            <th>Last Login</th>
                            <th>Data</th>
                        </tr>
                    </thead>
                    <tbody>${userRows}</tbody>
                </table>
            </div>
        </div>
    </div>
`;

        container.innerHTML = `
    <div class="card-header" style="margin-bottom: 12px;">
        <div>
            <h3 class="card-title">Firestore Data</h3>
            <p class="card-subtitle">All data from Firestore</p>
        </div>
    </div>
    ${statsHTML}
    ${tableHTML}
`;
        container.style.display = 'block';


    } catch (error) {
        console.error('Error loading Firestore data:', error);
        document.getElementById('firestore-data-container').innerHTML = `
            <div class="alert alert-danger">Failed to load Firestore data</div>
        `;
    }
}


// Helper: Get badge class for deployment state
function getStateBadgeClass(state) {
    switch (state) {
        case 'READY': return 'badge-success';
        case 'ERROR': return 'badge-danger';
        case 'BUILDING': return 'badge-warning';
        case 'QUEUED': return 'badge-info';
        default: return 'badge-secondary';
    }
}

// Helper: Get username (adjust based on your auth system)
function getUsername() {
    // Replace this with your actual method of getting the username
    // For example, from localStorage, a cookie, or a global variable
    return sessionStorage.getItem('username') || 'admin';
}

// Helper: Show error message
function showError(message) {
    // You can implement a toast notification or alert here
    console.error(message);
}