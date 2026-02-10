/** Demo: Repeated validation logic — extract shared validator */
function validateUser(u: { name?: string; email?: string }) {
  if (!u.name || u.name.length < 2) throw new Error('Invalid name');
  if (!u.email || !u.email.includes('@')) throw new Error('Invalid email');
  return u;
}
function validateOrder(o: { id?: string; total?: number }) {
  if (!o.id || o.id.length < 5) throw new Error('Invalid id');
  if (o.total == null || o.total < 0) throw new Error('Invalid total');
  return o;
}
function validateProduct(p: { sku?: string; price?: number }) {
  if (!p.sku || p.sku.length < 3) throw new Error('Invalid sku');
  if (p.price == null || p.price < 0) throw new Error('Invalid price');
  return p;
}
export { validateUser, validateOrder, validateProduct };
