import express from "express";
import { listLessons, getPerformanceHistory, getPerformanceSummary } from "../../lessons.js";
import { listPendingLessons, promotePendingLesson, dismissPendingLesson } from "../../sim-review.js";

const router = express.Router();

router.get("/", (req, res) => {
  const { role = null, tag = null, limit } = req.query;
  res.json(listLessons({ role, tag, limit: Number(limit) || 30 }));
});

router.get("/performance", (req, res) => {
  const hours = Number(req.query.hours) || 24;
  res.json({
    history: getPerformanceHistory({ hours }),
    summary: getPerformanceSummary(),
  });
});

// AI-reviewed simulated-lesson promotion queue (see sim-review.js)
router.get("/pending", (req, res) => {
  res.json({ pending: listPendingLessons() });
});

router.post("/pending/:id/promote", (req, res) => {
  try {
    res.json(promotePendingLesson(req.params.id));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/pending/:id/dismiss", (req, res) => {
  try {
    res.json(dismissPendingLesson(req.params.id));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
