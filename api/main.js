/**
 * @file This file contains the main API handler for the Schoolsoft+ application.
 * @description It routes requests to various handlers for interacting with the Schoolsoft platform and Firebase for user data.
 * @author Elias
 * @version 2.0.1
 */

import { authUser } from "./lib/authUser.js";
import { authUserWithUsername } from "./lib/authUserWithUsername.js";
import { db } from "./lib/firebaseAdmin.js";

import axios from 'axios';
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';
import iconv from 'iconv-lite';

// GoogleGenAI for gemini
import { GoogleGenAI } from '@google/genai';

dotenv.config();

// ================================================================================= //
//                            Constants & Configuration                              //
// ================================================================================= //

const SCHOOLSOFT_BASE_URL = "https://sms.schoolsoft.se/engelska";
const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36';

/**
 * A centralized Axios instance for making requests to Schoolsoft.
 * It standardizes the base URL, User-Agent, and other common headers.
 */
const schoolsoftApi = axios.create({
    baseURL: SCHOOLSOFT_BASE_URL,
    headers: {
        'User-Agent': DEFAULT_USER_AGENT,
        'Referer': `${SCHOOLSOFT_BASE_URL}/`,
        'Origin': 'https://sms.schoolsoft.se'
    }
});

// ================================================================================= //
//                                 Helper Functions                                  //
// ================================================================================= //

/**
 * Decodes SchoolSoft's typical ISO-8859-1 HTML response into a UTF-8 string.
 * @param {Buffer} buffer - The response data as a buffer.
 * @returns {string} The decoded HTML string.
 */
const decodeHtmlResponse = (buffer) => iconv.decode(Buffer.from(buffer), 'ISO-8859-1');

/**
 * A robust error handler for API requests. It logs the error and sends a
 * standardized JSON response with an appropriate status code.
 * @param {import('next').NextApiResponse} res - The response object.
 * @param {Error} error - The caught error.
 * @param {string} context - The name of the function where the error occurred (for logging).
 */
const handleApiError = (res, error, context) => {
    console.error(`[${context}] Error:`, error.message);
    if (error.response) {
        // The request was made and the server responded with a non-2xx status code
        const { status, statusText, data } = error.response;
        console.error(`[${context}] Status: ${status} ${statusText}`);
        console.error(`[${context}] Data:`, data);
        return res.status(status).json({
            success: false,
            error: `Error from upstream service: ${statusText}`
        });
    } else if (error.request) {
        // The request was made but no response was received
        return res.status(504).json({ success: false, error: 'No response from upstream server.' });
    }
    // Something happened in setting up the request that triggered an Error
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
};

// ================================================================================= //
//                                  API Handlers Map                                 //
// ================================================================================= //

/**
 * Maps API keys from the request header to their corresponding handler functions.
 * This is a scalable alternative to a long if-else-if chain.
 */
const apiHandlers = {
    startpage,
    schedule,
    results,
    notes: getNotes,
    noteHandle,
    goals: getGoals,
    goalHandle,
    subjects: getSubjectsData,
    lunchMenu: getLunchMenu,
    ai: askAI,
    custom,
    subjectData: getSubjectData,
    assignment: getAssignment,
    getWeekAssignments: getWeekAssignment,
    news: fetchNews,
};

// ================================================================================= //
//                                   Main Handler                                    //
// ================================================================================= //

/**
 * The main API handler. It validates the request, updates API call statistics,
 * and routes the request to the appropriate sub-handler.
 * @param {import('next').NextApiRequest} req - The incoming request.
 * @param {import('next').NextApiResponse} res - The outgoing response.
 */
export default async function handler(req, res) {
    let { api } = req.headers;

    if (!api) {
        api = req.query.api;
        if (!api) return res.status(400).json({ success: false, error: 'Missing API.' });
    }

    try {
        const statRef = db.collection("stats").doc("loginStats");
        await db.runTransaction(async (transaction) => {
            const statDoc = await transaction.get(statRef);
            if (!statDoc.exists) {
                throw new Error("Statistics document not found.");
            }
            const newTotal = (statDoc.data().total_api_calls || 0) + 1;
            transaction.update(statRef, { total_api_calls: newTotal });
        });

        const handle = apiHandlers[api];
        if (typeof handle === 'function') {
            return await handle(req, res);
        } else {
            return res.status(404).json({ success: false, error: `API endpoint '${api}' not found.` });
        }
    } catch (error) {
        console.error(`[handler] Uncaught error for API '${api}':`, error);
        return res.status(500).json({ success: false, error: "An unexpected internal server error occurred." });
    }
}

