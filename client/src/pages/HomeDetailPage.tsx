import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import HomeForm from '../components/homes/HomeForm';
import RoomCard from '../components/rooms/RoomCard';
import RoomForm from '../components/rooms/RoomForm';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import AttachmentGrid from '../components/attachments/AttachmentGrid';
import AttachmentUpload from '../components/attachments/AttachmentUpload';
import { apiGet, apiPost, apiDelete, uploadsUrl } from '../api/client';
import { StatusBadge, formatCost } from '../components/projects/ProjectStatus';
import type { Home, Room, Project, Category, Attachment, Contractor } from '../types';

export default function HomeDetailPage() {
  const { homeId } = useParams<{ homeId: string }>();
  const navigate = useNavigate();
  const id = Number(homeId);

  const [home, setHome] = useState<Home | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [contractors, setContractors] = useState<(Contractor & { project_name: string; project_id: number })[]>([]);
  const [activeTab, setActiveTab] = useState<'rooms' | 'projects' | 'contractors'>('rooms');

  const [showHomeDocs, setShowHomeDocs] = useState(false);
  const [showTaxHistory, setShowTaxHistory] = useState(false);
  const [expandedTaxRows, setExpandedTaxRows] = useState<Set<string>>(new Set());
  const [paidInstallments, setPaidInstallments] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(`taxPaid-home-${id}`);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  const toggleTaxRow = (fy: string) => {
    setExpandedTaxRows((prev) => {
      const next = new Set(prev);
      next.has(fy) ? next.delete(fy) : next.add(fy);
      return next;
    });
  };

  const toggleInstallmentPaid = (key: string) => {
    setPaidInstallments((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      localStorage.setItem(`taxPaid-home-${id}`, JSON.stringify([...next]));
      return next;
    });
  };
  const [showEditHome, setShowEditHome] = useState(false);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [showAddProject, setShowAddProject] = useState(false);

  // Project form state
  const [projName, setProjName] = useState('');
  const [projCategory, setProjCategory] = useState('');
  const [projStatus, setProjStatus] = useState('planned');
  const [projRoom, setProjRoom] = useState('');
  const [projYear, setProjYear] = useState('');
  const [projCost, setProjCost] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projSaving, setProjSaving] = useState(false);
  const [projError, setProjError] = useState('');

  const fetchAll = async () => {
    try {
      // Fetch the home first — if this fails, there's nothing to show.
      const homeData = await apiGet<Home>(`/homes/${id}`);
      setHome(homeData);

      // Fetch secondary data in parallel; failures here don't hide the home.
      const [roomsData, projectsData, categoriesData, attachmentsData, contractorsData] = await Promise.all([
        apiGet<Room[]>(`/rooms/home/${id}`).catch((e) => { console.error('Failed to load rooms:', e); return [] as Room[]; }),
        apiGet<Project[]>(`/projects/home/${id}`).catch((e) => { console.error('Failed to load projects:', e); return [] as Project[]; }),
        apiGet<Category[]>('/categories').catch((e) => { console.error('Failed to load categories:', e); return [] as Category[]; }),
        apiGet<Attachment[]>(`/attachments?homeId=${id}`).catch((e) => { console.error('Failed to load attachments:', e); return [] as Attachment[]; }),
        apiGet<(Contractor & { project_name: string; project_id: number })[]>(`/contractors/home/${id}`).catch((e) => { console.error('Failed to load contractors:', e); return [] as (Contractor & { project_name: string; project_id: number })[]; }),
      ]);
      setRooms(roomsData);
      setProjects(projectsData);
      setCategories(categoriesData);
      setAttachments(attachmentsData);
      setContractors(contractorsData);
    } catch (err) {
      console.error('Failed to load home details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [id]);

  const handleDeleteHome = async () => {
    if (!window.confirm('Are you sure you want to delete this home? This cannot be undone.')) return;
    try {
      await apiDelete(`/homes/${id}`);
      navigate('/');
    } catch (err) {
      console.error('Failed to delete home:', err);
    }
  };

  const handleEditSave = () => {
    setShowEditHome(false);
    fetchAll();
  };

  const handleRoomSave = () => {
    setShowAddRoom(false);
    fetchAll();
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    if (!window.confirm('Delete this attachment?')) return;
    try {
      await apiDelete(`/attachments/${attachmentId}`);
      fetchAll();
    } catch (err) {
      console.error('Failed to delete attachment:', err);
    }
  };

  const resetProjectForm = () => {
    setProjName('');
    setProjCategory('');
    setProjStatus('planned');
    setProjRoom('');
    setProjYear('');
    setProjCost('');
    setProjDesc('');
    setProjError('');
  };

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projName.trim()) {
      setProjError('Name is required');
      return;
    }
    setProjSaving(true);
    setProjError('');

    try {
      await apiPost(`/projects/home/${id}`, {
        name: projName.trim(),
        category_id: projCategory ? Number(projCategory) : null,
        status: projStatus,
        room_id: projRoom ? Number(projRoom) : null,
        year_created: projYear ? Number(projYear) : null,
        estimated_cost: projCost ? Number(projCost) : 0,
        description: projDesc.trim() || null,
      });
      setShowAddProject(false);
      resetProjectForm();
      fetchAll();
    } catch (err) {
      setProjError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setProjSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-text-muted">Loading...</p>
      </div>
    );
  }

  if (!home) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-text-muted">Home not found.</p>
      </div>
    );
  }

  const statusOptions = [
    { value: 'planned', label: 'Planned' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
  ];

  const categoryOptions = [
    { value: '', label: 'No category' },
    ...categories.map((c) => ({ value: String(c.id), label: c.name })),
  ];

  const roomOptions = [
    { value: '', label: 'No room' },
    ...rooms.map((r) => ({ value: String(r.id), label: r.name })),
  ];

  return (
    <div>
      {/* Home Profile */}
      <div className="mb-6">
        {home.cover_photo && (
          <div className="mb-4 h-48 w-full overflow-hidden rounded-xl">
            <img
              src={uploadsUrl(`photos/${home.cover_photo}`)}
              alt={home.name}
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold text-navy">{home.name}</h1>
            {home.address && <p className="mt-1 text-text-muted">{home.address}</p>}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowEditHome(true)}>
              Edit
            </Button>
            <Button variant="danger" size="sm" onClick={handleDeleteHome}>
              Delete
            </Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-text-muted">
          {home.year_built && <span>Built {home.year_built}</span>}
          {home.year_bought && <span>Bought {home.year_bought}</span>}
        </div>
        {home.notes && <p className="mt-3 text-sm text-text-muted">{home.notes}</p>}
      </div>

      {/* Home Docs */}
      <div className="mb-6">
        <button
          onClick={() => setShowHomeDocs((v) => !v)}
          className="flex items-center gap-1.5 text-sm font-semibold text-text-muted uppercase tracking-wide hover:text-text transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-3.5 w-3.5 transition-transform ${showHomeDocs ? 'rotate-90' : ''}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path fillRule="evenodd" d="M7.293 4.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L11.586 10 7.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          Home Docs ({attachments.length})
        </button>
        {showHomeDocs && (
          <div className="mt-3">
            <AttachmentGrid attachments={attachments} onDelete={handleDeleteAttachment} />
            <div className="mt-3">
              <AttachmentUpload
                entityType="home"
                entityId={id}
                onUpload={fetchAll}
              />
            </div>
          </div>
        )}
      </div>

      {/* Tax History */}
      <div className="mb-6">
        <button
          onClick={() => setShowTaxHistory((v) => !v)}
          className="flex items-center gap-1.5 text-sm font-semibold text-text-muted uppercase tracking-wide hover:text-text transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-3.5 w-3.5 transition-transform ${showTaxHistory ? 'rotate-90' : ''}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path fillRule="evenodd" d="M7.293 4.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L11.586 10 7.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          Tax History
        </button>
        {showTaxHistory && (
          <div className="mt-3">
            <p className="mb-3 text-xs text-text-muted">
              77 Bradford St · Parcel 5638021 · Purchased Mar 12, 2019 for $1,600,000 · Assessed under CA Prop 13
            </p>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-dark">
                    <th className="px-4 py-2 text-left font-medium text-text-muted">Fiscal Year</th>
                    <th className="px-4 py-2 text-right font-medium text-text-muted">Assessed Value</th>
                    <th className="px-4 py-2 text-right font-medium text-text-muted">Tax Rate</th>
                    <th className="px-4 py-2 text-right font-medium text-text-muted">Annual Tax</th>
                    <th className="px-4 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    { fy: '2024–25', assessed: 1749832, rate: 1.1827, tax: 20696, inst1due: 'Dec 10, 2024', inst2due: 'Apr 10, 2025' },
                    { fy: '2023–24', assessed: 1715522, rate: 1.1777, tax: 20204, inst1due: 'Dec 10, 2023', inst2due: 'Apr 10, 2024' },
                    { fy: '2022–23', assessed: 1681884, rate: 1.1797, tax: 19843, inst1due: 'Dec 10, 2022', inst2due: 'Apr 10, 2023' },
                    { fy: '2021–22', assessed: 1648908, rate: 1.1797, tax: 19452, inst1due: 'Dec 10, 2021', inst2due: 'Apr 10, 2022' },
                    { fy: '2020–21', assessed: 1632000, rate: 1.1797, tax: 19253, inst1due: 'Dec 10, 2020', inst2due: 'Apr 10, 2021' },
                    { fy: '2019–20', assessed: 1600000, rate: 1.1801, tax: 18882, inst1due: 'Dec 10, 2019', inst2due: 'Apr 10, 2020' },
                  ].flatMap((row) => {
                    const half = Math.floor(row.tax / 2);
                    const key1 = `${row.fy}-1`;
                    const key2 = `${row.fy}-2`;
                    const expanded = expandedTaxRows.has(row.fy);
                    return [
                      <tr
                        key={row.fy}
                        className="bg-surface hover:bg-surface-dark transition-colors cursor-pointer select-none"
                        onClick={() => toggleTaxRow(row.fy)}
                      >
                        <td className="px-4 py-2.5 font-medium text-text">{row.fy}</td>
                        <td className="px-4 py-2.5 text-right text-text">${row.assessed.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right text-text-muted">{row.rate.toFixed(4)}%</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-text">${row.tax.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className={`h-3.5 w-3.5 text-text-muted transition-transform inline-block ${expanded ? 'rotate-90' : ''}`}
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path fillRule="evenodd" d="M7.293 4.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L11.586 10 7.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </td>
                      </tr>,
                      ...(expanded ? [
                        <tr key={key1} className="bg-surface-dark border-t border-border">
                          <td colSpan={5} className="px-0 py-0">
                            <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-0">
                              <div className="flex items-center gap-2 px-8 py-2 text-xs text-text-muted">
                                <span className="font-medium">1st Installment</span>
                                <span>·</span>
                                <span>{row.inst1due}</span>
                              </div>
                              <span className="px-4 py-2 text-xs font-medium text-text">${half.toLocaleString()}</span>
                              <label className="flex items-center gap-1.5 px-4 py-2 text-xs text-text-muted cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={paidInstallments.has(key1)}
                                  onChange={() => toggleInstallmentPaid(key1)}
                                  className="h-3.5 w-3.5 rounded accent-primary cursor-pointer"
                                />
                                Paid
                              </label>
                              <div className="w-8" />
                            </div>
                          </td>
                        </tr>,
                        <tr key={key2} className="bg-surface-dark border-t border-border">
                          <td colSpan={5} className="px-0 py-0">
                            <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-0">
                              <div className="flex items-center gap-2 px-8 py-2 text-xs text-text-muted">
                                <span className="font-medium">2nd Installment</span>
                                <span>·</span>
                                <span>{row.inst2due}</span>
                              </div>
                              <span className="px-4 py-2 text-xs font-medium text-text">${(row.tax - half).toLocaleString()}</span>
                              <label className="flex items-center gap-1.5 px-4 py-2 text-xs text-text-muted cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={paidInstallments.has(key2)}
                                  onChange={() => toggleInstallmentPaid(key2)}
                                  className="h-3.5 w-3.5 rounded accent-primary cursor-pointer"
                                />
                                Paid
                              </label>
                              <div className="w-8" />
                            </div>
                          </td>
                        </tr>,
                      ] : []),
                    ];
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-text-muted">
              * Assessed values confirmed via SF Open Data (parcel 5638021). Tax rates sourced from SF Treasurer &amp; Tax Collector. Annual tax is approximate; supplemental bills may apply.
            </p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-4 border-b border-border">
        <button
          className={`pb-2 text-sm font-medium transition-colors ${
            activeTab === 'rooms'
              ? 'border-b-2 border-primary text-primary'
              : 'text-text-muted hover:text-text'
          }`}
          onClick={() => setActiveTab('rooms')}
        >
          Rooms ({rooms.length})
        </button>
        <button
          className={`pb-2 text-sm font-medium transition-colors ${
            activeTab === 'projects'
              ? 'border-b-2 border-primary text-primary'
              : 'text-text-muted hover:text-text'
          }`}
          onClick={() => setActiveTab('projects')}
        >
          Projects ({projects.length})
        </button>
        <button
          className={`pb-2 text-sm font-medium transition-colors ${
            activeTab === 'contractors'
              ? 'border-b-2 border-primary text-primary'
              : 'text-text-muted hover:text-text'
          }`}
          onClick={() => setActiveTab('contractors')}
        >
          Contractors ({contractors.length})
        </button>
      </div>

      {/* Rooms Tab */}
      {activeTab === 'rooms' && (
        <div>
          <div className="mb-4 flex justify-end">
            <Button size="sm" onClick={() => setShowAddRoom(true)}>Add Room</Button>
          </div>
          {rooms.length === 0 ? (
            <EmptyState
              message="No rooms added yet."
              action={<Button onClick={() => setShowAddRoom(true)}>Add a Room</Button>}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  projects={projects.filter((p) => p.room_id != null && Number(p.room_id) === Number(room.id))}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Projects Tab */}
      {activeTab === 'projects' && (
        <div>
          <div className="mb-4 flex justify-end">
            <Button size="sm" onClick={() => setShowAddProject(true)}>Add Project</Button>
          </div>
          {projects.length === 0 ? (
            <EmptyState
              message="No projects added yet."
              action={<Button onClick={() => setShowAddProject(true)}>Add a Project</Button>}
            />
          ) : (
            <div className="flex flex-col gap-6">
              {(['in_progress', 'planned', 'completed'] as Project['status'][])
                .map((status) => {
                  const group = projects
                    .filter((p) => p.status === status)
                    .sort((a, b) => {
                      if (a.year_created === b.year_created) return 0;
                      if (a.year_created === null) return 1;
                      if (b.year_created === null) return -1;
                      return b.year_created - a.year_created;
                    });
                  if (group.length === 0) return null;

                  // Group by year within status
                  const byYear = group.reduce<Record<string, Project[]>>((acc, p) => {
                    const key = p.year_created ? String(p.year_created) : 'No Year';
                    (acc[key] ??= []).push(p);
                    return acc;
                  }, {});
                  const yearKeys = Object.keys(byYear).sort((a, b) => {
                    if (a === 'No Year') return 1;
                    if (b === 'No Year') return -1;
                    return Number(b) - Number(a);
                  });

                  return (
                    <div key={status}>
                      <StatusBadge status={status} />
                      <div className="mt-3 flex flex-col gap-4">
                        {yearKeys.map((year) => (
                          <div key={year}>
                            <p className="mb-2 text-sm font-semibold text-text-muted">{year}</p>
                            <div className="flex flex-col gap-2">
                              {byYear[year].map((project) => (
                                <Link key={project.id} to={`/projects/${project.id}`} className="block">
                                  <Card>
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <h3 className="font-semibold text-text">{project.name}</h3>
                                        <div className="mt-1 flex flex-wrap gap-3 text-sm text-text-muted">
                                          {project.category_name && <span>{project.category_name}</span>}
                                          {project.room_name && <span>{project.room_name}</span>}
                                          {Number(project.estimated_cost) > 0 && (
                                            <span>{formatCost(project.estimated_cost)}</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </Card>
                                </Link>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* Contractors Tab */}
      {activeTab === 'contractors' && (
        <div>
          {contractors.length === 0 ? (
            <p className="text-text-muted">No contractors have been added to any projects yet.</p>
          ) : (
            <div className="flex flex-col gap-8">
              {Object.entries(
                contractors.reduce<Record<string, (Contractor & { project_name: string; project_id: number })[]>>(
                  (acc, c) => { (acc[c.project_name] ??= []).push(c); return acc; },
                  {}
                )
              ).map(([projectName, group]) => (
                <div key={projectName}>
                  <Link
                    to={`/projects/${group[0].project_id}`}
                    className="mb-3 inline-block text-base font-semibold text-primary hover:underline"
                  >
                    {projectName}
                  </Link>
                  <div className="flex flex-col gap-3">
                    {group.map((c) => (
                      <div key={c.id} className="rounded-xl border border-border bg-surface p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-text">{c.company_name}</span>
                              {c.contractor_type && (
                                <span className="rounded bg-surface-dark px-2 py-0.5 text-xs font-medium text-text-muted">
                                  {c.contractor_type}
                                </span>
                              )}
                            </div>
                            {c.contact_name && (
                              <span className="text-sm text-text-muted">{c.contact_name}</span>
                            )}
                            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-text-muted">
                              {c.phone && <a href={`tel:${c.phone}`} className="hover:text-primary">{c.phone}</a>}
                              {c.email && <a href={`mailto:${c.email}`} className="hover:text-primary">{c.email}</a>}
                              {c.website && (
                                <a href={c.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                                  {c.website}
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Home Modal */}
      <Modal isOpen={showEditHome} onClose={() => setShowEditHome(false)} title="Edit Home">
        <HomeForm home={home} onSave={handleEditSave} onCancel={() => setShowEditHome(false)} />
      </Modal>

      {/* Add Room Modal */}
      <Modal isOpen={showAddRoom} onClose={() => setShowAddRoom(false)} title="Add Room">
        <RoomForm homeId={id} onSave={handleRoomSave} onCancel={() => setShowAddRoom(false)} />
      </Modal>

      {/* Add Project Modal */}
      <Modal
        isOpen={showAddProject}
        onClose={() => { setShowAddProject(false); resetProjectForm(); }}
        title="Add Project"
      >
        <form onSubmit={handleProjectSubmit} className="flex flex-col gap-4">
          {projError && <p className="text-sm text-danger">{projError}</p>}
          <Input
            label="Name"
            value={projName}
            onChange={(e) => setProjName(e.target.value)}
            required
            placeholder="Kitchen Renovation"
          />
          <Select
            label="Category"
            options={categoryOptions}
            value={projCategory}
            onChange={(e) => setProjCategory(e.target.value)}
          />
          <Select
            label="Status"
            options={statusOptions}
            value={projStatus}
            onChange={(e) => setProjStatus(e.target.value)}
          />
          <Select
            label="Room"
            options={roomOptions}
            value={projRoom}
            onChange={(e) => setProjRoom(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Year"
              type="number"
              value={projYear}
              onChange={(e) => setProjYear(e.target.value)}
              placeholder="2024"
            />
            <Input
              label="Estimated Cost"
              type="number"
              value={projCost}
              onChange={(e) => setProjCost(e.target.value)}
              placeholder="5000"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="proj-desc" className="text-sm font-medium text-text-muted">
              Description
            </label>
            <textarea
              id="proj-desc"
              className="w-full rounded-lg border border-border px-3 py-2 min-h-[80px] bg-warm-white text-text focus:outline-primary focus:ring-1 focus:ring-primary"
              value={projDesc}
              onChange={(e) => setProjDesc(e.target.value)}
              placeholder="Describe the project..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => { setShowAddProject(false); resetProjectForm(); }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={projSaving}>
              {projSaving ? 'Saving...' : 'Add Project'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
