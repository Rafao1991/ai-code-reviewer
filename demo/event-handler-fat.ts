/** Demo: Fat event handler — split into smaller handlers */
export function handleSubmit(e: Event) {
  e.preventDefault();
  const form = e.target as HTMLFormElement;
  const name = (form.elements.namedItem('name') as HTMLInputElement).value;
  const email = (form.elements.namedItem('email') as HTMLInputElement).value;
  if (!name.trim()) {
    form.reportValidity();
    return;
  }
  if (!email.includes('@')) {
    form.reportValidity();
    return;
  }
  fetch('/api/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email }),
  })
    .then((r) => r.json())
    .then((data) => {
      if (data.ok) window.location.href = '/success';
      else alert(data.error);
    })
    .catch((err) => alert(err.message));
}
