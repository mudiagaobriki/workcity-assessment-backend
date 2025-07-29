import Project from '../models/Project.js';
import Client from '../models/Client.js';
import { projectValidation } from '../validation/project.js';

export const createProject = async (req, res) => {
    try {
        const { error } = projectValidation(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        // Verify client exists
        const client = await Client.findById(req.body.client);
        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }

        const project = new Project({
            ...req.body,
            createdBy: req.user._id
        });

        await project.save();
        await project.populate([
            { path: 'client', select: 'name company email' },
            { path: 'createdBy', select: 'name email' }
        ]);

        res.status(201).json({
            message: 'Project created successfully',
            project
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getAllProjects = async (req, res) => {
    try {
        const projects = await Project.find()
            .populate('client', 'name company email')
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });

        res.json(projects);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getProjectsByClient = async (req, res) => {
    try {
        const projects = await Project.find({ client: req.params.clientId })
            .populate('client', 'name company email')
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });

        res.json(projects);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getProjectById = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id)
            .populate('client', 'name company email')
            .populate('createdBy', 'name email');

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        res.json(project);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const updateProject = async (req, res) => {
    try {
        const { error } = projectValidation(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        // Verify client exists if client is being updated
        if (req.body.client) {
            const client = await Client.findById(req.body.client);
            if (!client) {
                return res.status(404).json({ error: 'Client not found' });
            }
        }

        const project = await Project.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate([
            { path: 'client', select: 'name company email' },
            { path: 'createdBy', select: 'name email' }
        ]);

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        res.json({
            message: 'Project updated successfully',
            project
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteProject = async (req, res) => {
    try {
        const project = await Project.findByIdAndDelete(req.params.id);

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        res.json({ message: 'Project deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};