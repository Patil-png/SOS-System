const Joi = require('joi');

const emergencySchema = Joi.object({
    userId: Joi.string().required().alphanum().min(24).max(24),
    location: Joi.object({
        latitude: Joi.number().required().min(-90).max(90),
        longitude: Joi.number().required().min(-180).max(180),
        altitude: Joi.number().optional(),
        accuracy: Joi.number().optional().min(0),
        altitudeAccuracy: Joi.number().optional(),
        heading: Joi.number().optional(),
        speed: Joi.number().optional()
    }).required()
});

const userSchema = Joi.object({
    name: Joi.string().required().min(2),
    phone: Joi.string().required().min(10),
    guardianName: Joi.string().required(),
    guardianPhone: Joi.string().required().min(10)
});

const validateEmergency = (req, res, next) => {
    const { error } = emergencySchema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }
    next();
};

const validateUser = (req, res, next) => {
    const { error } = userSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }
    next();
};

module.exports = { validateEmergency, validateUser };
