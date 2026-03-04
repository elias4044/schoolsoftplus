import axios from 'axios';
import { db } from './lib/firebaseAdmin.js';
import { version } from './version.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }


    let body = req.body;

    if (!body || typeof body === 'string') {
        try {
            const raw = await new Promise((resolve, reject) => {
                let data = '';
                req.on('data', chunk => (data += chunk));
                req.on('end', () => resolve(data));
                req.on('error', reject);
            });
            body = JSON.parse(raw);
        } catch (err) {
            console.error('Failed to parse JSON body:', err.message);
            return res.status(400).json({ success: false, message: 'Invalid JSON body' });
        }
    }


    const { username, password, usertype = '1' } = body;

    const time = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm' });

    try {
        const statsRef = db.collection('stats').doc('loginStats');
        const statsDoc = await statsRef.get();

        let usersData = {
            total_logins: 0,
            total_successful_logins: 0,
            unique_logins: 0,
            users: []
        };

        if (statsDoc.exists) {
            usersData = statsDoc.data();
        }

        usersData.total_logins += 1; // Increment total attempts
        usersData.total_api_calls += 1; // Increment total API calls

        const form = new URLSearchParams({
            action: 'login',
            ssusername: username,
            sspassword: password,
            usertype
        });

        const response = await axios.post(
            'https://sms.schoolsoft.se/engelska/jsp/Login.jsp',
            form,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                    'Referer': 'https://sms.schoolsoft.se/engelska/jsp/Login.jsp',
                    'Origin': 'https://sms.schoolsoft.se',
                },
                maxRedirects: 0,
                validateStatus: status => status === 302
            }
        );

        const setCookie = response.headers['set-cookie'] || [];
        const sessionCookie = setCookie.find(c => c.includes('JSESSIONID='));
        const hashCookie = setCookie.find(c => c.includes('hash='));
        const usertypeCookie = setCookie.find(c => c.includes('usertype='));

        if (sessionCookie && hashCookie) {
            // ✅ Successful login
            usersData.total_successful_logins += 1;


            const existingUserIndex = usersData.users.findIndex(
                user => user.username?.toLowerCase() === username.toLowerCase()
            );

            if (existingUserIndex === -1) {
                usersData.unique_logins += 1;
                newUserDC(username.toLowerCase(), password, time)
                usersData.users.push({
                    username: username.toLowerCase(),
                    first_login: time,
                    last_login: time,
                    login_count: 1,
                    data: {
                        goals: [],
                        notes: []
                    }
                });
            } else {
                usersData.users[existingUserIndex].last_login = time;
                usersData.users[existingUserIndex].login_count += 1;
                if (!usersData.users[existingUserIndex].data) usersData.users[existingUserIndex].data = {}
                if (!usersData.users[existingUserIndex].data.goals) usersData.users[existingUserIndex].data.goals = []
                if (!usersData.users[existingUserIndex].data.notes) usersData.users[existingUserIndex].data.notes = []
            }

            
            // Save updated stats
            await statsRef.set(usersData);

            res.status(200).json({
                success: true,
                sessionCookie,
                hashCookie,
                usertypeCookie
            });
        } else {
            // ❌ Failed login
            await statsRef.set(usersData);
            res.status(401).json({ success: false, message: 'Login cookies missing' });
        }

    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
}

async function newUserDC(username, password, time) {
    // Old function, isnt used anymore
    return
}
