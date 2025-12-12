import { validateAdmin } from "../services/adminService.js";

export function login(req, res) {
  const { username, password } = req.body;

  if (!validateAdmin(username, password)) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  res.json({ message: "Login successful" });
}
