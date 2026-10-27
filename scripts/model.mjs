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
export const demoProducts = isPublic ? [] : (Array.isArray(products) ? products : []).filter(p => p.demo === true);
export const catalogueProducts = [...approvedProducts, ...demoProducts];

export function validate() {
  const errors = [];
  if (!Array.isArray(products)) errors.push('data/products.json must be an array');
  if (siteUrl && !isPublic) errors.push('SITE_URL must be a single HTTPS origin without a path');
  if (whatsappNumber && !/^[1-9]\d{7,14}$/.test(whatsappNumber)) errors.push('WHATSAPP_NUMBER must be international digits only');
  if (!Array.isArray(site.branches) || site.branches.length !== 2) errors.push('Expected exactly two branches');
  if (site.publicHolidayHours != null && site.publicHolidayHours !== 'same-as-sunday') errors.push('publicHolidayHours must be same-as-sunday or null');
  for (const branch of Array.isArray(site.branches) ? site.branches : []) {
    if (branch.hours != null) {
      if (!Array.isArray(branch.hours) || branch.hours.length === 0) errors.push(`${branch.slug}: hours must be a nonempty schedule or null`);
      else {
        const seenDays = new Set();
        for (const row of branch.hours) {
          if (!row || typeof row !== 'object') { errors.push(`${branch.slug}: invalid hours row`); continue; }
          if (!Array.isArray(row.days) || row.days.length === 0) errors.push(`${branch.slug}: each hours row needs days`);
          for (const day of Array.isArray(row.days) ? row.days : []) {
            if (!['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].includes(day) || seenDays.has(day)) errors.push(`${branch.slug}: invalid or repeated hours day ${day}`);
            seenDays.add(day);
          }
          if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(row.opens || '') || !/^([01]\d|2[0-3]):[0-5]\d$/.test(row.closes || '') || row.opens >= row.closes) errors.push(`${branch.slug}: invalid opening time range`);
        }
      }
    }
    if (site.publicHolidayHours === 'same-as-sunday' && !(Array.isArray(branch.hours) && branch.hours.some(row => row?.days?.includes('Sunday')))) errors.push(`${branch.slug}: Sunday hours required for public holidays`);
    if (branch.mapUrl && !/^https:\/\/(?:www\.google\.com\/maps\/|maps\.app\.goo\.gl\/)/.test(branch.mapUrl)) errors.push(`${branch.slug}: mapUrl must be a Google Maps HTTPS link`);
  }
  const slugs = new Set();
  for (const p of Array.isArray(products) ? products : []) {
    const tag = p.slug || '(missing slug)';
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tag)) errors.push(`${tag}: invalid slug`);
    if (slugs.has(tag)) errors.push(`${tag}: duplicate slug`);
    slugs.add(tag);
    if (p.demo === true && (p.visible || p.ownerApproved || p.pharmacistApproved || p.priceZar != null)) errors.push(`${tag}: demo item must remain unpublished, unapproved and unpriced`);
    if (p.visible) {
      if (!p.ownerApproved || !p.pharmacistApproved || p.pharmacistReviewRequired) errors.push(`${tag}: visible item needs owner and pharmacist approval and completed review`);
      for (const field of ['name', 'category', 'description']) if (!p[field] || typeof p[field] !== 'string') errors.push(`${tag}: missing ${field}`);
      if (p.priceZar == null) errors.push(`${tag}: visible item needs a listed price`);
      if (p.image && (!/^\/(?:images|products)\/[^/].*/.test(p.image) || p.image.split('/').includes('..') || !fs.existsSync(path.join(publicDir, p.image.slice(1))))) errors.push(`${tag}: image must be a local file in public/images or public/products`);
      if (p.image && !p.imageAlt) errors.push(`${tag}: imageAlt required`);
      if (p.priceZar != null && (!Number.isFinite(p.priceZar) || p.priceZar < 0 || !/^\d{4}-\d{2}-\d{2}$/.test(p.priceUpdatedAt || ''))) errors.push(`${tag}: price requires a valid amount and update date`);
    }
  }
  return errors;
}
