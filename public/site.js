const allowedEvents = new Set(['catalogue_view', 'directions_click', 'phone_tap', 'whatsapp_request_click']);
function track(type) {
  if (allowedEvents.has(type)) window.dispatchEvent(new CustomEvent('letebele:aggregate-event', { detail: { type } }));
}
if (location.pathname === '/catalogue/' || /^\/catalogue\/[^/]+\/$/.test(location.pathname)) track('catalogue_view');
document.addEventListener('click', event => {
  const link = event.target.closest('[data-event]');
  if (link) track(link.dataset.event);
});

const search = document.querySelector('#catalogue-search');
const filter = document.querySelector('#category-filter');
const cards = [...document.querySelectorAll('[data-product-card]')];
function filterProducts() {
  const query = search.value.trim().toLocaleLowerCase();
  const category = filter.value;
  let visible = 0;
  cards.forEach(card => {
    const match = card.dataset.search.includes(query) && (!category || card.dataset.category === category);
    card.hidden = !match;
    if (match) visible++;
  });
  document.querySelector('#results-count').textContent = `${visible} product${visible === 1 ? '' : 's'} shown`;
  document.querySelector('#no-results').hidden = visible !== 0;
}
if (search && filter) {
  search.addEventListener('input', filterProducts);
  filter.addEventListener('change', filterProducts);
  filterProducts();
}

const requestForm = document.querySelector('[data-whatsapp-form]');
if (requestForm) requestForm.addEventListener('submit', event => {
  event.preventDefault();
  if (!requestForm.reportValidity()) return;
  const number = requestForm.dataset.number;
  if (!/^[1-9]\d{7,14}$/.test(number)) return;
  const product = requestForm.dataset.product;
  const branch = requestForm.elements.branch.value;
  const quantity = Number(requestForm.elements.quantity.value);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) return;
  const message = `Hello Letebele Pharmacy. I would like to request ${product} (quantity: ${quantity}) for collection at ${branch}. Please confirm current price and availability before I travel.`;
  track('whatsapp_request_click');
  window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
});

const status = document.querySelector('[data-share-status]');
document.querySelector('[data-copy-link]')?.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(location.href); status.textContent = 'Link copied.'; }
  catch { status.textContent = 'Copy this page address from your browser.'; }
});
document.querySelector('[data-share]')?.addEventListener('click', async () => {
  if (navigator.share) {
    try { await navigator.share({ title: document.title, url: location.href }); }
    catch { /* A cancelled share needs no message. */ }
  } else {
    try { await navigator.clipboard.writeText(location.href); status.textContent = 'Link copied.'; }
    catch { status.textContent = 'Copy this page address from your browser.'; }
  }
});
