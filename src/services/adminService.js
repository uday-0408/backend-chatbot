export function validateAdmin(username, password) {
  return (
    username === process.env.ADMIN_USER &&
    password === process.env.ADMIN_PASS
  );
}
