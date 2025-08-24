const express = require("express");
const Task = require("../models/Tasks");
const router = express.Router();
const axios = require("axios");
const csv = require("csvtojson");

// GET all tasks
router.get("/", async (req, res) => {
  try {
    const tasks = await Task.find();
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new task
router.post("/", async (req, res) => {
  try {
    const { title, description, dueDate } = req.body;
    const newTask = new Task({ title, description, dueDate });
    await newTask.save();
    res.json(newTask);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update task
router.put("/:id", async (req, res) => {
  try {
    const updatedTask = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedTask);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE task
router.delete("/:id", async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: "Task deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/import", async (req, res) => {
  try {
    const { sheetUrl } = req.body;

    // Validate Google Sheets link
    if (!sheetUrl || !sheetUrl.includes("docs.google.com/spreadsheets")) {
      return res.status(400).json({ error: "Invalid Google Sheets URL" });
    }

    // Convert to CSV export URL if not already
    const csvUrl = sheetUrl.includes("export?format=csv") 
      ? sheetUrl 
      : sheetUrl.replace("/edit?usp=sharing", "/export?format=csv");

    // Fetch CSV and convert to JSON
    const tasks = await csv().fromStream(
      (await axios.get(csvUrl, { responseType: 'stream' })).data
    );

    // Loop through tasks and save in DB
    for (let taskData of tasks) {
      // Skip rows without a title
      if (!taskData.title) continue;

      const exists = await Task.findOne({ title: taskData.title });
      if (!exists) {
        await Task.create({
          title: taskData.title,
          description: taskData.description || "",
          dueDate: taskData.dueDate || null,
          completed: String(taskData.completed).toLowerCase() === "true"
        });
      }
    }

    res.json({ message: "Tasks imported successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to import tasks" });
  }
});




module.exports = router;