// ================================================================================= //
//                             Schoolsoft API Functions                              //
// ================================================================================= //

/**
 * Fetches and parses the start page for homework and recent test results.
 * @param {import('next').NextApiRequest} req
 * @param {import('next').NextApiResponse} res
 */
async function startpage(req, res) {
    const { cookies } = req.headers;
    if (!cookies) return res.status(400).json({ success: false, error: "Cookies are required." });

    try {
        const response = await schoolsoftApi.get('/jsp/student/right_student_startpage.jsp', {
            headers: { 'Cookie': cookies },
            responseType: 'arraybuffer'
        });
        const html = decodeHtmlResponse(response.data);
        const $ = cheerio.load(html);

        const homework = $('#week_tests_con_content table tr').map((_, el) => {
            const anchor = $(el).find('a.list');
            if (!anchor.length) return null;
            return {
                dateAndSubject: anchor.find('div.heading_bold').text().trim(),
                title: anchor.find('div').eq(1).text().trim(),
                content: anchor.find('p.tinymce-p').map((_, p) => $(p).text().trim()).get().filter(Boolean)
            };
        }).get();

        const tests = $('#week_results_con_content table tr').map((_, el) => {
            const anchor = $(el).find('a.list');
            if (!anchor.length) return null;
            return {
                title: anchor.find('div.heading_bold').text().trim(),
                description: anchor.find('div.comment').text().trim(),
                link: anchor.attr('href')
            };
        }).get();

        return res.status(200).json({ success: true, data: { homework, tests } });
    } catch (error) {
        return handleApiError(res, error, 'startpage');
    }
}

/**
 * Fetches and processes the student's schedule, removing duplicates.
 * @param {import('next').NextApiRequest} req
 * @param {import('next').NextApiResponse} res
 */
async function schedule(req, res) {
    const { cookies } = req.headers;
    if (req.method !== 'GET') return res.status(405).setHeader('Allow', ['GET']).json({ success: false, error: 'Method not allowed.' });
    if (!cookies) return res.status(400).json({ success: false, error: 'Missing cookies.' });

    try {
        const response = await schoolsoftApi.get('/rest-api/calendar/student/lessons', {
            headers: { 'Cookie': cookies, 'Accept': 'application/json' },
            responseType: 'json'
        });
        const uniqueLessons = new Map();
        Object.values(response.data).forEach(lesson => {
            if (lesson?.eventId && lesson?.startDate) {
                const timeKey = `${lesson.startDate}-${lesson.endDate}`;
                if (!uniqueLessons.has(timeKey)) uniqueLessons.set(timeKey, lesson);
            }
        });
        const processedSchedule = Array.from(uniqueLessons.values())
            .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        return res.status(200).json({ success: true, schedule: processedSchedule });
    } catch (error) {
        return handleApiError(res, error, 'schedule');
    }
}

/**
 * Routes to the correct results function based on query parameters.
 * @param {import('next').NextApiRequest} req
 * @param {import('next').NextApiResponse} res
 */
async function results(req, res) {
    if (req.query.testId) {
        return getTestGradingCriteria(req, res);
    }
    return getTestResults(req, res);
}

/**
 * Fetches and parses detailed test results.
 * @param {import('next').NextApiRequest} req
 * @param {import('next').NextApiResponse} res
 */
