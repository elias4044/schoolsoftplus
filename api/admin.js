import dotenv from 'dotenv';
import { authUserWithUsername } from './lib/authUserWithUsername.js';
import { db } from './lib/firebaseAdmin.js';

dotenv.config();

const adminUsername = process.env.ADMIN_USER;
const vercelToken = process.env.VERCEL_TOKEN;
const vercelProjectId = process.env.VERCEL_PROJECT_ID;

const routes = {
    auth,
    'project-info': getProjectInfo,
    'deployments': getDeployments,
    'latest-deployment': getLatestDeployment,
    'deployment-logs': getDeploymentLogs,
    'project-status': getProjectStatus,
    'firestore-data': getFirestoreData
}

// Main API handler
export default async function handler(req, res) {
    const api = req.query.api;
    if (!api) return res.status(400).json({ success: false, error: 'Missing API.' });
    const handle = routes[api];
    if (typeof handle === 'function') {
        return await handle(req, res);
    } else {
        return res.status(404).json({ success: false, error: `API endpoint '${api}' not found.` });
    }
}

// ---------------------
//       ROUTES
// ---------------------

async function auth(req, res) {
    try {
        const { cookies } = req.headers;
        
        if (!req.body) {
            return res.status(400).json({ success: false, message: 'Request body is missing.' });
        }
        
        const username = req.body.username;

        if (!cookies) return res.status(400).json({ success: false, message: 'Missing cookies.' });
        if (!username) return res.status(400).json({ success: false, message: 'Missing username.' });
        if (username !== adminUsername) return res.status(403).json({ success: false, message: 'Forbidden.' });

        if (!(await authUserWithUsername(cookies, username))) {
            return res.status(401).json({ success: false, message: 'Not authenticated.' });
        }
        
        return res.status(200).json({ success: true, message: 'Authenticated.' });
    } catch (error) {
        console.error('[Admin | auth] Error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
}

// ---------------------
//   VERCEL ENDPOINTS
// ---------------------

/**
 * Get project information
 * GET /api/admin?api=project-info
 */
async function getProjectInfo(req, res) {
    try {
        if (!(await verifyAdmin(req))) {
            return res.status(401).json({ success: false, message: 'Unauthorized.' });
        }

        const url =  `https://api.vercel.com/v9/projects/${vercelProjectId}`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${vercelToken}`,
            }
        });

        if (!response.ok) {
            throw new Error(`Vercel API error: ${response.status}`);
        }

        const data = await response.json();

        // Return relevant project info
        return res.status(200).json({
            success: true,
            data: {
                name: data.name,
                id: data.id,
                framework: data.framework,
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
                nodeVersion: data.nodeVersion,
                gitRepository: data.link ? {
                    type: data.link.type,
                    repo: data.link.repo,
                    org: data.link.org
                } : null,
                domains: data.alias || [],
                env: data.env ? Object.keys(data.env) : []
            }
        });
    } catch (error) {
        console.error('[Admin | project-info] Error:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch project info.' });
    }
}

/**
 * Get recent deployments
 * GET /api/admin?api=deployments&limit=10&target=production
 */
async function getDeployments(req, res) {
    try {
        if (!(await verifyAdmin(req))) {
            return res.status(401).json({ success: false, message: 'Unauthorized.' });
        }

        const limit = req.query.limit || '10';
        const target = req.query.target || ''; // production, preview, or empty for all

        const params = new URLSearchParams({
            projectId: vercelProjectId,
            limit: limit,
        });

        if (target) params.append('target', target);

        const response = await fetch(`https://api.vercel.com/v6/deployments?${params}`, {
            headers: {
                'Authorization': `Bearer ${vercelToken}`,
            }
        });

        if (!response.ok) {
            throw new Error(`Vercel API error: ${response.status}`);
        }

        const data = await response.json();

        // Format deployment data
        const deployments = data.deployments.map(d => ({
            uid: d.uid,
            name: d.name,
            url: d.url,
            state: d.state, // READY, ERROR, BUILDING, etc.
            type: d.type, // LAMBDAS
            createdAt: d.createdAt,
            buildingAt: d.buildingAt,
            ready: d.ready,
            target: d.target, // production, preview
            creator: d.creator ? d.creator.username : null,
            gitSource: d.meta?.githubCommitMessage ? {
                message: d.meta.githubCommitMessage,
                sha: d.meta.githubCommitSha,
                branch: d.meta.githubCommitRef,
                author: d.meta.githubCommitAuthorName
            } : null
        }));

        return res.status(200).json({
            success: true,
            data: deployments
        });
    } catch (error) {
        console.error('[Admin | deployments] Error:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch deployments.' });
    }
}

/**
 * Get latest deployment status
 * GET /api/admin?api=latest-deployment
 */
