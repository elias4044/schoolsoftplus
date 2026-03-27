const version = "Preview 0.3.8";

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).send("Method Not Allowed");
    }

    res.status(200).send(version);
}

export { version }; // Export the version variable as a named export