async function getTestResults(req, res) {
    const { requestId, subjectId = '0' } = req.query;
    const { cookies } = req.headers;
    if (!cookies) return res.status(401).json({ success: false, message: 'No cookies provided.' });
    if (!requestId) return res.status(400).json({ success: false, message: 'No requestId provided.' });

    try {
        const url = `/jsp/student/right_student_test_results.jsp?action=view&subject=${subjectId}&requestid=${requestId}`;
        const response = await schoolsoftApi.get(url, { headers: { Cookie: cookies }, responseType: 'arraybuffer' });
        const html = decodeHtmlResponse(response.data);
        const $ = cheerio.load(html, { decodeEntities: false });
        const accordionGroup = $(`#accordion-group${requestId}`);
        if (!accordionGroup.length) return res.status(404).json({ success: false, error: 'Test result not found.' });

        const result = {
            date: accordionGroup.find('.accordion-heading-left div').first().text().trim(),
            title: accordionGroup.find('.preview-block').text().trim(),
            status: accordionGroup.find('.accordion-heading-date').text().trim(),
            type: accordionGroup.find('.accordion-inner .heading_bold').first().text().trim(),
            grade: accordionGroup.find('.heading_bold:contains("Grade")').next('div').text().trim(),
            comments: accordionGroup.find('.heading_bold:contains("Student Comments")').next('div').text().trim(),
            description: accordionGroup.find('.heading_bold:contains("Description")').next('div').text().trim(),
            creator: accordionGroup.find('.heading_bold:contains("Created by")').next('div').text().trim(),
        };
        return res.status(200).json({ success: true, result });
    } catch (error) {
        return handleApiError(res, error, 'getTestResults');
    }
}

/**
 * Fetches and parses grading criteria for a specific test.
 * @param {import('next').NextApiRequest} req
 * @param {import('next').NextApiResponse} res
 */
async function getTestGradingCriteria(req, res) {
    const { testId, gradeSubject = '0', archive = '0' } = req.query;
    const { cookies } = req.headers;
    if (!cookies) return res.status(401).json({ success: false, message: 'No cookies provided.' });
    if (!testId) return res.status(400).json({ success: false, message: 'No testId provided.' });

    try {
        const url = `/jsp/student/right_student_ability_ajax.jsp?action=listtest&test=${testId}&gradesubject=${gradeSubject}&archive=${archive}&_=${Date.now()}`;
        const response = await schoolsoftApi.get(url, { headers: { Cookie: cookies }, responseType: 'arraybuffer' });
        const html = decodeHtmlResponse(response.data);
        const $ = cheerio.load(html, { decodeEntities: false });

        const criteria = $('table.longlist tr.value').map((_, row) => {
            const nameCell = $(row).find('td:first-child');
            const nameText = nameCell.find('b').text().trim();
            const processCell = (pos) => {
                const cell = $(row).find(`td:nth-child(${pos})`);
                const div = cell.find('div.green, div.yellow').first() || cell.find('div').first();
                if (!div.length) return null;
                const divClass = div.attr('class') || '';
                const status = divClass.includes('green') ? 'achieved' : (divClass.includes('yellow') ? 'partial' : 'none');
                return { text: div.text().trim(), status };
            };
            return {
                name: nameText,
                description: nameCell.text().replace(nameText, '').trim(),
                levels: { E: processCell(2), C: processCell(3), A: processCell(4) }
            };
        }).get();

        return res.status(200).json({ success: true, criteria });
    } catch (error) {
        return handleApiError(res, error, 'getTestGradingCriteria');
    }
}

/**
 * Fetches all subjects and enriches them with details like assignments and teachers.
 * @param {import('next').NextApiRequest} req
 * @param {import('next').NextApiResponse} res
 */
async function getSubjectsData(req, res) {
    const { cookies } = req.headers;
    if (!cookies)
        return res.status(400).json({ success: false, message: "Missing cookies" });

    if (!(await authUser(cookies)))
        return res.status(401).json({ success: false, message: "Not authenticated" });

    try {
        const { data: subjects } = await schoolsoftApi.get("/rest-api/student/ps/subjectroom/all", {
            headers: { Cookie: cookies },
            responseType: 'json'
        });

        const enriched = await Promise.all(
            subjects.map(async (subject) => {
                const id = subject.activityId;

                try {
                    const [entitiesRes, unreadRes, teachersRes] = await Promise.all([
                        schoolsoftApi.get(`/rest-api/student/ps/subjectroom/${id}/entities`, { headers: { Cookie: cookies }, responseType: 'json' }),
                        schoolsoftApi.get(`/rest-api/student/ps/subjectroom/${id}/unread_entities`, { headers: { Cookie: cookies }, responseType: 'json' }),
                        schoolsoftApi.get(`/rest-api/student/ps/subjectroom/${id}/teachers`, { headers: { Cookie: cookies }, responseType: 'json' })
                    ]);

                    const entities = entitiesRes.data.map(e => ({
                        ...e,
                        entityType: e.planningId ? "PLANNING" : "ASSIGNMENT"
                    }));

                    return {
                        ...subject,
                        id,
                        entities,
                        unreadEntities: parseInt(unreadRes.data, 10),
                        teachers: teachersRes.data
                    };
                } catch (err) {
                    console.error(`[getSubjectsData] Failed to fetch details for subject ${id}:`, err.message);
                    return { ...subject, id, entities: [], unreadEntities: 0, teachers: [] };
                }
            })
        );

        return res.status(200).json({ success: true, subjects: enriched });
    } catch (error) {
        return handleApiError(res, error, 'getSubjectsData');
    }
}


