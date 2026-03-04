import { db } from "./lib/firebaseAdmin.js";

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).send("Method Not Allowed");
    }

    const statsDoc = await db.collection('stats').doc('loginStats').get();
    if (!statsDoc.exists) {
        return res.status(500).send('Stats document does not exist');
    }

    const totalLogins = statsDoc.data().total_successful_logins;
    const uniqueLogins = statsDoc.data().unique_logins;
    const totalApiCalls = statsDoc.data().total_api_calls;



    res.status(200).send({
        totalLogins,
        uniqueLogins,
        totalApiCalls
    });
}