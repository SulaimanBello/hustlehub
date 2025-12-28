import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { admin } from '../lib/api';
import { Search, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';

export default function Tasks() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [resolveModal, setResolveModal] = useState<{ taskId: string; title: string } | null>(null);
  const [resolution, setResolution] = useState<'PAID' | 'CANCELLED'>('PAID');
  const [reason, setReason] = useState('');
  const limit = 20;

  const { data, isLoading, error } = useQuery({
    queryKey: ['tasks', page, search, statusFilter],
    queryFn: () => admin.getTasks({ page, limit, search, status: statusFilter }).then(res => res.data.data),
  });

  const resolveTaskMutation = useMutation({
    mutationFn: ({ taskId, resolution, reason }: { taskId: string; resolution: string; reason: string }) =>
      admin.resolveTask(taskId, resolution, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setResolveModal(null);
      setReason('');
      alert('Task resolved successfully');
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to resolve task');
    },
  });

  const handleResolveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveModal) return;

    if (!reason.trim()) {
      alert('Please provide a reason for this resolution');
      return;
    }

    if (confirm(`Are you sure you want to mark this task as ${resolution}? This action cannot be undone.`)) {
      resolveTaskMutation.mutate({
        taskId: resolveModal.taskId,
        resolution,
        reason,
      });
    }
  };

  if (error) {
    return (
      <div className="card" style={{ color: 'var(--danger)' }}>
        Error loading tasks: {(error as any).message}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Task Management</h1>
      </div>

      {/* Info Banner */}
      <div style={{
        backgroundColor: '#dbeafe',
        border: '1px solid #3b82f6',
        borderRadius: '8px',
        padding: '1rem',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'start',
        gap: '0.75rem'
      }}>
        <AlertCircle size={20} style={{ color: '#3b82f6', flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong>Manual Resolution:</strong> Use the "Resolve" button to manually complete or cancel disputed tasks.
          Payment will be automatically processed based on your decision (PAID = release to doer, CANCELLED = refund to poster).
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
            <Search size={20} style={{ position: 'absolute', left: '0.75rem', top: '0.75rem', color: 'var(--gray-400)' }} />
            <input
              type="text"
              className="input"
              placeholder="Search by title..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
          <select
            className="input"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            style={{ width: '180px' }}
          >
            <option value="">All Status</option>
            <option value="POSTED">Posted</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="COMPLETED">Completed</option>
            <option value="PAID">Paid</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Tasks Table */}
      <div className="card">
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>Loading tasks...</div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Fee</th>
                    <th>Posted By</th>
                    <th>Doer</th>
                    <th>Location</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.tasks?.map((task: any) => (
                    <tr key={task.id}>
                      <td style={{ maxWidth: '200px' }}>
                        <div style={{ fontWeight: 500 }}>{task.title}</div>
                        {task.description && (
                          <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginTop: '0.25rem' }}>
                            {task.description.substring(0, 60)}{task.description.length > 60 ? '...' : ''}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`badge badge-${getStatusColor(task.status)}`}>
                          {task.status}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500 }}>₦{Number(task.fee_amount).toLocaleString()}</td>
                      <td>
                        <div>{task.poster_name || '-'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{task.poster_phone}</div>
                      </td>
                      <td>
                        {task.doer_name || task.doer_phone ? (
                          <>
                            <div>{task.doer_name || '-'}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{task.doer_phone}</div>
                          </>
                        ) : (
                          <span style={{ color: 'var(--gray-400)' }}>None</span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.75rem' }}>
                        {task.latitude.toFixed(4)}, {task.longitude.toFixed(4)}
                      </td>
                      <td>{new Date(task.created_at).toLocaleDateString()}</td>
                      <td>
                        {(task.status === 'COMPLETED' || task.status === 'ACCEPTED') && (
                          <button
                            className="btn"
                            style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem', backgroundColor: 'var(--warning)', color: 'white' }}
                            onClick={() => setResolveModal({ taskId: task.id, title: task.title })}
                          >
                            Resolve
                          </button>
                        )}
                        {task.status === 'PAID' && (
                          <span className="badge badge-success">Completed</span>
                        )}
                        {task.status === 'CANCELLED' && (
                          <span className="badge badge-danger">Cancelled</span>
                        )}
                        {task.status === 'POSTED' && (
                          <span style={{ color: 'var(--gray-400)', fontSize: '0.875rem' }}>No action needed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data?.pagination && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--gray-200)' }}>
                <div style={{ color: 'var(--gray-600)' }}>
                  Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, data.pagination.total)} of {data.pagination.total} tasks
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn"
                    style={{ backgroundColor: 'var(--gray-200)' }}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span style={{ padding: '0.5rem 1rem', alignSelf: 'center' }}>
                    Page {page} of {data.pagination.total_pages}
                  </span>
                  <button
                    className="btn"
                    style={{ backgroundColor: 'var(--gray-200)' }}
                    onClick={() => setPage(p => Math.min(data.pagination.total_pages, p + 1))}
                    disabled={page === data.pagination.total_pages}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Resolve Task Modal */}
      {resolveModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }} onClick={() => setResolveModal(null)}>
          <div className="card" style={{ width: '90%', maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: '1rem' }}>Resolve Task</h2>
            <p style={{ marginBottom: '1.5rem', color: 'var(--gray-600)' }}>
              Task: <strong>{resolveModal.title}</strong>
            </p>

            <form onSubmit={handleResolveSubmit}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                  Resolution Decision
                </label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="resolution"
                      value="PAID"
                      checked={resolution === 'PAID'}
                      onChange={(e) => setResolution(e.target.value as 'PAID')}
                      style={{ marginRight: '0.5rem' }}
                    />
                    <span className="badge badge-success">Mark as PAID</span>
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                      (Release payment to doer)
                    </span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="resolution"
                      value="CANCELLED"
                      checked={resolution === 'CANCELLED'}
                      onChange={(e) => setResolution(e.target.value as 'CANCELLED')}
                      style={{ marginRight: '0.5rem' }}
                    />
                    <span className="badge badge-danger">Mark as CANCELLED</span>
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                      (Refund to poster)
                    </span>
                  </label>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                  Reason for Resolution *
                </label>
                <textarea
                  className="input"
                  placeholder="Explain why you're manually resolving this task..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  required
                  style={{ resize: 'vertical' }}
                />
                <div style={{ fontSize: '0.875rem', color: 'var(--gray-500)', marginTop: '0.5rem' }}>
                  This reason will be logged for audit purposes.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn"
                  style={{ backgroundColor: 'var(--gray-200)' }}
                  onClick={() => {
                    setResolveModal(null);
                    setReason('');
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn"
                  style={{ backgroundColor: resolution === 'PAID' ? 'var(--success)' : 'var(--danger)', color: 'white' }}
                  disabled={resolveTaskMutation.isPending}
                >
                  {resolveTaskMutation.isPending ? 'Processing...' : `Confirm ${resolution}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'POSTED': return 'success';
    case 'ACCEPTED': return 'warning';
    case 'COMPLETED': return 'info';
    case 'PAID': return 'success';
    case 'CANCELLED': return 'danger';
    default: return 'info';
  }
}
