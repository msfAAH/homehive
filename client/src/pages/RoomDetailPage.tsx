import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import RoomForm from '../components/rooms/RoomForm';
import ProjectForm from '../components/projects/ProjectForm';
import ItemsSection from '../components/items/ItemsSection';
import { apiGet, apiDelete, apiUpload, uploadsUrl } from '../api/client';
import type { Room, Project, Attachment, Item } from '../types';

function formatCost(value: number): string {
  return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function StatusBadge({ status }: { status: Project['status'] }) {
  const colors: Record<string, string> = {
    planned: 'bg-gray-100 text-gray-700',
    in_progress: 'bg-amber-100 text-amber-700',
    completed: 'bg-green-100 text-green-700',
  };
  const labels: Record<string, string> = {
    planned: 'Planned',
    in_progress: 'In Progress',
    completed: 'Completed',
  };
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status]}`}>
      {labels[status]}
    </span>
  );
}

export default function RoomDetailPage() {
  const { homeId, roomId } = useParams<{ homeId: string; roomId: string }>();
  const navigate = useNavigate();
  const hId = Number(homeId);
  const rId = Number(roomId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [room, setRoom] = useState<Room | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditRoom, setShowEditRoom] = useState(false);
  const [showAddProject, setShowAddProject] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchAll = async () => {
    try {
      const [roomData, projectsData, attachmentsData, itemsData] = await Promise.all([
        apiGet<Room>(`/rooms/${rId}`),
        apiGet<Project[]>(`/projects/home/${hId}`),
        apiGet<Attachment[]>(`/attachments?roomId=${rId}`),
        apiGet<Item[]>(`/items/room/${rId}`),
      ]);
      setRoom(roomData);
      setProjects(projectsData.filter((p) => p.room_id === rId));
      setAttachments(attachmentsData);
      setItems(itemsData);
    } catch (err) {
      console.error('Failed to load room details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [hId, rId]);

  const handleDeleteRoom = async () => {
    if (!window.confirm('Are you sure you want to delete this room?')) return;
    try {
      await apiDelete(`/rooms/${rId}`);
      navigate(`/homes/${hId}`);
    } catch (err) {
      console.error('Failed to delete room:', err);
    }
  };

  const handleEditSave = () => {
    setShowEditRoom(false);
    fetchAll();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('files', file);
        formData.append('homeId', String(hId));
        formData.append('roomId', String(rId));
        formData.append('fileType', file.type.startsWith('image/') ? 'photo' : 'document');
        await apiUpload('/attachments', formData);
      }
      fetchAll();
    } catch (err) {
      console.error('Failed to upload:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    if (!window.confirm('Delete this attachment?')) return;
    try {
      await apiDelete(`/attachments/${attachmentId}`);
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    } catch (err) {
      console.error('Failed to delete attachment:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-text-muted">Loading...</p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-text-muted">Room not found.</p>
      </div>
    );
  }

  const photos = attachments.filter((a) => a.file_type === 'photo');
  const documents = attachments.filter((a) => a.file_type === 'document');

  return (
    <div>
      {/* Back link */}
      <Link to={`/homes/${hId}`} className="mb-4 inline-block text-sm text-primary hover:underline">
        &larr; Back to Home
      </Link>

      {/* Room Info */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text flex items-center gap-2">
              {room.icon && <span className="text-3xl leading-none">{room.icon}</span>}
              {room.name}
            </h1>
            <div className="mt-1 flex flex-wrap gap-4 text-sm text-text-muted">
              {room.floor && <span>{room.floor}</span>}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowEditRoom(true)}>
              Edit
            </Button>
            <Button variant="danger" size="sm" onClick={handleDeleteRoom}>
              Delete
            </Button>
          </div>
        </div>
        {room.notes && <p className="mt-3 text-sm text-text-muted">{room.notes}</p>}
      </div>

      {/* Projects Section */}
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text">Projects</h2>
          <Button size="sm" onClick={() => setShowAddProject(true)}>
            Add Project
          </Button>
        </div>
        {projects.length === 0 ? (
          <EmptyState message="No projects assigned to this room." />
        ) : (
          <div className="flex flex-col gap-3">
            {projects.map((project) => (
              <Link key={project.id} to={`/projects/${project.id}`} className="block">
                <Card>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-text">{project.name}</h3>
                      <div className="mt-1 flex flex-wrap gap-3 text-sm text-text-muted">
                        {project.category_name && <span>{project.category_name}</span>}
                        {project.estimated_cost > 0 && (
                          <span>{formatCost(project.estimated_cost)}</span>
                        )}
                      </div>
                    </div>
                    <StatusBadge status={project.status} />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Appliances & Tools Section */}
      <div className="mb-8">
        <ItemsSection roomId={rId} items={items} onUpdate={fetchAll} />
      </div>

      {/* Attachments Section */}
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text">Attachments</h2>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileUpload}
              accept="image/*,.pdf,.doc,.docx,.txt"
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Upload Files'}
            </Button>
          </div>
        </div>

        {attachments.length === 0 ? (
          <EmptyState message="No attachments yet." />
        ) : (
          <div>
            {/* Photos Grid */}
            {photos.length > 0 && (
              <div className="mb-4">
                <h3 className="mb-2 text-sm font-medium text-text-muted">Photos</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {photos.map((photo) => (
                    <div key={photo.id} className="group relative">
                      <img
                        src={uploadsUrl(`photos/${photo.stored_name}`)}
                        alt={photo.caption || photo.file_name}
                        className="h-40 w-full rounded-lg object-cover border border-border"
                      />
                      {photo.caption && (
                        <p className="mt-1 text-xs text-text-muted truncate">{photo.caption}</p>
                      )}
                      <button
                        onClick={() => handleDeleteAttachment(photo.id)}
                        className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                        aria-label="Delete attachment"
                      >
                        X
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Documents List */}
            {documents.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-text-muted">Documents</h3>
                <div className="flex flex-col gap-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between rounded-lg border border-border p-3"
                    >
                      <a
                        href={uploadsUrl(`documents/${doc.stored_name}`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline truncate"
                      >
                        {doc.file_name}
                      </a>
                      <button
                        onClick={() => handleDeleteAttachment(doc.id)}
                        className="ml-2 flex h-6 w-6 shrink-0 items-center justify-center rounded text-text-muted hover:text-danger transition-colors"
                        aria-label="Delete attachment"
                      >
                        X
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Project Modal */}
      <Modal isOpen={showAddProject} onClose={() => setShowAddProject(false)} title="Add Project">
        <ProjectForm
          homeId={hId}
          defaultRoomId={rId}
          onSave={() => { setShowAddProject(false); fetchAll(); }}
          onCancel={() => setShowAddProject(false)}
        />
      </Modal>

      {/* Edit Room Modal */}
      <Modal isOpen={showEditRoom} onClose={() => setShowEditRoom(false)} title="Edit Room">
        <RoomForm
          homeId={hId}
          room={room}
          onSave={handleEditSave}
          onCancel={() => setShowEditRoom(false)}
        />
      </Modal>
    </div>
  );
}