/**
 * Fetches detailed data for a single subject.
 * @param {import('next').NextApiRequest} req
 * @param {import('next').NextApiResponse} res
 */
async function getSubjectData(req, res) {
    const { id } = req.query;
    const { cookies } = req.headers;
    if (!id) return res.status(400).json({ success: false, message: "Missing subject ID" });
    if (!cookies) return res.status(400).json({ success: false, message: "Missing cookies" });
    if (!(await authUser(cookies))) return res.status(401).json({ success: false, message: "Not authenticated" });

    try {
        const results = await Promise.all([
            schoolsoftApi.get(`/rest-api/student/ps/subjectroom/${id}`, { headers: { Cookie: cookies }, responseType: 'json' }),
            schoolsoftApi.get(`/rest-api/student/ps/assignments/examinations?activityId=${id}`, { headers: { Cookie: cookies }, responseType: 'json' }),
            schoolsoftApi.get(`/rest-api/student/ps/assignments/submissions?activityId=${id}`, { headers: { Cookie: cookies }, responseType: 'json' }),
            schoolsoftApi.get(`/rest-api/student/ps/subjectroom/${id}/table/rows`, { headers: { Cookie: cookies }, responseType: 'json' })
        ]);
        const [subject, examinations, submissions, assignments] = results.map(r => r.data);
        return res.status(200).json({
            success: true,
            subject,
            overview: { examinations, submissions },
            assignments
        });
    } catch (error) {
        return handleApiError(res, error, 'getSubjectData');
    }
}

/**
 * Fetches assignment or planning details based on the provided query params.
 * Example: /api/getAssignment?id=12345&type=assignment
 */
async function getAssignment(req, res) {
    const { id, type } = req.query;
    const { cookies } = req.headers;

    if (!id || !type)
        return res.status(400).json({ success: false, message: "Missing assignment ID or type" });

    if (!cookies)
        return res.status(400).json({ success: false, message: "Missing cookies" });

    if (!(await authUser(cookies)))
        return res.status(401).json({ success: false, message: "Not authenticated" });

    try {
        const BASE_URL = "/rest-api/student/ps";
        const fetchData = async (url) => {
            try {
                const response = await schoolsoftApi.get(url, {
                    headers: { Cookie: cookies },
                    responseType: "json",
                });
                return response.data;
            } catch (err) {
                if (err.response?.status === 404) return null;
                throw err;
            }
        };

        let result = { type, data: null };

        // --- Planning ---
        if (type === "planning") {
            const planningTabs = await fetchData(`${BASE_URL}/plannings/${id}/planning_parts/tabs`);
            if (!planningTabs?.length)
                return res.status(404).json({ success: false, message: "Planning not found" });

            const partId = planningTabs[0].id;
            const planningView = await fetchData(`${BASE_URL}/planning_parts/${partId}/view`);
            if (!planningView)
                return res.status(404).json({ success: false, message: "Planning view not found" });

            result.data = planningView;
        }

        // --- Assignment ---
        else if (type === "assignment") {
            const viewData = await fetchData(`${BASE_URL}/assignments/${id}/view`);
            if (!viewData)
                return res.status(404).json({ success: false, message: "Assignment not found" });

            const sections = await fetchData(`${BASE_URL}/assignments/${id}/sections`);
            const teachers = viewData.subjectRoomId
                ? await fetchData(`${BASE_URL}/subjectroom/${viewData.subjectRoomId}/teachers`)
                : null;

            // Preload extra info from sections
            const extras = {};
            if (sections?.length) {
                await Promise.all(
                    sections.map(async (section) => {
                        switch (section.type) {
                            case "CENTRALCONTENT":
                                extras.centralContent = await fetchData(
                                    `${BASE_URL}/grade_subject/${section.id}/central_content`
                                );
                                break;
                            case "SUBJECTDESCRIPTION":
                                extras.subjectDescription = await fetchData(
                                    `${BASE_URL}/grade_subject/${section.id}/subject_description`
                                );
                                break;
                            case "GRADECRITERIA":
                                extras.gradeCriteria = await fetchData(
                                    `${BASE_URL}/grade_subject/grade_criteria/${section.id}/selected`
                                );
                                break;
                            case "RESULTREPORT":
                                const [columns, assessment] = await Promise.all([
                                    fetchData(`${BASE_URL}/assignment/${id}/assessment/grid/available-columns`),
                                    fetchData(`${BASE_URL}/assignment/${id}/assessment`),
                                ]);
                                extras.columns = columns;
                                extras.assessment = assessment;
                                break;
                        }
                    })
                );
            }

            result = { type, data: viewData, sections, teachers, ...extras };
        }

        // --- Invalid type ---
        else {
            return res.status(400).json({ success: false, message: "Invalid type parameter" });
        }

        return res.status(200).json({ success: true, ...result });
    } catch (error) {
        return handleApiError(res, error, "getAssignment");
    }
}



