// The admin dashboard is restricted to ONE account, and every login code is
// emailed to that same inbox. Override with ADMIN_EMAIL on the server if needed.
export const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "visionfit360@gmail.com").trim().toLowerCase();

export const isAllowedAdmin = (admin) =>
  !!admin && String(admin.email || "").trim().toLowerCase() === ADMIN_EMAIL;
