import Joi from 'joi';

export const signupValidation = (data) => {
    const schema = Joi.object({
        name: Joi.string().min(2).max(50).required(),
        email: Joi.string().email().required(),
        phone: Joi.string().min(10).max(15).required(),
        password: Joi.string().min(6).required(),
        role: Joi.string().valid('admin', 'user').default('user')
    });
    return schema.validate(data);
};

export const loginValidation = (data) => {
    const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required()
    });
    return schema.validate(data);
};