/**
 * Fetches assignments for a specific week and year.
 * @param {import('next').NextApiRequest} req
 * @param {import('next').NextApiResponse} res
 */
async function getWeekAssignment(req, res) {
    const { week, year } = req.query;
    const { cookies } = req.headers;
    if (!week || !year) return res.status(400).json({ success: false, message: 'Missing week and/or year parameters.' });
    if (req.method !== 'GET') return res.status(405).setHeader('Allow', ['GET']).json({ success: false, message: 'Method not allowed.' });
    if (!(await authUser(cookies))) return res.status(401).json({ success: false, message: 'Not authenticated.' });

    try {
        const url = `/rest-api/student/ps/assignments/start-page?week=${week}&year=${year}`;
        const response = await schoolsoftApi.get(url, { headers: { Cookie: cookies }, responseType: 'json' });
        return res.status(200).json({ success: true, data: response.data });
    } catch (error) {
        return handleApiError(res, error, 'getWeekAssignment');
    }
}

/**
 * Fetches news items from the SchoolSoft start page.
 * @param {import('next').NextApiRequest} req
 * @param {import('next').NextApiResponse} res
 */
async function fetchNews(req, res) {
    const { cookies } = req.headers;
    if (!cookies) return res.status(400).json({ success: false, message: "Missing cookies" });
    if (!(await authUser(cookies))) return res.status(401).json({ success: false, message: "Not authenticated" });

    try {
        const response = await schoolsoftApi.get("/jsp/student/right_student_startpage.jsp", { headers: { Cookie: cookies }, responseType: 'arraybuffer' });
        const html = decodeHtmlResponse(response.data);
        const $ = cheerio.load(html);
        const news = $("#news_con_content table tr").map((_, el) => {
            const a = $(el).find("a.toplist-item");
            if (!a.length) return null;
            const href = a.attr("href") || '';
            const match = href.match(/requestid=(\d+)/);
            return {
                id: match ? match[1] : null,
                title: a.find(".heading_bold").text().trim(),
                preview: a.find("div").last().text().trim() || null,
            };
        }).get();
        return res.status(200).json({ success: true, data: news });
    } catch (error) {
        return handleApiError(res, error, 'fetchNews');
    }
}

/**
 * Fetches the lunch menu for a specific week.
 * @param {import('next').NextApiRequest} req
 * @param {import('next').NextApiResponse} res
 */
async function getLunchMenu(req, res) {
    const { week } = req.query;
    const { cookies } = req.headers;
    if (req.method !== 'GET') return res.status(405).setHeader('Allow', ['GET']).json({ success: false, message: 'Method not allowed.' });
    if (!cookies) return res.status(400).json({ success: false, message: 'Missing cookies.' });
    if (!week) return res.status(400).json({ success: false, message: 'Missing week parameter.' });
    if (!(await authUser(cookies))) return res.status(401).json({ success: false, message: 'Not authenticated.' });

    try {
        const url = `/rest-api/lunchmenu/week/${week}`;
        const response = await schoolsoftApi.get(url, { headers: { Cookie: cookies }, responseType: 'json' });
        return res.status(200).json({ success: true, data: response.data });
    } catch (error) {
        return handleApiError(res, error, 'getLunchMenu');
    }
}

