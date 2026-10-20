// Where each role lands after logging in
export const homeFor = (user) => (user?.role === "admin" ? "/" : "/checkout");