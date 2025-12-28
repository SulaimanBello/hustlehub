import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { admin } from '../lib/api';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Transactions() {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const limit = 20;

  const { data, isLoading, error } = useQuery({
    queryKey: ['transactions', page, typeFilter, statusFilter],
    queryFn: () => admin.getTransactions({ page, limit, type: typeFilter, status: statusFilter }).then(res => res.data.data),
  });

  if (error) {
    return (
      <div className="card" style={{ color: 'var(--danger)' }}>
        Error loading transactions: {(error as any).message}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Transactions</h1>
      </div>

      {/* Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div className="card">
          <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginBottom: '0.5rem' }}>
            Total Transactions
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
            {data?.pagination?.total || 0}
          </div>
        </div>
        <div className="card">
          <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginBottom: '0.5rem' }}>
            Pending
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--warning)' }}>
            {data?.transactions?.filter((t: any) => t.status === 'PENDING').length || 0}
          </div>
        </div>
        <div className="card">
          <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginBottom: '0.5rem' }}>
            Completed
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--success)' }}>
            {data?.transactions?.filter((t: any) => t.status === 'COMPLETED').length || 0}
          </div>
        </div>
        <div className="card">
          <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginBottom: '0.5rem' }}>
            Failed
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--danger)' }}>
            {data?.transactions?.filter((t: any) => t.status === 'FAILED').length || 0}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <select
            className="input"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            style={{ width: '200px' }}
          >
            <option value="">All Types</option>
            <option value="ESCROW_HOLD">Escrow Hold</option>
            <option value="ESCROW_RELEASE">Escrow Release</option>
            <option value="TASK_PAYMENT">Task Payment</option>
            <option value="WITHDRAWAL">Withdrawal</option>
            <option value="REFUND">Refund</option>
          </select>
          <select
            className="input"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            style={{ width: '150px' }}
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="card">
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>Loading transactions...</div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Transaction ID</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>User</th>
                    <th>Date</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.transactions?.map((txn: any) => (
                    <tr key={txn.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                        {txn.id.substring(0, 8)}...
                      </td>
                      <td>
                        <span className={`badge badge-${getTypeColor(txn.type)}`}>
                          {txn.type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500 }}>
                        <span style={{ color: getAmountColor(txn.type) }}>
                          {getAmountSign(txn.type)}₦{Number(txn.amount).toLocaleString()}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${getStatusColor(txn.status)}`}>
                          {txn.status}
                        </span>
                      </td>
                      <td>
                        <div>{txn.user_name || '-'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                          {txn.user_phone}
                        </div>
                      </td>
                      <td>
                        <div>{new Date(txn.created_at).toLocaleDateString()}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                          {new Date(txn.created_at).toLocaleTimeString()}
                        </div>
                      </td>
                      <td>
                        {txn.metadata && (
                          <details>
                            <summary style={{ cursor: 'pointer', color: 'var(--primary)' }}>
                              View
                            </summary>
                            <pre style={{
                              fontSize: '0.75rem',
                              backgroundColor: 'var(--gray-50)',
                              padding: '0.5rem',
                              borderRadius: '4px',
                              marginTop: '0.5rem',
                              overflow: 'auto',
                              maxWidth: '300px'
                            }}>
                              {JSON.stringify(txn.metadata, null, 2)}
                            </pre>
                          </details>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data?.pagination && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '1.5rem',
                paddingTop: '1.5rem',
                borderTop: '1px solid var(--gray-200)'
              }}>
                <div style={{ color: 'var(--gray-600)' }}>
                  Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, data.pagination.total)} of {data.pagination.total} transactions
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
    </div>
  );
}

function getTypeColor(type: string): string {
  switch (type) {
    case 'ESCROW_HOLD':
      return 'warning';
    case 'ESCROW_RELEASE':
      return 'success';
    case 'TASK_PAYMENT':
      return 'info';
    case 'WITHDRAWAL':
      return 'danger';
    case 'REFUND':
      return 'info';
    default:
      return 'info';
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'warning';
    case 'COMPLETED':
      return 'success';
    case 'FAILED':
      return 'danger';
    default:
      return 'info';
  }
}

function getAmountSign(type: string): string {
  // Negative for outgoing, positive for incoming
  if (type === 'ESCROW_HOLD' || type === 'TASK_PAYMENT' || type === 'WITHDRAWAL') {
    return '-';
  }
  return '+';
}

function getAmountColor(type: string): string {
  if (type === 'ESCROW_HOLD' || type === 'TASK_PAYMENT' || type === 'WITHDRAWAL') {
    return 'var(--danger)';
  }
  return 'var(--success)';
}
