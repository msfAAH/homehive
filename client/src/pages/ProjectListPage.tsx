import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import ProjectCard from '../components/projects/ProjectCard';
import ProjectForm from '../components/projects/ProjectForm';
import { apiGet } from '../api/client';
import type { Project, Category } from '../types';

export default function ProjectListPage() {
  const { homeId } = useParams<{ homeId: string }>();
  const homeIdNum = Number(homeId);

  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([
        apiGet<Project[]>(`/projects/home/${homeIdNum}`),
        apiGet<Category[]>('/categories'),
      ]);
      setProjects(p);
      setCategories(c);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [homeIdNum]);

  const filtered = useMemo(() => {
    let result = projects;
    if (filterCategory) {
      result = result.filter((p) => String(p.category_id) === filterCategory);
    }
    if (filterStatus) {
      result = result.filter((p) => p.status === filterStatus);
    }
    return result;
  }, [projects, filterCategory, filterStatus]);

  const categoryOptions = [
    { value: '', label: 'All Categories' },
    ...categories.map((c) => ({ value: String(c.id), label: c.name })),
  ];

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'planned', label: 'Planned' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
  ];

  const handleSave = () => {
    setShowForm(false);
    fetchData();
  };

  if (loading) {
    return <p className="p-4 text-text-muted">Loading...</p>;
  }

  return (
    <div>
      <PageHeader
        title="Projects"
        action={
          <Button onClick={() => setShowForm(true)}>Add Project</Button>
        }
      />

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="w-48">
          <Select
            label="Category"
            options={categoryOptions}
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          />
        </div>
        <div className="w-48">
          <Select
            label="Status"
            options={statusOptions}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          message={
            projects.length === 0
              ? 'No projects yet. Add your first project!'
              : 'No projects match the current filters.'
          }
          action={
            projects.length === 0 ? (
              <Button onClick={() => setShowForm(true)}>Add Project</Button>
            ) : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="New Project"
      >
        <ProjectForm
          homeId={homeIdNum}
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
        />
      </Modal>
    </div>
  );
}
