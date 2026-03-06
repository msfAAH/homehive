import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import ProjectForm from '../components/projects/ProjectForm';
import CostTable from '../components/projects/CostTable';
import ContractorTable from '../components/projects/ContractorTable';
import BeforeAfterSection from '../components/projects/BeforeAfterSection';
import AttachmentGrid from '../components/attachments/AttachmentGrid';
import AttachmentUpload from '../components/attachments/AttachmentUpload';
import WarrantyMaintenance from '../components/WarrantyMaintenance';
import { apiGet, apiDelete } from '../api/client';
import type { Project } from '../types';

const fmt = (n: number | string) =>
  '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const statusStyles: Record<string, string> = {
  planned: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
};

const statusLabels: Record<string, string> = {
  planned: 'Planned',
  in_progress: 'In Progress',
  completed: 'Completed',
};

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const projectIdNum = Number(projectId);

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);

  const fetchProject = async () => {
    try {
      const p = await apiGet<Project>(`/projects/${projectIdNum}`);
      setProject(p);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [projectIdNum]);

  const handleDelete = async () => {
    if (!project) return;
    if (!window.confirm(`Delete project "${project.name}"? This cannot be undone.`)) return;
    try {
      await apiDelete(`/projects/${project.id}`);
      navigate(`/homes/${project.home_id}/projects`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAttachment = async (id: number) => {
    if (!window.confirm('Delete this attachment?')) return;
    try {
      await apiDelete(`/attachments/${id}`);
      fetchProject();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditSave = () => {
    setShowEdit(false);
    fetchProject();
  };

  if (loading) {
    return <p className="p-4 text-text-muted">Loading...</p>;
  }

  if (!project) {
    return <p className="p-4 text-text-muted">Project not found.</p>;
  }

  const lineItems = project.line_items ?? [];
  const attachments = project.attachments ?? [];
  const contractors = project.contractors ?? [];
  const generalAttachments = attachments.filter((a) => !a.photo_category);

  return (
    <div>
      <PageHeader
        title={project.name}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowEdit(true)}>
              Edit
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        }
      />

      {/* Project Info */}
      <div className="mb-6 rounded-xl border border-border bg-surface p-4">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[project.status]}`}
          >
            {statusLabels[project.status]}
          </span>
          {project.category_name && (
            <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
              {project.category_name}
            </span>
          )}
          {project.room_name && (
            <span className="text-sm text-text-muted">
              Room: {project.room_name}
            </span>
          )}
          {project.year_created && (
            <span className="text-sm text-text-muted">
              Year: {project.year_created}
            </span>
          )}
        </div>

        {project.description && (
          <p className="text-sm text-text">{project.description}</p>
        )}

        <div className="mt-3 flex flex-wrap gap-4 text-sm text-text-muted">
          <span>Estimated: {fmt(project.estimated_cost)}</span>
          <span>Actual: {fmt(project.actual_cost)}</span>
        </div>
      </div>

      {/* Contractors */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-text">Contractors</h2>
        <ContractorTable
          projectId={project.id}
          contractors={contractors}
          onUpdate={fetchProject}
        />
      </section>

      {/* Cost / Line Items */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-text">Cost Breakdown</h2>
        <CostTable
          projectId={project.id}
          lineItems={lineItems}
          estimatedCost={project.estimated_cost}
          onUpdate={fetchProject}
        />
      </section>

      {/* Before & After Photos */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-text">Before & After</h2>
        <BeforeAfterSection
          projectId={project.id}
          attachments={attachments}
          onUpdate={fetchProject}
          onDelete={handleDeleteAttachment}
        />
      </section>

      {/* Warranties & Maintenance */}
      <section className="mb-8">
        <WarrantyMaintenance
          entityType="project"
          entityId={project.id}
          warrantyInfo={project.warranty_info}
          maintenanceInfo={project.maintenance_info}
          hasAttachments={attachments.length > 0}
          onUpdate={fetchProject}
        />
      </section>

      {/* Attachments */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-text">Attachments</h2>
        <AttachmentGrid attachments={generalAttachments} onDelete={handleDeleteAttachment} />
        <div className="mt-4">
          <AttachmentUpload
            entityType="project"
            entityId={project.id}
            onUpload={fetchProject}
          />
        </div>
      </section>

      {/* Edit Modal */}
      <Modal
        isOpen={showEdit}
        onClose={() => setShowEdit(false)}
        title="Edit Project"
      >
        <ProjectForm
          homeId={project.home_id}
          project={project}
          onSave={handleEditSave}
          onCancel={() => setShowEdit(false)}
        />
      </Modal>
    </div>
  );
}
