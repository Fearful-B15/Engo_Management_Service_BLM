import express from "express";
import fs from "fs";
import path from "path";
import csv from "csv-parser";
import bodyParser from "body-parser";
import cors from "cors";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public")); // serves HTML files inside /public

// CSV FILES
const adminFile = "Admin.csv";      // <<== FIXED
const reportsFile = "reports.csv";

// READ CSV HELPER
function readCSV(filePath) {
    return new Promise((resolve) => {
        const results = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on("data", (data) => results.push(data))
            .on("end", () => resolve(results));
    });
}

// LOGIN ENDPOINT
app.post("/login", async (req, res) => {
    const { employee_id, password } = req.body;

    const admins = await readCSV(adminFile);

    console.log("Loaded admins:", admins);
    console.log("Attempt login:", employee_id, password);

    const found = admins.find(
        (e) =>
            e.employee_id.trim() === employee_id.trim() &&
            e.password.trim() === password.trim()
    );

    if (found) {
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

// GET ALL REPORTS
app.get("/reports", async (req, res) => {
    const reports = await readCSV(reportsFile);
    res.json(reports);
});

// ADD NEW REPORT
app.post("/addReport", (req, res) => {
    const { id, date, house, room, urgency, problem, description } = req.body;

    const line = `${id},${date},${house},${room},${urgency},${problem},${description}\n`;

    fs.appendFile(reportsFile, line, (err) => {
        if (err) return res.json({ success: false });

        res.json({ success: true });
    });
});

// DELETE REPORT
app.post("/deleteReport", async (req, res) => {
    const { id } = req.body;

    const reports = await readCSV(reportsFile);

    const filtered = reports.filter((r) => r.id !== id);

    // Rewrite CSV
    const header = "id,date,house,room,urgency,problem,description\n";
    const rows = filtered
        .map(
            (r) =>
                `${r.id},${r.date},${r.house},${r.room},${r.urgency},${r.problem},${r.description}`
        )
        .join("\n");

    fs.writeFile(reportsFile, header + rows + "\n", (err) => {
        if (err) return res.json({ success: false });
        res.json({ success: true });
    });
});

// RUN SERVER
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
