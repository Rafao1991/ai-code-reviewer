/** Demo: Sequential DB queries — batch or parallelize */
export async function getUserWithOrders(userId: string) {
  const user = await fetchFromDb('users', userId);
  const orders = await fetchFromDb('orders', { userId });
  const addresses = await fetchFromDb('addresses', { userId });
  return { ...user, orders, addresses };
}
function fetchFromDb(_table: string, _filter: unknown) {
  return Promise.resolve({});
}
