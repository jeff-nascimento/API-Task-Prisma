import { Router } from "express";
import * as controller from "../controllers/auth.controller.js";
import { validate } from "../middlewares/validate.js";
import { registerBody } from "../schemas/auth.schema.js";

const router = Router();

router.post("/register", validate({ body: registerBody }), controller.register);

export default router;
