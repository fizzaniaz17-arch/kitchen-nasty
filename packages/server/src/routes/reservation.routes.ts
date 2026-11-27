import { Router } from 'express';
import { authenticate, requireStaff } from '../middleware/auth.js';
import {
  createReservation,
  listReservations,
  getReservation,
  updateReservation,
  deleteReservation,
  listCustomerReservations,
  checkAvailability,
  getReservationAnalytics,
} from '../controllers/reservation.controller.js';

const router = Router();

// Public: check availability
router.get('/availability', (req, res, next) => {
  void checkAvailability(req, res).catch(next);
});

// Customer: own reservations
router.get('/my-reservations', authenticate, listCustomerReservations);

// Staff: analytics (must be before /:id)
router.get('/analytics', authenticate, requireStaff, getReservationAnalytics);

// Customer: create reservation
router.post('/', authenticate, (req, res, next) => {
  void createReservation(req, res).catch(next);
});

// Staff: manage reservations
router.get('/', authenticate, requireStaff, (req, res, next) => {
  void listReservations(req, res).catch(next);
});
// Not staff-only: customers may read their own booking. Ownership is enforced
// inside getReservation, so this route must stay authenticated.
router.get('/:id', authenticate, getReservation);
router.patch<{ id: string }>('/:id', authenticate, requireStaff, (req, res, next) => {
  void updateReservation(req, res).catch(next);
});
router.delete('/:id', authenticate, requireStaff, deleteReservation);

export default router;
