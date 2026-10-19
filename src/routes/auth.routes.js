import { Router } from "express";
import * as controller from "../controllers/auth.controller.js";
import { validate } from "../middlewares/validate.js";
import { registerBody, loginBody } from "../schemas/auth.schema.js";

const router = Router();

router.post("/register", validate({ body: registerBody }), controller.register);
router.post("/login", validate({ body: loginBody }), controller.login);

export default router;
