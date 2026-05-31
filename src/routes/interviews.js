const express = require('express');
const router = express.Router();
const { validate } = require('../middleware/validate');
const { scheduleInterviewSchema, updateStatusSchema } = require('../validators/schemas');
const { postInterview, getInterviews, patchInterviewStatus } = require('../controllers/interviewController');

router.post('/', validate(scheduleInterviewSchema), postInterview);
router.get('/', getInterviews);
router.patch('/:id/status', validate(updateStatusSchema), patchInterviewStatus);

module.exports = router;
