import { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { updateAutomationRule } from '../../controllers/automation.controller.js';
import { updateCategory } from '../../controllers/category.controller.js';
import { recordConsent } from '../../controllers/consent.controller.js';
import { updateCoupon } from '../../controllers/coupon.controller.js';
import { createDeliveryZone, updateDeliveryZone } from '../../controllers/delivery-zone.controller.js';
import { updateGalleryImage } from '../../controllers/gallery.controller.js';
import {
  createCookieCategory,
  updateCookieCategory,
  upsertLegalPage,
} from '../../controllers/legal.controller.js';
import { updateLocation } from '../../controllers/location.controller.js';
import { createMenuItem, updateMenuItem } from '../../controllers/menu-item.controller.js';
import {
  updateAdvancedSettings,
  updateGeneralSettings,
  updateMailSettings,
  updateOrderSettings,
  updatePaymentSettings,
  updateReservationSettings,
  updateReviewSettings,
  updateSettings,
} from '../../controllers/settings.controller.js';
import { acceptInvite, inviteStaff, updateStaff } from '../../controllers/staff.controller.js';

const req = {
  body: null,
  params: { id: 'test-id', locationId: 'test-location', zoneId: 'test-zone' },
} as unknown as Request;

const validationCases: Array<[string, (res: Response) => Promise<void>]> = [
  ['automation rule update', (res) => updateAutomationRule(req as Request<{ id: string }>, res)],
  ['category update', (res) => updateCategory(req as Request<{ id: string }>, res)],
  ['consent recording', (res) => recordConsent(req, res)],
  ['coupon update', (res) => updateCoupon(req as Request<{ id: string }>, res)],
  ['delivery zone creation', (res) => createDeliveryZone(req as Request<{ locationId: string }>, res)],
  ['delivery zone update', (res) => updateDeliveryZone(req as Request<{ locationId: string; zoneId: string }>, res)],
  ['gallery image update', (res) => updateGalleryImage(req as Request<{ id: string }>, res)],
  ['legal page update', (res) => upsertLegalPage(req as Request<{ slug: string }>, res)],
  ['cookie category creation', (res) => createCookieCategory(req, res)],
  ['cookie category update', (res) => updateCookieCategory(req as Request<{ id: string }>, res)],
  ['location update', (res) => updateLocation(req as Request<{ id: string }>, res)],
  ['menu item creation', (res) => createMenuItem(req, res)],
  ['menu item update', (res) => updateMenuItem(req as Request<{ id: string }>, res)],
  ['settings update', (res) => updateSettings(req, res)],
  ['general settings update', (res) => updateGeneralSettings(req, res)],
  ['order settings update', (res) => updateOrderSettings(req, res)],
  ['reservation settings update', (res) => updateReservationSettings(req, res)],
  ['mail settings update', (res) => updateMailSettings(req, res)],
  ['payment settings update', (res) => updatePaymentSettings(req, res)],
  ['review settings update', (res) => updateReviewSettings(req, res)],
  ['advanced settings update', (res) => updateAdvancedSettings(req, res)],
  ['staff update', (res) => updateStaff(req as Request<{ id: string }>, res)],
  ['staff invitation', (res) => inviteStaff(req, res)],
  ['staff invitation acceptance', (res) => acceptInvite(req, res)],
];

describe('Request validation errors', () => {
  it.each(validationCases)('rejects malformed %s payloads', async (_name, invoke) => {
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;

    await invoke(res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });
});
