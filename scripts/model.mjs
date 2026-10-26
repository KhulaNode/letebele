import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
export const site = JSON.parse(fs.readFileSync(path.join(root, 'data/site.json'), 'utf8'));
export const products = JSON.parse(fs.readFileSync(path.join(root, 'data/products.json'), 'utf8'));
export const publicDir = path.join(root, 'public');
export const distDir = path.join(root, 'dist');
export const siteUrl = (process.env.SITE_URL || site.siteUrl || '').replace(/\/$/, '');
export const whatsappNumber = process.env.WHATSAPP_NUMBER || site.whatsappNumber || '';
export const isPublic = /^https:\/\/[^/]+$/i.test(siteUrl);
export const approvedProducts = (Array.isArray(products) ? products : []).filter(p => p.visible === true && p.ownerApproved === true && p.pharmacistApproved === true && p.pharmacistReviewRequired === false);

export function validate() {
  const errors = [];
  if (!Array.isArray(products)) errors.push('data/products.json must be an array');
  if (siteUrl && !isPublic) errors.push('SITE_URL must be a single HTTPS origin without a path');
  if (whatsappNumber && !/^[1-9]\d{7,14}$/.test(whatsappNumber)) errors.push('WHATSAPP_NUMBER must be international digits only');
  if (!Array.isArray(site.branches) || site.branches.length !== 2) errors.push('Expected exactly two branches');
  for (const branch of Array.isArray(site.branches) ? site.branches : []) {
    if (branch.hours != null && (typeof branch.hours !== 'string' || !branch.hours.trim())) errors.push(`${branch.slug}: hours must be a verified display string or null`);
  }
  const slugs = new Set();
  for (const p of Array.isArray(products) ? products : []) {
    const tag = p.slug || '(missing slug)';
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tag)) errors.push(`${tag}: invalid slug`);
    if (slugs.has(tag)) errors.push(`${tag}: duplicate slug`);
    slugs.add(tag);
    if (p.visible) {
      if (!p.ownerApproved || !p.pharmacistApproved || p.pharmacistReviewRequired) errors.push(`${tag}: visible item needs owner and pharmacist approval and completed review`);
      for (const field of ['name', 'category', 'description']) if (!p[field] || typeof p[field] !== 'string') errors.push(`${tag}: missing ${field}`);
      if (p.image && (!p.image.startsWith('/images/') || !fs.existsSync(path.join(publicDir, p.image.slice(1))))) errors.push(`${tag}: image must be a local file in public/images`);
      if (p.image && !p.imageAlt) errors.push(`${tag}: imageAlt required`);
      if (p.priceZar != null && (!Number.isFinite(p.priceZar) || p.priceZar < 0 || !/^\d{4}-\d{2}-\d{2}$/.test(p.priceUpdatedAt || ''))) errors.push(`${tag}: price requires a valid amount and update date`);
    }
  }
  return errors;
}
