import * as authService from "../services/auth.service.js";

// POST /auth/register
//somente um teste para saber se register vai funcionar
export async function register(req, res) {
  const user = await authService.register(req.validated.body);
  res.status(201).json({ data: user });
}

// POST /auth/login
export async function login(req, res) {
  const { user, accessToken, refreshToken } = await authService.login(
    req.validated.body,
  );
  setRefreshCookie(res, refreshToken); // refresh token vai no cookie HTTPOnly...
  res.json({ data: { user, accessToken } }); // ...e o access token no corpo
}
