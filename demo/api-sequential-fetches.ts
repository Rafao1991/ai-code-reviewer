/** Demo: API client with sequential fetches — consider Promise.all */
export async function loadDashboard(userId: string) {
  const user = await fetch(`/api/users/${userId}`).then((r) => r.json());
  const orders = await fetch(`/api/orders?userId=${userId}`).then((r) => r.json());
  const notifications = await fetch(`/api/notifications/${userId}`).then((r) => r.json());
  return { user, orders, notifications };
}