/**
 * Proxies a custom request to the Schoolsoft API.
 * @param {import('next').NextApiRequest} req
 * @param {import('next').NextApiResponse} res
 */
async function custom(req, res) {
    const { url: customURL } = req.headers;
    const { cookies } = req.headers;
    if (!customURL) return res.status(400).json({ success: false, message: 'No URL provided in headers.' });
    if (!(await authUser(cookies))) return res.status(401).json({ success: false, message: 'Not authenticated.' });

    try {
        const response = await schoolsoftApi({
            method: req.method,
            url: `/${customURL}`, // Prepend slash as baseURL is already set
            headers: { Cookie: cookies },
            data: req.body, // Pass along request body
            responseType: 'json' // Assume JSON for custom calls, adjust if needed
        });
        return res.status(response.status).json({ success: true, data: response.data });
    } catch (error) {
        return handleApiError(res, error, 'custom');
    }
}

// ================================================================================= //
//                            Firebase User Data Functions                           //
// ================================================================================= //

/**
 * A generic handler for managing user-specific data arrays in Firebase (e.g., notes, goals).
 * @param {import('next').NextApiRequest} req
 * @param {import('next').NextApiResponse} res
 * @param {'notes' | 'goals'} dataType - The key for the data array in the user's document.
 */
async function handleUserData(req, res, dataType) {
    let { username, cookies, item, time } = req.body;
    username = String(username).toLowerCase().trim();
    const keyName = dataType.slice(0, -1); // 'note' or 'goal'

    if (!username || !cookies) return res.status(400).json({ success: false, error: "Username and cookies are required." });
    if (!(await authUserWithUsername(cookies, username))) return res.status(401).json({ success: false, error: "Authentication failed." });

    try {
        const statsRef = db.collection('stats').doc('loginStats');
        const statsDoc = await statsRef.get();
        if (!statsDoc.exists) return res.status(500).json({ success: false, error: "Stats document not found." });

        const usersData = statsDoc.data();
        const userIndex = usersData.users.findIndex(u => u.username === username);
        if (userIndex === -1) return res.status(404).json({ success: false, error: "User not found." });

        const user = usersData.users[userIndex];
        user.data[dataType] = user.data[dataType] || [];

        // DELETE
        if (req.method === 'DELETE') {
            if (!item || !time) return res.status(400).json({ success: false, error: `${keyName} and time are required for deletion.` });
            const itemIndex = user.data[dataType].findIndex(i => i[keyName] === item && i.time === time);
            if (itemIndex === -1) return res.status(404).json({ success: false, error: `${keyName} not found.` });
            user.data[dataType].splice(itemIndex, 1);
            await statsRef.set(usersData);
            return res.status(200).json({ success: true, message: `${keyName} deleted successfully.` });
        }
        // POST
        if (req.method === 'POST') {
            if (!item || !time) return res.status(400).json({ success: false, error: `${keyName} and time are required for creation.` });
            if (user.data[dataType].length >= 10) return res.status(400).json({ success: false, error: `Maximum of 10 ${dataType} reached.` });
            user.data[dataType].push({ time, [keyName]: item });
            await statsRef.set(usersData);
            return res.status(201).json({ success: true, data: { time, [keyName]: item } });
        }
        return res.status(405).setHeader('Allow', ['POST', 'DELETE']).json({ success: false, error: `Method ${req.method} not allowed.` });
    } catch (error) {
        console.error(`[${dataType}Handle] Error:`, error);
        return res.status(500).json({ success: false, error: "Internal server error." });
    }
}

function noteHandle(req, res) {
    // Remap body for the generic handler
    req.body.item = req.body.notes || req.body.note;
    return handleUserData(req, res, 'notes');
}
function goalHandle(req, res) {
    req.body.item = req.body.goal;
    return handleUserData(req, res, 'goals');
}

/**
 * Fetches all notes or goals for a specific user from Firebase.
 * @param {import('next').NextApiRequest} req
 * @param {import('next').NextApiResponse} res
 * @param {'notes' | 'goals'} dataType - The key for the data array in the user's document.
 */
