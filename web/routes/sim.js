import express from "express";
import { listSimPositions } from "../../sim-state.js";
import { runSimReviewPass } from "../../sim-review.js";

const router = express.Router();

router.get("/positions", (req, res) => {
  res.json({ positions: listSimPositions({ openOnly: req.query.all !== "true" ? true : false }) });
});

// On-demand trigger for the AI review pass (also runs on its own daily schedule — see index.js).
router.post("/review", async (req, res) => {
  try {
    res.json(await runSimReviewPass());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
