import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const AuditLogs = () => {
  const { token } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/factory/audit-logs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (error) {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action) => {
    if (action.includes('Payment')) return <span className="badge badge-success">{action}</span>;
    if (action.includes('Alert')) return <span className="badge badge-danger">{action}</span>;
    if (action.includes('Login')) return <span className="badge badge-info">{action}</span>;
    return <span className="badge badge-warning">{action}</span>;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2>System Audit Logs</h2>
        <button className="btn btn-primary" onClick={fetchLogs}>Refresh Logs</button>
      </div>

      <div className="card table-container">
        {loading ? <p>Loading...</p> : (
          <table className="table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Role</th>
                <th>Action</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan="5" className="text-center text-muted">No logs recorded yet.</td></tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id}>
                    <td>{new Date(log.createdAt).toLocaleString()}</td>
                    <td style={{ fontWeight: 600 }}>{log.userName || 'System'}</td>
                    <td><span className="badge">{log.role || 'N/A'}</span></td>
                    <td>{getActionBadge(log.action)}</td>
                    <td className="text-muted" style={{ fontSize: '0.9rem' }}>{log.details || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
