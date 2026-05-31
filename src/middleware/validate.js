function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.errors[0]?.message || 'Validation failed';
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message },
      });
    }
    req.validatedBody = result.data;
    next();
  };
}

module.exports = { validate };
