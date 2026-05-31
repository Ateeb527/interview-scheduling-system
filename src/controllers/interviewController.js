const {
  scheduleInterview,
  getAllInterviews,
  updateInterviewStatus,
} = require('../services/interviewService');

async function postInterview(req, res, next) {
  try {
    scheduleInterview(req.validatedBody);
    return res.status(201).json({ message: 'Interview scheduled successfully' });
  } catch (err) {
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: err.message } });
    }
    if (err.code === 'INTERVIEW_CONFLICT') {
      return res.status(409).json({ error: { code: 'INTERVIEW_CONFLICT', message: err.message } });
    }
    next(err);
  }
}

async function getInterviews(req, res, next) {
  try {
    const interviews = getAllInterviews();
    return res.json(interviews);
  } catch (err) {
    next(err);
  }
}

async function patchInterviewStatus(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'id must be an integer' } });
    }
    updateInterviewStatus(id, req.validatedBody.status);
    return res.json({ message: 'Interview status updated successfully' });
  } catch (err) {
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: err.message } });
    }
    if (err.code === 'INVALID_STATUS_TRANSITION') {
      return res.status(422).json({ error: { code: 'INVALID_STATUS_TRANSITION', message: err.message } });
    }
    next(err);
  }
}

module.exports = { postInterview, getInterviews, patchInterviewStatus };
