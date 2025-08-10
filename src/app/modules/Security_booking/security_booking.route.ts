import  express  from 'express';
import { SecurityBookingController } from './security_booking.controller';

const router = express.Router();

// create security booking
router.post("/", SecurityBookingController.createSecurityBooking);

export const security_bookingRoute = router;