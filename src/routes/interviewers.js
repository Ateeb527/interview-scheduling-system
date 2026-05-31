const express = require('express');
const router = express.Router();
const { validate } = require('../middleware/validate');
const { createInterviewerSchema } = require('../validators/schemas');
const { postInterviewer, getInterviewers } = require('../controllers/interviewerController');

router.post('/', validate(createInterviewerSchema), postInterviewer);
router.get('/', getInterviewers);

module.exports = router;
