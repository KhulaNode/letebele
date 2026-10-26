import { validate, approvedProducts, isPublic, siteUrl, whatsappNumber } from './model.mjs';
const errors = validate();
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Catalogue valid: ${approvedProducts.length} public products. HTTPS origin: ${isPublic ? siteUrl : 'not set'}. WhatsApp: ${whatsappNumber ? 'configured' : 'disabled'}.`);
