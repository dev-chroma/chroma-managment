'use client';

import React, { useState } from 'react';
import { useData } from '@/lib/context/data-context';
import { useAuth } from '@/lib/context/auth-context';
import { formatBytes } from '@/lib/utils';
import { ResourceItem } from '@/types/database';
import {
  FolderArchive,
  Plus,
  FileText,
  Download,
  Search,
  ExternalLink,
  X,
  FileCode,
  Trash2,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { TwoStepDeleteModal } from '@/components/common/two-step-delete-modal';

export default function ResourceCenterPage() {
  const { resources, departments, addResource, deleteResource } = useData();
  const { user, role } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [resourceToDelete, setResourceToDelete] = useState<ResourceItem | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // New resource state
  const [title, setTitle] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [category, setCategory] = useState('Brand Assets');
  const [departmentId, setDepartmentId] = useState('');
  const [resourceActionType, setResourceActionType] = useState<'link' | 'download'>('link');

  // Resource Center Permissions:
  // Members can view and download resources, but CANNOT add or delete.
  // Admins and Owner CAN add and delete resources.
  const canAddOrDelete = role === 'owner' || role === 'admin';

  const categories = Array.from(new Set(resources.map((r) => r.category)));

  // Strict Department Scoping: Admin and Member only see their department + general resources
  const filteredResources = resources.filter((r) => {
    if (role !== 'owner' && role !== 'general_member' && r.department_id && r.department_id !== user?.department_id) {
      return false;
    }
    if (selectedCategory !== 'all' && r.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      if (!r.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    }
    return true;
  });

  const handleDelete = async (resource: ResourceItem) => {
    setResourceToDelete(resource);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !fileUrl.trim()) return;

    // Admin & Member automatically assign to their department; Owner can select any
    const targetDeptId = role === 'owner' ? (departmentId || null) : (user?.department_id || null);

    await addResource({
      title,
      file_url: fileUrl,
      category,
      department_id: targetDeptId,
      file_type: resourceActionType === 'link' ? 'Link' : 'Download',
      file_size: resourceActionType === 'link' ? undefined : 2400000,
      uploaded_by: user?.id || null,
    });

    setIsUploadOpen(false);
    setTitle('');
    setFileUrl('');
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Management</span>
            <span>/</span>
            <span className="font-semibold text-foreground">Assets & Guidelines</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground mt-1 flex items-center gap-2.5">
            <FolderArchive className="h-6 w-6 text-primary" />
            <span>Resource Center</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Central repository for brand kits, editorial guidelines, design templates, and reference materials.
          </p>
        </div>

        {canAddOrDelete && (
          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm self-start sm:self-auto cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Resource</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search resources by title..."
            className="w-full bg-card border border-border rounded-xl pl-9 pr-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-card border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Resources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredResources.map((res) => {
          const dept = departments.find((d) => d.id === res.department_id);

          return (
            <div
              key={res.id}
              className="bg-card border border-border rounded-2xl p-5 hover:border-primary/40 transition-colors flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                    <FileText className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                    {res.category}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-sm text-foreground">{res.title}</h3>
                  <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-2">
                    <span>{res.file_size ? formatBytes(res.file_size) : 'File'}</span>
                    <span>·</span>
                    <span>{dept?.name || 'Organization-wide'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                <span className="font-mono text-[11px] text-muted-foreground">
                  {format(parseISO(res.created_at), 'MMM dd, yyyy')}
                </span>
                <div className="flex items-center gap-2">
                  {res.file_type?.toLowerCase() === 'link' ? (
                    <a
                      href={res.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-xl font-bold text-xs hover:bg-primary/90 transition-all shadow-2xs cursor-pointer"
                      title="View Site"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>View Site</span>
                    </a>
                  ) : (
                    <a
                      href={res.file_url}
                      target="_blank"
                      download
                      rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition-all shadow-2xs cursor-pointer"
                      title="Download File"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download</span>
                    </a>
                  )}

                  {canAddOrDelete && (
                    <button
                      onClick={() => handleDelete(res)}
                      className="p-1 rounded text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Delete Resource (Admin/Owner only)"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
    </div>
  );
})}
      </div>

      {/* Upload Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-base text-foreground">Upload Workspace Resource</h3>
              <button onClick={() => setIsUploadOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-foreground mb-1">Resource Action / Type *</label>
                <select
                  value={resourceActionType}
                  onChange={(e) => setResourceActionType(e.target.value as 'link' | 'download')}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer font-semibold"
                >
                  <option value="link">Web Link / Site (Action: View Site)</option>
                  <option value="download">File Asset / Storage (Action: Download)</option>
                </select>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {resourceActionType === 'link'
                    ? 'Selected Link: Button will show "View Site" to visit the webpage or external tool.'
                    : 'Selected Download: Button will show "Download" to save the file.'}
                </p>
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Resource Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 2026 Editorial Guidelines & Rubric"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">
                  {resourceActionType === 'link' ? 'Website URL / Web Link *' : 'File Storage URL / Download Link *'}
                </label>
                <input
                  type="url"
                  required
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  placeholder={resourceActionType === 'link' ? 'https://... (Website or Drive link)' : 'https://... (Direct file download link)'}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Category</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Brand Assets, Writing Guidelines"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Target Department</label>
                {role === 'owner' ? (
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Organization-wide (All Departments)</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    disabled
                    value={departments.find((d) => d.id === user?.department_id)?.name || 'My Department'}
                    className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-muted-foreground cursor-not-allowed font-medium text-xs"
                  />
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 shadow-xs"
                >
                  Add Resource
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
          {resourceToDelete && (
        <TwoStepDeleteModal
          isOpen={Boolean(resourceToDelete)}
          title="Delete Workspace Resource"
          itemTitle={resourceToDelete.title}
          itemDetails={`Category: ${resourceToDelete.category} · File: ${resourceToDelete.file_type || 'Document'}`}
          onClose={() => setResourceToDelete(null)}
          onConfirmDelete={async () => {
            await deleteResource(resourceToDelete.id);
            setResourceToDelete(null);
          }}
        />
      )}
</div>
  );
}
