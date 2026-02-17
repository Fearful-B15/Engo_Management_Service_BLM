import express from "express";
import fs from "fs";
import csv from "csv-parser";
import bodyParser from "body-parser";
import cors from "cors";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

// CSV FILES
const adminFile = "Admin.csv";
const reportsFile = "reports.csv";

// =======================
// CSV READ HELPER
// =======================
function readCSV(filePath) {
    return new Promise((resolve, reject) => {
        const results = [];

        if (!fs.existsSync(filePath)) {
            return resolve([]);
        }

        fs.createReadStream(filePath)
            .pipe(csv())
            .on("data", (data) => results.push(data))
            .on("end", () => resolve(results))
            .on("error", (err) => reject(err));
    });
}

// =======================
// LOGIN
// =======================
app.post("/login", async (req, res) => {
    const { employee_id, password } = req.body;

    const admins = await readCSV(adminFile);

    const found = admins.find(
        (a) =>
            a.employee_id?.trim() === employee_id?.trim() &&
            a.password?.trim() === password?.trim()
    );

    res.json({ success: !!found });
});

// =======================
// GET REPORTS
// =======================
app.get("/reports", async (req, res) => {
    try {
        const reports = await readCSV(reportsFile);

        const normalized = reports.map((r) => ({
            id: r.id,
            date: r.date,
            house: r.house,
            room: r.room,
            urgency: r.urgency,
            problem: r.problem,
            description: r.description,
            status: r.status || "Not Started",
        }));

        res.json(normalized);
    } catch (err) {
        res.status(500).json({ error: "Failed to read reports" });
    }
});

// =======================
// ADD REPORT
// =======================
app.post("/addReport", (req, res) => {
    const { id, date, house, room, urgency, problem, description } = req.body;

    const status = "Not Started";

    // Wrap fields in quotes to prevent CSV breaking from commas
    const line = `"${id}","${date}","${house}","${room}","${urgency}","${problem}","${description}","${status}"\n`;

    fs.appendFile(reportsFile, line, (err) => {
        if (err) return res.json({ success: false });
        res.json({ success: true });
    });
});

// =======================
// UPDATE STATUS
// =======================
app.post("/updateStatus", async (req, res) => {
    const { id, status } = req.body;

    const reports = await readCSV(reportsFile);
    let found = false;

    const updated = reports.map((r) => {
        if (r.id === id) {
            found = true;
            return { ...r, status };
        }
        return r;
    });

    if (!found) {
        return res.status(404).json({ success: false, message: "Not found" });
    }

    writeReportsToCSV(updated, res);
});

// =======================
// DELETE REPORT 
// =======================
app.post("/deleteReport", async (req, res) => {
    const { id } = req.body;

    const reports = await readCSV(reportsFile);

    const filtered = reports.filter((r) => r.id !== id);

    if (filtered.length === reports.length) {
        return res.status(404).json({ success: false, message: "Report not found" });
    }

    writeReportsToCSV(filtered, res);
});

// =======================
// HELPER: WRITE CSV
// =======================
function writeReportsToCSV(data, res) {
    const header = "id,date,house,room,urgency,problem,description,status\n";

    const rows = data
        .map(
            (r) =>
                `"${r.id}","${r.date}","${r.house}","${r.room}","${r.urgency}","${r.problem}","${r.description}","${r.status}"`
        )
        .join("\n");

    fs.writeFile(reportsFile, header + rows + "\n", (err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
}

// =======================
// START SERVER
// =======================
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
