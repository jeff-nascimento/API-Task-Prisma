import * as authService from "../services/auth.service.js";

// POST /auth/register
//somente um teste para saber se register vai funcionar
export async function register(req, res) {
  const user = await authService.register(req.validated.body);
  res.status(201).json({ data: user });
}
