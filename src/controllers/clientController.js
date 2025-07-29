import Client from '../models/Client.js';
import { clientValidation } from '../validation/client.js';

export const createClient = async (req, res) => {
    try {
        const { error } = clientValidation(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const client = new Client({
            ...req.body,
            createdBy: req.user._id
        });

        await client.save();
        await client.populate('createdBy', 'name email');

        res.status(201).json({
            message: 'Client created successfully',
            client
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getAllClients = async (req, res) => {
    try {
        const clients = await Client.find()
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });

        res.json(clients);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getClientById = async (req, res) => {
    try {
        const client = await Client.findById(req.params.id)
            .populate('createdBy', 'name email');

        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }

        res.json(client);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const updateClient = async (req, res) => {
    try {
        const { error } = clientValidation(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const client = await Client.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate('createdBy', 'name email');

        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }

        res.json({
            message: 'Client updated successfully',
            client
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteClient = async (req, res) => {
    try {
        const client = await Client.findByIdAndDelete(req.params.id);

        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }

        res.json({ message: 'Client deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};