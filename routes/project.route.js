const express = require('express');
const router = express.Router();
const { Project, Review, User } = require('../models');
const authenticate = require('../middleware/authenticate');

// =======================
// GET /projects — Get all projects
// =======================
router.get('/', async (req, res) => {
  try {
    const projects = await Project.findAll();
    res.json(projects);
  } catch (err) {
    console.error('Error fetching projects:', err);
    res.status(500).json({ message: 'Failed to fetch projects' });
  }
});

// =======================
// GET /projects/:id — Get single project
// =======================
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (err) {
    console.error('Error fetching project:', err);
    res.status(500).json({ message: 'Failed to fetch project' });
  }
});

// =======================
// POST /projects — Create new project (authenticated)
// =======================
router.post('/', authenticate, async (req, res) => {
  try {
    const newProject = await Project.create(req.body);
    res.status(201).json(newProject);
  } catch (err) {
    console.error('Error creating project:', err);
    res.status(500).json({ message: 'Failed to create project' });
  }
});

// =======================
// PUT /projects/:id — Update project (authenticated)
// =======================
router.put('/:id', authenticate, async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    await project.update(req.body);
    res.json({ message: 'Project updated', project });
  } catch (err) {
    console.error('Error updating project:', err);
    res.status(500).json({ message: 'Failed to update project' });
  }
});

// =======================
// DELETE /projects/:id — Delete project (authenticated)
// =======================
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    await project.destroy();
    res.json({ message: 'Project deleted' });
  } catch (err) {
    console.error('Error deleting project:', err);
    res.status(500).json({ message: 'Failed to delete project' });
  }
});

// =======================
// GET /projects/:id/reviews — Get reviews for a project
// =======================
router.get('/:id/reviews', async (req, res) => {
  try {
    const reviews = await Review.findAll({
      where: { project_id: req.params.id },
      include: [{ model: User, attributes: ['id', 'name'], as: 'user' }]
    });

    res.json(reviews);
  } catch (err) {
    console.error('Error fetching project reviews:', err);
    res.status(500).json({ message: 'Failed to fetch reviews' });
  }
});

// =======================
// GET /projects/:id/documents — Get all files related to a project
// =======================
router.get('/:id/documents', async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id, {
      attributes: ['license_file', 'agreement_file', 'document_2d', 'document_3d']
    });

    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (err) {
    console.error('Error fetching documents:', err);
    res.status(500).json({ message: 'Failed to fetch documents' });
  }
});

// =======================
// GET /projects/:id/status — Get project status
// =======================
router.get('/:id/status', async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id, {
      attributes: ['status']
    });

    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json({ status: project.status });
  } catch (err) {
    console.error('Error fetching project status:', err);
    res.status(500).json({ message: 'Failed to fetch project status' });
  }
});

module.exports = router;
