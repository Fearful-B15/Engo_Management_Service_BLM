import express from "express";
import fs from "fs";
import path from "path";
import csv from "csv-parser";
import bodyParser from "body-parser";
import cors from "cors";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3000;

// Fix __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// CSV FILES (absolute paths for Render safety)
const adminFile = path.join(__dirname, "Admin.csv");
const reportsFile = path.join(__dirname, "reports.csv");

// =======================
// CSV READ HELPER
// =======================
function readCSV(filePath) {
    return new Promise((resolve) => {
        const results = [];

        if (!fs.existsSync(filePath)) {
            return resolve([]);
        }

        fs.createReadStream(filePath)
            .pipe(csv())
            .on("data", (data) => results.push(data))
            .on("end", () => resolve(results))
            .on("error", () => resolve([]));
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
            (a.employee_id || a.Employee_ID || "").trim() === employee_id?.trim() &&
            (a.password || a.Password || "").trim() === password?.trim()
    );

    res.json({ success: !!found });
});

// =======================
// GET REPORTS
// =======================
app.get("/reports", async (req, res) => {
    const reports = await readCSV(reportsFile);

    // Normalize keys (fixes undefined issue)
    const normalized = reports.map((r) => ({
        id: r.id || r.ID,
        date: r.date || r.Date,
        house: r.house || r.House,
        room: r.room || r.Room,
        urgency: r.urgency || r.Urgency,
        problem: r.problem || r.Problem,
        description: r.description || r.Description,
        status: r.status || r.Status || "Not Started",
    }));

    res.json(normalized);
});

// =======================
// ADD REPORT
// =======================
app.post("/addReport", (req, res) => {
    const { id, date, house, room, urgency, problem, description } = req.body;

    const status = "Not Started";

    // Add header if file does not exist
    if (!fs.existsSync(reportsFile)) {
        const header = "id,date,house,room,urgency,problem,description,status\n";
        fs.writeFileSync(reportsFile, header);
    }

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
        const currentId = r.id || r.ID;
        if (currentId === id) {
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
// WRITE CSV HELPER
// =======================
function writeReportsToCSV(data, res) {
    const header = "id,date,house,room,urgency,problem,description,status\n";

    const rows = data
        .map(
            (r) =>
                `"${r.id || r.ID}","${r.date || r.Date}","${r.house || r.House}","${r.room || r.Room}","${r.urgency || r.Urgency}","${r.problem || r.Problem}","${r.description || r.Description}","${r.status || r.Status || "Not Started"}"`
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
    console.log(`Server running on port ${PORT}`);
});
