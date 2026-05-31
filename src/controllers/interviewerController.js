const { createInterviewer, getAllInterviewers } = require('../services/interviewerService');

async function postInterviewer(req, res, next) {
  try {
    const interviewer = createInterviewer(req.validatedBody);
    return res.status(201).json(interviewer);
  } catch (err) {
    if (err.code === 'DUPLICATE_EMAIL') {
      return res.status(409).json({ error: { code: 'DUPLICATE_EMAIL', message: err.message } });
    }
    next(err);
  }
}

async function getInterviewers(req, res, next) {
  try {
    const interviewers = getAllInterviewers();
    return res.json(interviewers);
  } catch (err) {
    next(err);
  }
}

module.exports = { postInterviewer, getInterviewers };
