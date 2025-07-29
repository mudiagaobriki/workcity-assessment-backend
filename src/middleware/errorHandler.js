const errorHandler = (err, req, res, next) => {
    console.error(err.stack);

    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(error => error.message);
        return res.status(400).json({ error: 'Validation Error', details: errors });
    }

    if (err.name === 'CastError') {
        return res.status(400).json({ error: 'Invalid ID format' });
    }

    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return res.status(400).json({ error: `${field} already exists` });
    }

    res.status(500).json({ error: 'Internal server error' });
};

export default errorHandler;