async function getLatestDeployment(req, res) {
    try {
        if (!(await verifyAdmin(req))) {
            return res.status(401).json({ success: false, message: 'Unauthorized.' });
        }

        const params = new URLSearchParams({
            projectId: vercelProjectId,
            limit: '1',
            target: 'production'
        });

        const response = await fetch(`https://api.vercel.com/v6/deployments?${params}`, {
            headers: {
                'Authorization': `Bearer ${vercelToken}`,
            }
        });

        if (!response.ok) {
            throw new Error(`Vercel API error: ${response.status}`);
        }

        const data = await response.json();
        const deployment = data.deployments[0];

        if (!deployment) {
            return res.status(404).json({ success: false, message: 'No deployments found.' });
        }

        // Calculate uptime status
        const isUp = deployment.state === 'READY' && deployment.ready !== null;
        const buildTime = deployment.buildingAt && deployment.ready 
            ? deployment.ready - deployment.buildingAt 
            : null;

        return res.status(200).json({
            success: true,
            data: {
                uid: deployment.uid,
                url: deployment.url,
                state: deployment.state,
                isUp: isUp,
                createdAt: deployment.createdAt,
                readyAt: deployment.ready,
                buildTimeMs: buildTime,
                gitCommit: deployment.meta?.githubCommitMessage || null,
                gitBranch: deployment.meta?.githubCommitRef || null
            }
        });
    } catch (error) {
        console.error('[Admin | latest-deployment] Error:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch latest deployment.' });
    }
}

/**
 * Get deployment logs
 * GET /api/admin?api=deployment-logs&deploymentId=xxx&limit=100
 */
async function getDeploymentLogs(req, res) {
    try {
        if (!(await verifyAdmin(req))) {
            return res.status(401).json({ success: false, message: 'Unauthorized.' });
        }

        const deploymentId = req.query.deploymentId;
        const limit = req.query.limit || '100';

        if (!deploymentId) {
            return res.status(400).json({ success: false, message: 'Missing deploymentId parameter.' });
        }

        const params = new URLSearchParams({
            limit: limit,
            direction: 'backward' // Get most recent logs first
        });


        const response = await fetch(
            `https://api.vercel.com/v2/deployments/${deploymentId}/events?${params}`,
            {
                headers: {
                    'Authorization': `Bearer ${vercelToken}`,
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Vercel API error: ${response.status}`);
        }

        const data = await response.json();

        return res.status(200).json({
            success: true,
            data: data
        });
    } catch (error) {
        console.error('[Admin | deployment-logs] Error:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch logs.' });
    }
}

/**
 * Get overall project status (uptime check)
 * GET /api/admin?api=project-status
 */
async function getProjectStatus(req, res) {
    try {
        if (!(await verifyAdmin(req))) {
            return res.status(401).json({ success: false, message: 'Unauthorized.' });
        }

        // Get latest production deployment
        const params = new URLSearchParams({
            projectId: vercelProjectId,
            limit: '5',
            target: 'production'
        });


        const response = await fetch(`https://api.vercel.com/v6/deployments?${params}`, {
            headers: {
                'Authorization': `Bearer ${vercelToken}`,
            }
        });

        if (!response.ok) {
            throw new Error(`Vercel API error: ${response.status}`);
        }

        const data = await response.json();
        const deployments = data.deployments;

        if (!deployments || deployments.length === 0) {
            return res.status(404).json({ success: false, message: 'No deployments found.' });
        }

        const latest = deployments[0];
        const isUp = latest.state === 'READY';
        
        // Calculate success rate from last 5 deployments
        const successfulDeployments = deployments.filter(d => d.state === 'READY').length;
        const successRate = (successfulDeployments / deployments.length) * 100;

        // Calculate average build time
        const buildTimes = deployments
            .filter(d => d.buildingAt && d.ready)
            .map(d => d.ready - d.buildingAt);
        const avgBuildTime = buildTimes.length > 0 
            ? buildTimes.reduce((a, b) => a + b, 0) / buildTimes.length 
            : null;

        return res.status(200).json({
            success: true,
            data: {
                status: isUp ? 'online' : 'offline',
                latestDeployment: {
                    state: latest.state,
                    url: latest.url,
                    createdAt: latest.createdAt
                },
                metrics: {
                    successRate: successRate.toFixed(1),
                    avgBuildTimeMs: avgBuildTime ? Math.round(avgBuildTime) : null,
                    totalDeploymentsChecked: deployments.length
                }
            }
        });
    } catch (error) {
        console.error('[Admin | project-status] Error:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch project status.' });
    }
}

// ---------------------
//      HELPERS
// ---------------------

/**
 * Verify admin authentication from request
 */
async function verifyAdmin(req) {
    try {
        const { cookies } = req.headers;
        const username = req.query.username || req.body?.username;

        if (!cookies || !username) return false;
        if (username !== adminUsername) return false;

        return await authUserWithUsername(cookies, username);
    } catch (error) {
        console.error('[verifyAdmin] Error:', error);
        return false;
    }
}


// ---------------------
//      FIREBASE
// ---------------------

async function getFirestoreData(req, res) {
    try {
        if (!(await verifyAdmin(req))) {
            return res.status(401).json({ success: false, message: 'Unauthorized.' });
        }

        const data = await db.collection('stats').doc('loginStats').get();
        return res.status(200).json({ success: true, data: data.data() });
    } catch (error) {
        console.error('[Admin | getFirestoreData] Error:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch data from Firestore.' });
    }
}