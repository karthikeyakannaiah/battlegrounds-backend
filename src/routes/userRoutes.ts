import { Router } from "express";


const router = Router();

router.get("/current", (req, res) => {
    const userData = req.user?.playerData;
    res.status(200).json(userData);
})

export default router;