async function getUserData(req, res, dataType) {
    if (req.method !== 'POST') return res.status(405).setHeader('Allow', ['POST']).json({ success: false, error: `Method ${req.method} not allowed.` });

    let { username, cookies } = req.body;
    username = String(username).toLowerCase().trim();
    if (!username || !cookies) return res.status(400).json({ success: false, error: "Username and cookies are required." });

    try {
        if (!(await authUserWithUsername(cookies, username))) return res.status(401).json({ success: false, error: "Authentication failed." });

        const statsDoc = await db.collection('stats').doc('loginStats').get();
        if (!statsDoc.exists) return res.status(500).json({ success: false, error: 'Stats document does not exist' });

        const user = statsDoc.data().users.find(u => u.username === username);
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });

        return res.status(200).json({ success: true, data: user.data[dataType] || [] });
    } catch (error) {
        console.error(`[get${dataType.charAt(0).toUpperCase() + dataType.slice(1)}] Error:`, error);
        return res.status(500).json({ success: false, error: "Internal server error." });
    }
}

function getNotes(req, res) { return getUserData(req, res, 'notes'); }
function getGoals(req, res) { return getUserData(req, res, 'goals'); }




// =================================================================================
//                                    AI Function
// =================================================================================

/** @description In-memory store for rate limiting. Not for production use across multiple servers. */
const rateLimitMap = new Map();
const MAX_REQUESTS_PER_MINUTE = 8;
const MAX_MESSAGE_LENGTH = 1000;
const BLOCKED_WORDS = []; // Optional blacklist

/**
 * Handles requests to the Gemini AI model, including rate limiting,
 * content moderation, and function calling for tool integration.
 */
