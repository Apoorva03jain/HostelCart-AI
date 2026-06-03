console.log("LOADED UPDATED FILE");

const express = require("express");

const app = express();

const PORT = 5000;

app.get("/", (req, res) => {
    res.send("HostelCart AI Backend Running 🚀");
});

app.get("/about", (req, res) => {
    res.send("About Route Working");
});

app.get("/health", (req, res) => {
    res.send("Health Route Working");
});

app.get("/orders", (req, res) => {
    const orders = [
        {
            id: 1,
            hostel: "Brahmaputra",
            currentAmount: 150,
            targetAmount: 299
        },
        {
            id: 2,
            hostel: "Subarnarekha",
            currentAmount: 220,
            targetAmount: 299
        }
    ];

    res.json(orders);
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});