import Joi from 'joi';

export const projectValidation = (data) => {
    const schema = Joi.object({
        name: Joi.string().min(2).max(100).required(),
        description: Joi.string().min(10).max(500).required(),
        status: Joi.string().valid('planning', 'in-progress', 'completed', 'on-hold').default('planning'),
        startDate: Joi.date().required(),
        endDate: Joi.date().greater(Joi.ref('startDate')).optional(),
        budget: Joi.number().min(0).optional(),
        client: Joi.string().hex().length(24).required()
    });
    return schema.validate(data);
};