export async function askAI(req, res) {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // --- Rate Limiting ---
    const now = Date.now();
    const timestamps = rateLimitMap.get(ip) || [];
    const recentTimestamps = timestamps.filter(t => now - t < 60000);
    if (recentTimestamps.length >= MAX_REQUESTS_PER_MINUTE) {
        return res.status(429).json({ success: false, message: 'Too many requests. Please wait a moment.' });
    }
    rateLimitMap.set(ip, [...recentTimestamps, now]);

    // --- Input Validation ---
    const { message, history = [], username } = req.body; // Added username
    if (!message || typeof message !== 'string') {
        return res.status(400).json({ success: false, message: 'Missing or invalid message.' });
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
        return res.status(413).json({ success: false, message: `Message too long. Keep under ${MAX_MESSAGE_LENGTH} characters.` });
    }

    // --- Content Moderation ---
    const lowerMessage = message.toLowerCase();
    if (BLOCKED_WORDS.some(word => lowerMessage.includes(word))) {
        return res.status(400).json({ success: false, message: 'Inappropriate content detected.' });
    }

    const cookies = req.headers.cookies;
    if (!cookies) {
        return res.status(400).json({ success: false, message: 'Missing cookies' });
    }
    if (!(await authUser(cookies))) {
        return res.status(401).json({ success: false, message: "Not authenticated" });
    }



    try {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY is not set.");
        }

        const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);

        // --- Define Tools for Gemini ---
        const tools = [{
            functionDeclarations: [
                {
                    name: 'getUpcomingAssignments',
                    description: "Fetch the student's upcoming assignments for a specific week and year.",
                    parameters: { type: 'OBJECT', properties: { week: { type: 'STRING', description: "The week number, e.g., '44'" }, year: { type: 'STRING', description: "The year, e.g., '2025'" } }, required: ['week', 'year'] }
                },
                {
                    name: 'getLunchMenu',
                    description: "Fetch the school's lunch menu for a specific week.",
                    parameters: { type: 'OBJECT', properties: { week: { type: 'STRING', description: "The week number, e.g., '44'" } }, required: ['week'] }
                },
                {
                    name: 'getNews',
                    description: "Fetch the latest news articles from the school's start page.",
                    parameters: { type: 'OBJECT', properties: {} }
                },
                {
                    name: 'getNotes',
                    description: "Fetches the user's personal notes. Requires the user's username.",
                    parameters: { type: 'OBJECT', properties: { username: { type: 'STRING', description: 'The username of the user.' } }, required: ['username'] }
                },
                {
                    name: 'getGoals',
                    description: "Fetches the user's personal goals. Requires the user's username.",
                    parameters: { type: 'OBJECT', properties: { username: { type: 'STRING', description: 'The username of the user.' } }, required: ['username'] }
                }
            ]
        }];

        // --- Prepare Model Request ---
        const systemInstruction = "You're Schoolsoft+ AI, a smart assistant, developed by Elias. Be helpful, concise, friendly like a classmate. Use emojis sparingly. Refer to the user as their first name. For formal writing, be professional. Today's date is " + new Date().toLocaleDateString('sv-SE') + "." + " User's username is '" + username + "'.";

        // prepare messages for Gemini
        const contents = [
            {
                role: 'user',
                parts: [{ text: message }]
            },
            ...history.filter(h => h.parts?.[0]?.text).map(h => ({
                role: h.role,
                parts: [{ text: h.parts[0].text }]
            }))
        ];

        const config = { tools, systemInstruction };

        const model = "gemini-3.1-flash-lite-preview";

        // --- First Call to the Model ---
        const result = await genAI.models.generateContent({
            model,
            contents,
            config
        });


        const candidate = result.candidates?.[0];
        let finalText = candidate?.content?.parts?.[0]?.text || "Sorry, I didn't get a response.";


        // --- Check for and Handle Function Calls ---
        const parts = result.candidates?.[0]?.content?.parts || [];
        const functionCalls = parts
            .filter(p => p.functionCall)
            .map(p => p.functionCall);


        if (functionCalls && functionCalls.length > 0) {
            // --- Second Call to the Model with Tool Result ---
            const modelResponseContent = result.candidates?.[0]?.content;
            if (!modelResponseContent) throw new Error("Model response content missing.");

            // Extract all function call parts
            const functionCallParts = modelResponseContent.parts.filter(p => p.functionCall);

            // Execute all function calls in sequence and collect their results
            const toolParts = [];
            for (const fc of functionCallParts) {
                const { name, args } = fc.functionCall;
                let toolResultContent;

                try {
                    if (name === 'getUpcomingAssignments') {
                        const assignmentsRes = await schoolsoftApi.get(`/rest-api/student/ps/assignments/start-page?week=${args.week}&year=${args.year}`, { headers: { 'Cookie': cookies }, responseType: 'json' });
                        toolResultContent = assignmentsRes.data;
                    } else if (name === 'getLunchMenu') {
                        const menuRes = await schoolsoftApi.get(`/rest-api/lunchmenu/week/${args.week}`, { headers: { 'Cookie': cookies }, responseType: 'json' });
                        toolResultContent = menuRes.data;
                    } else if (name === 'getNews') {
                        const newsResponse = await schoolsoftApi.get("/jsp/student/right_student_startpage.jsp", { headers: { 'Cookie': cookies }, responseType: 'arraybuffer' });
                        const html = decodeHtmlResponse(newsResponse.data);
                        const $ = cheerio.load(html);
                        toolResultContent = $("#news_con_content table tr").map((_, el) => {
                            const a = $(el).find("a.toplist-item");
                            return a.length ? { title: a.find(".heading_bold").text().trim(), preview: a.find("div").last().text().trim() || null } : null;
                        }).get();
                    } else if (name === 'getNotes') {
                        toolResultContent = await fetchUserData(args.username, 'notes');
                    } else if (name === 'getGoals') {
                        toolResultContent = await fetchUserData(args.username, 'goals');
                    }
                } catch (e) {
                    console.error(`[askAI Tool Error] Error in '${name}':`, e.message);
                    toolResultContent = { error: `Failed to execute tool '${name}'. Reason: ${e.message}` };
                }

                // Add a functionResponse part for this specific function call
                toolParts.push({
                    functionResponse: {
                        name,
                        response: { content: toolResultContent }
                    }
                });
            }

            // Now toolParts.length === functionCallParts.length, Gemini happy
            const result2 = await genAI.models.generateContent({
                model,
                contents: [
                    ...contents,
                    modelResponseContent,  // original function call content
                    {
                        role: 'tool',
                        parts: toolParts
                    }
                ],
                config: { tools, systemInstruction },
            });

            const candidate2 = result2.candidates?.[0];
            finalText = candidate2?.content?.parts?.[0]?.text || "Sorry, I didn't get a response.";


        }

        return res.status(200).json({ success: true, data: finalText });

    } catch (err) {
        console.error('[askAI] Error:', err.response?.data || err.message);
        return res.status(500).json({ success: false, message: 'AI request failed', error: err.response?.data || err.message });
    }
}