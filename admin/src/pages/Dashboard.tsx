import { useQuery } from '@tanstack/react-query';
import { admin } from '../lib/api';

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => admin.getDashboard().then(res => res.data.data),
  });

  if (isLoading) {
    return <div>Loading dashboard...</div>;
  }

  if (error) {
    return <div style={{ color: 'var(--danger)' }}>Error loading dashboard</div>;
  }

  const { users, tasks, transactions } = data || {};

  return (
    <div>
      <h1 style={{ marginBottom: '2rem' }}>Dashboard</h1>

      {/* Metrics Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        <MetricCard
          title="Total Users"
          value={users?.total_users || 0}
          subtitle={`${users?.new_users_week || 0} new this week`}
        />
        <MetricCard
          title="Active Tasks"
          value={tasks?.active_tasks || 0}
          subtitle={`${tasks?.posted_tasks || 0} posted`}
        />
        <MetricCard
          title="Total Tasks"
          value={tasks?.total_tasks || 0}
          subtitle={`${tasks?.paid_tasks || 0} completed`}
        />
        <MetricCard
          title="Total Paid Out"
          value={`₦${Number(transactions?.total_paid_out || 0).toLocaleString()}`}
          subtitle="Escrow releases"
        />
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h2 style={{ marginBottom: '1rem' }}>Recent Tasks</h2>
        {data?.recent_activity?.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Fee</th>
                <th>Posted By</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {data.recent_activity.map((task: any) => (
                <tr key={task.id}>
                  <td>{task.title}</td>
                  <td>
                    <span className={`badge badge-${getStatusColor(task.status)}`}>
                      {task.status}
                    </span>
                  </td>
                  <td>₦{Number(task.fee_amount).toLocaleString()}</td>
                  <td>{task.poster_name || task.poster_phone}</td>
                  <td>{new Date(task.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: 'var(--gray-500)' }}>No recent activity</p>
        )}
      </div>
    </div>
  );
}

function MetricCard({ title, value, subtitle }: {
  title: string;
  value: string | number;
  subtitle: string;
}) {
  return (
    <div className="card">
      <div style={{ color: 'var(--gray-600)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
        {title}
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
        {value}
      </div>
      <div style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>
        {subtitle}
      </div>
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
