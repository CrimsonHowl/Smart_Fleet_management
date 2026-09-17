import { Router } from 'express';
import { getRentals, createRental, completeRental } from '../controllers/rentalController';

const router = Router();

router.get('/', getRentals);
router.post('/', createRental);
router.post('/:rentalId/complete', completeRental);

export default router;
