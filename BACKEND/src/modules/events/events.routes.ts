import { Router } from 'express';
import { 
  getEventsHandler, 
  getEventByIdHandler, 
  createEventHandler, 
  deleteEventHandler 
} from './events.controller';

const router = Router();

router.get('/', getEventsHandler);
router.get('/:id', getEventByIdHandler);
router.post('/', createEventHandler);
router.delete('/:id', deleteEventHandler);

export default router;