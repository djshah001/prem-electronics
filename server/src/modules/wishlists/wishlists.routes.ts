import { Router } from 'express';
import { wishlistsController } from './wishlists.controller';
import { asyncHandler } from '../../core/middlewares/asyncHandler';
import { authenticate } from '../../core/middlewares/authGuard';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(wishlistsController.getWishlist));
router.post('/:productId', asyncHandler(wishlistsController.addToWishlist));
router.delete('/:productId', asyncHandler(wishlistsController.removeFromWishlist));

export default router;
