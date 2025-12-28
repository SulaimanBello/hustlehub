import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { admin } from '../lib/api';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

export default function Users() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const limit = 20;

  const { data, isLoading, error } = useQuery({
    queryKey: ['users', page, search, roleFilter],
    queryFn: () => admin.getUsers({ page, limit, search, role: roleFilter }).then(res => res.data.data),
  });

  const { data: userDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['user-details', selectedUser],
    queryFn: () => selectedUser ? admin.getUserDetails(selectedUser).then(res => res.data.data) : null,
    enabled: !!selectedUser,
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      admin.updateUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user-details'] });
      alert('User role updated successfully');
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to update role');
    },
  });

  const handleRoleChange = (userId: string, newRole: string) => {
    if (confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
      updateRoleMutation.mutate({ userId, role: newRole });
    }
  };

  if (error) {
    return (
      <div className="card" style={{ color: 'var(--danger)' }}>
        Error loading users: {(error as any).message}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>User Management</h1>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
            <Search size={20} style={{ position: 'absolute', left: '0.75rem', top: '0.75rem', color: 'var(--gray-400)' }} />
            <input
              type="text"
              className="input"
              placeholder="Search by name or phone..."
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
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            style={{ width: '150px' }}
          >
            <option value="">All Roles</option>
            <option value="USER">User</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="card">
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>Loading users...</div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone Number</th>
                    <th>Role</th>
                    <th>Verified</th>
                    <th>Tasks Posted</th>
                    <th>Tasks Completed</th>
                    <th>Balance</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.users?.map((user: any) => (
                    <tr key={user.id}>
                      <td>{user.name || '-'}</td>
                      <td>{user.phone_number}</td>
                      <td>
                        <span className={`badge ${user.role === 'ADMIN' ? 'badge-danger' : 'badge-info'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td>
                        {user.phone_verified ? (
                          <span className="badge badge-success">✓ Verified</span>
                        ) : (
                          <span className="badge badge-warning">Not Verified</span>
                        )}
                      </td>
                      <td>{user.tasks_posted || 0}</td>
                      <td>{user.tasks_completed || 0}</td>
                      <td>₦{Number(user.balance || 0).toLocaleString()}</td>
                      <td>{new Date(user.created_at).toLocaleDateString()}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            className="btn"
                            style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem', backgroundColor: 'var(--info)', color: 'white' }}
                            onClick={() => setSelectedUser(user.id)}
                          >
                            View
                          </button>
                          {user.role === 'USER' && (
                            <button
                              className="btn"
                              style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem', backgroundColor: 'var(--warning)', color: 'white' }}
                              onClick={() => handleRoleChange(user.id, 'ADMIN')}
                            >
                              Make Admin
                            </button>
                          )}
                          {user.role === 'ADMIN' && (
                            <button
                              className="btn btn-danger"
                              style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
                              onClick={() => handleRoleChange(user.id, 'USER')}
                            >
                              Remove Admin
                            </button>
                          )}
                        </div>
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
                  Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, data.pagination.total)} of {data.pagination.total} users
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

      {/* User Details Modal */}
      {selectedUser && (
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
        }} onClick={() => setSelectedUser(null)}>
          <div className="card" style={{ width: '90%', maxWidth: '800px', maxHeight: '90vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            {isLoadingDetails ? (
              <div>Loading user details...</div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h2>User Details</h2>
                  <button
                    className="btn"
                    style={{ backgroundColor: 'var(--gray-200)' }}
                    onClick={() => setSelectedUser(null)}
                  >
                    Close
                  </button>
                </div>

                {/* User Info */}
                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ marginBottom: '1rem' }}>Profile</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <strong>Name:</strong> {userDetails?.user?.name || 'Not set'}
                    </div>
                    <div>
                      <strong>Phone:</strong> {userDetails?.user?.phone_number}
                    </div>
                    <div>
                      <strong>Role:</strong> <span className={`badge ${userDetails?.user?.role === 'ADMIN' ? 'badge-danger' : 'badge-info'}`}>{userDetails?.user?.role}</span>
                    </div>
                    <div>
                      <strong>Verified:</strong> {userDetails?.user?.phone_verified ? '✓ Yes' : '✗ No'}
                    </div>
                    <div>
                      <strong>Balance:</strong> ₦{Number(userDetails?.user?.balance || 0).toLocaleString()}
                    </div>
                    <div>
                      <strong>Total Earned:</strong> ₦{Number(userDetails?.user?.total_earned || 0).toLocaleString()}
                    </div>
                    <div>
                      <strong>Total Spent:</strong> ₦{Number(userDetails?.user?.total_spent || 0).toLocaleString()}
                    </div>
                    <div>
                      <strong>Joined:</strong> {new Date(userDetails?.user?.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Recent Tasks */}
                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ marginBottom: '1rem' }}>Recent Tasks</h3>
                  {userDetails?.tasks?.length > 0 ? (
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Title</th>
                          <th>Type</th>
                          <th>Status</th>
                          <th>Fee</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userDetails.tasks.map((task: any) => (
                          <tr key={task.id}>
                            <td>{task.title}</td>
                            <td><span className="badge badge-info">{task.type}</span></td>
                            <td><span className={`badge badge-${getStatusColor(task.status)}`}>{task.status}</span></td>
                            <td>₦{Number(task.fee_amount).toLocaleString()}</td>
                            <td>{new Date(task.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p style={{ color: 'var(--gray-500)' }}>No tasks yet</p>
                  )}
                </div>

                {/* Recent Transactions */}
                <div>
                  <h3 style={{ marginBottom: '1rem' }}>Recent Transactions</h3>
                  {userDetails?.transactions?.length > 0 ? (
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Amount</th>
                          <th>Status</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userDetails.transactions.map((txn: any) => (
                          <tr key={txn.id}>
                            <td>{txn.type.replace(/_/g, ' ')}</td>
                            <td>₦{Number(txn.amount).toLocaleString()}</td>
                            <td><span className={`badge badge-${txn.status === 'COMPLETED' ? 'success' : 'warning'}`}>{txn.status}</span></td>
                            <td>{new Date(txn.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p style={{ color: 'var(--gray-500)' }}>No transactions yet</p>
                  )}
                </div>
              </>
            )}
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
