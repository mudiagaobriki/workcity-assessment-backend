import Joi from 'joi';

export const clientValidation = (data) => {
    const schema = Joi.object({
        name: Joi.string().min(2).max(100).required(),
        email: Joi.string().email().required(),
        phone: Joi.string().min(10).max(15).required(),
        company: Joi.string().min(2).max(100).required(),
        address: Joi.string().max(200).optional()
    });
    return schema.validate(data);
};