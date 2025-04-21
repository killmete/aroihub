import express from 'express';
import { handleFrontendLog } from '../controllers/logController';

const router = express.Router();

router.post('/', handleFrontendLog);

export default router;
