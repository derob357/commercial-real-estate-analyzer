import express from "express";
const app = express();
app.get("/health", (req, res) => res.json({status: "ok"}));
app.listen(3001, () => console.log("Server running on port 3001"));
