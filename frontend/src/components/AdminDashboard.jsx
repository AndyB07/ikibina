import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit, Trash2, Shield, User, Users, CheckCircle, XCircle, 
  Search, Bell, FileText, Database, Layers, Check, RefreshCw 
} from 'lucide-react';

export default function AdminDashboard({ token, user, onLogout }) {
  const [activeTab, setActiveTab] = useState('groups');
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loans, setLoans] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [groupStats, setGroupStats] = useState({ totalGroups: 0, districts: [], sectors: [] });
  const [reportData, setReportData] = useState(null);
  const [selectedReportGroupId, setSelectedReportGroupId] = useState('');
  
  // Modals
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupForm, setGroupForm] = useState({
    name: '', code: '', district: '', sector: '', cell: '', village: '', launch_date: '', launch_time: '', status: 'active'
  });

  const [showChiefModal, setShowChiefModal] = useState(false);
  const [chiefForm, setChiefForm] = useState({ name: '', email: '', phone: '', group_id: '' });
  const [tempCredentials, setTempCredentials] = useState(null);

  const [showMemberModal, setShowMemberModal] = useState(false);
  const [selectedMemberToTransfer, setSelectedMemberToTransfer] = useState(null);
  const [transferGroupId, setTransferGroupId] = useState('');
  const [memberForm, setMemberForm] = useState({ name: '', email: '', phone: '', group_id: '' });

  const [showNotifModal, setShowNotifModal] = useState(false);
  const [notifForm, setNotifForm] = useState({ type: 'system', title: '', message: '', group_id: '' });

  const [searchQuery, setSearchQuery] = useState('');

  // Fetch functions
  const fetchData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      
      // Groups
      const groupRes = await fetch('http://localhost:5000/api/groups', { headers });
      const groupData = await groupRes.json();
      setGroups(groupData);

      // Group Stats
      const statRes = await fetch('http://localhost:5000/api/groups/statistics', { headers });
      const statData = await statRes.json();
      setGroupStats(statData);

      // Users
      const userRes = await fetch('http://localhost:5000/api/users', { headers });
      const userData = await userRes.json();
      setUsers(userData);

      // Contributions
      const contrRes = await fetch('http://localhost:5000/api/contributions', { headers });
      const contrData = await contrRes.json();
      setContributions(contrData);

      // Attendance
      const attRes = await fetch('http://localhost:5000/api/attendance', { headers });
      const attData = await attRes.json();
      setAttendance(attData);

      // Loans
      const loanRes = await fetch('http://localhost:5000/api/loans', { headers });
      const loanData = await loanRes.json();
      setLoans(loanData);

      // Audit Logs
      const auditRes = await fetch('http://localhost:5000/api/audit', { headers });
      const auditData = await auditRes.json();
      setAuditLogs(auditData);

    } catch (err) {
      console.error("Error fetching admin data:", err);
    }
  };

  const fetchReport = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const url = selectedReportGroupId 
        ? `http://localhost:5000/api/reports?group_id=${selectedReportGroupId}`
        : 'http://localhost:5000/api/reports';
      const response = await fetch(url, { headers });
      const data = await response.json();
      setReportData(data);
    } catch (err) {
      console.error("Error fetching report:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchReport();
    }
  }, [activeTab, selectedReportGroupId]);

  // Group Handlers
  const handleGroupSubmit = async (e) => {
    e.preventDefault();
    try {
      const headers = { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      const method = selectedGroup ? 'PUT' : 'POST';
      const url = selectedGroup 
        ? `http://localhost:5000/api/groups/${selectedGroup.id}`
        : 'http://localhost:5000/api/groups';

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(groupForm)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Error saving group');
      
      setShowGroupModal(false);
      setSelectedGroup(null);
      setGroupForm({ name: '', code: '', district: '', sector: '', cell: '', village: '', launch_date: '', launch_time: '', status: 'active' });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleGroupStatusToggle = async (groupId, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      const response = await fetch(`http://localhost:5000/api/groups/${groupId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: nextStatus })
      });
      if (response.ok) fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleGroupDelete = async (groupId) => {
    if (!confirm('Are you sure you want to delete this group? All logs and memberships will be unlinked.')) return;
    try {
      await fetch(`http://localhost:5000/api/groups/${groupId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // Chief Handlers
  const handleChiefSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/users/chief', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(chiefForm)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Error registering chief');
      
      setTempCredentials(data);
      setChiefForm({ name: '', email: '', phone: '', group_id: '' });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  // Member Handlers
  const handleMemberSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/users/member', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(memberForm)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Error registering member');
      
      setTempCredentials(data);
      setMemberForm({ name: '', email: '', phone: '', group_id: '' });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUserDelete = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await fetch(`http://localhost:5000/api/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUserStatusToggle = async (userId, currentStatus) => {
    const nextStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    try {
      await fetch(`http://localhost:5000/api/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: nextStatus })
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMemberTransferSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`http://localhost:5000/api/users/${selectedMemberToTransfer.id}/transfer`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ group_id: transferGroupId })
      });
      if (response.ok) {
        setSelectedMemberToTransfer(null);
        setTransferGroupId('');
        fetchData();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handlePasswordReset = async (userId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/users/${userId}/reset-password`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      alert(`Password reset successfully. Temp password: ${data.tempPassword}`);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // Loan decision handler
  const handleLoanDecision = async (loanId, decision) => {
    const remarks = prompt(`Enter optional remarks for this loan ${decision}:`);
    try {
      const response = await fetch(`http://localhost:5000/api/loans/${loanId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ decision, remarks })
      });
      if (response.ok) fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // Notification sender
  const handleSendNotif = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/notifications', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...notifForm,
          group_id: notifForm.group_id === '' ? null : notifForm.group_id
        })
      });
      if (response.ok) {
        setShowNotifModal(false);
        setNotifForm({ type: 'system', title: '', message: '', group_id: '' });
        alert('Notification dispatched successfully');
        fetchData();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Filters
  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.sector.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const chiefsList = users.filter(u => u.role === 'chief');
  const membersList = users.filter(u => u.role === 'member');

  return (
    <div className="animate-fade-in" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Top Banner */}
      <div className="glass-panel" style={{ padding: '20px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h2 className="text-gradient" style={{ fontSize: '1.8rem', fontWeight: 800 }}>Admin Console</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            Signed in as {user.name} • system administrator
          </p>
        </div>
        <button onClick={onLogout} className="btn btn-secondary">Sign Out</button>
      </div>

      {/* Tabs */}
      <div className="tabs-bar">
        <button className={`tab-btn ${activeTab === 'groups' ? 'active' : ''}`} onClick={() => setActiveTab('groups')}>Group Registry</button>
        <button className={`tab-btn ${activeTab === 'chiefs' ? 'active' : ''}`} onClick={() => setActiveTab('chiefs')}>Chief Leadership</button>
        <button className={`tab-btn ${activeTab === 'members' ? 'active' : ''}`} onClick={() => setActiveTab('members')}>Members Database</button>
        <button className={`tab-btn ${activeTab === 'contributions' ? 'active' : ''}`} onClick={() => setActiveTab('contributions')}>All Contributions</button>
        <button className={`tab-btn ${activeTab === 'attendance' ? 'active' : ''}`} onClick={() => setActiveTab('attendance')}>Meetings & Attendance</button>
        <button className={`tab-btn ${activeTab === 'loans' ? 'active' : ''}`} onClick={() => setActiveTab('loans')}>Loan approvals</button>
        <button className={`tab-btn ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => setActiveTab('notifications')}>Announcements</button>
        <button className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>Group reports</button>
        <button className={`tab-btn ${activeTab === 'audits' ? 'active' : ''}`} onClick={() => setActiveTab('audits')}>Security logs</button>
      </div>

      {/* Search Filter */}
      {['groups', 'chiefs', 'members', 'contributions', 'loans'].includes(activeTab) && (
        <div style={{ position: 'relative', marginBottom: '20px' }}>
          <Search size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search records..."
            className="input-field"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '44px', width: '100%', maxWidth: '400px' }}
          />
        </div>
      )}

      {/* TAB CONTENTS */}

      {/* 1. Groups */}
      {activeTab === 'groups' && (
        <div>
          <div className="dashboard-grid">
            <div className="glass-panel dashboard-card">
              <span className="card-label">Total Groups</span>
              <span className="card-value">{groupStats.totalGroups}</span>
            </div>
            <div className="glass-panel dashboard-card">
              <span className="card-label">Districts Represented</span>
              <span className="card-value">{groupStats.districts?.length || 0}</span>
            </div>
            <div className="glass-panel dashboard-card">
              <span className="card-label">Sectors Represented</span>
              <span className="card-value">{groupStats.sectors?.length || 0}</span>
            </div>
          </div>

          <div className="flex-between" style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Registered Ikibina Groups</h3>
            <button className="btn btn-primary" onClick={() => {
              setSelectedGroup(null);
              setGroupForm({ name: '', code: '', district: '', sector: '', cell: '', village: '', launch_date: '', launch_time: '', status: 'active' });
              setShowGroupModal(true);
            }}>
              <Plus size={16} /> Create New Group
            </button>
          </div>

          <div className="glass-panel table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Group Code</th>
                  <th>Name</th>
                  <th>District / Sector</th>
                  <th>Cell / Village</th>
                  <th>Launch Timestamp</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredGroups.map(g => (
                  <tr key={g.id}>
                    <td style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{g.code}</td>
                    <td>{g.name}</td>
                    <td>{g.district} &gt; {g.sector}</td>
                    <td>{g.cell} &gt; {g.village}</td>
                    <td>{g.launch_date} • {g.launch_time}</td>
                    <td>
                      <span className={`badge badge-${g.status}`}>{g.status}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button className="btn btn-secondary btn-icon" onClick={() => {
                          setSelectedGroup(g);
                          setGroupForm({ ...g });
                          setShowGroupModal(true);
                        }}><Edit size={14} /></button>
                        <button className="btn btn-secondary btn-icon" onClick={() => handleGroupStatusToggle(g.id, g.status)}>
                          {g.status === 'active' ? <XCircle size={14} style={{ color: 'var(--warning)' }} /> : <CheckCircle size={14} style={{ color: 'var(--success)' }} />}
                        </button>
                        <button className="btn btn-secondary btn-icon" onClick={() => handleGroupDelete(g.id)}>
                          <Trash2 size={14} style={{ color: 'var(--danger)' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. Chiefs */}
      {activeTab === 'chiefs' && (
        <div>
          <div className="flex-between" style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Group Leaders (Chiefs)</h3>
            <button className="btn btn-primary" onClick={() => setShowChiefModal(true)}>
              <Plus size={16} /> Register New Chief
            </button>
          </div>

          <div className="glass-panel table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Chief Name</th>
                  <th>Email</th>
                  <th>Phone Number</th>
                  <th>Assigned Group</th>
                  <th>Joined Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {chiefsList.map(c => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{c.email}</td>
                    <td>{c.phone}</td>
                    <td style={{ fontWeight: 500 }}>{c.group_name || 'Unassigned'}</td>
                    <td>{new Date(c.created_at).toLocaleDateString()}</td>
                    <td><span className="badge badge-active">{c.status}</span></td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button className="btn btn-secondary btn-icon" onClick={() => handlePasswordReset(c.id)}>Reset Pass</button>
                        <button className="btn btn-secondary btn-icon" onClick={() => handleUserDelete(c.id)}>
                          <Trash2 size={14} style={{ color: 'var(--danger)' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Members */}
      {activeTab === 'members' && (
        <div>
          <div className="flex-between" style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>General Members</h3>
            <button className="btn btn-primary" onClick={() => setShowMemberModal(true)}>
              <Plus size={16} /> Create & Assign Member
            </button>
          </div>

          <div className="glass-panel table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Member Name</th>
                  <th>Email</th>
                  <th>Phone Number</th>
                  <th>Group Name</th>
                  <th>Account Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {membersList.map(m => (
                  <tr key={m.id}>
                    <td>{m.name}</td>
                    <td>{m.email}</td>
                    <td>{m.phone}</td>
                    <td style={{ fontWeight: 500 }}>{m.group_name || 'Unassigned'}</td>
                    <td><span className={`badge badge-${m.status}`}>{m.status}</span></td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button className="btn btn-secondary btn-icon" onClick={() => {
                          setSelectedMemberToTransfer(m);
                          setTransferGroupId(m.group_id || '');
                        }}>Transfer Group</button>
                        <button className="btn btn-secondary btn-icon" onClick={() => handlePasswordReset(m.id)}>Reset Pass</button>
                        <button className="btn btn-secondary btn-icon" onClick={() => handleUserStatusToggle(m.id, m.status)}>
                          {m.status === 'suspended' ? 'Activate' : 'Suspend'}
                        </button>
                        <button className="btn btn-secondary btn-icon" onClick={() => handleUserDelete(m.id)}>
                          <Trash2 size={14} style={{ color: 'var(--danger)' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Contributions */}
      {activeTab === 'contributions' && (
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>Global Contributions Tracker</h3>
          <div className="glass-panel table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Member Name</th>
                  <th>Group Code</th>
                  <th>Week Number</th>
                  <th>Amount</th>
                  <th>Payment Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {contributions.map(c => (
                  <tr key={c.id}>
                    <td>TRX-{c.id}</td>
                    <td>{c.member_name}</td>
                    <td>{c.group_name}</td>
                    <td>Week {c.week_number}</td>
                    <td style={{ fontWeight: 600 }}>RWF {parseFloat(c.amount).toLocaleString()}</td>
                    <td>{c.payment_date ? new Date(c.payment_date).toLocaleString() : '-'}</td>
                    <td><span className={`badge badge-${c.status}`}>{c.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Attendance */}
      {activeTab === 'attendance' && (
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>Meetings & Attendance Log</h3>
          <div className="glass-panel table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Meeting Date</th>
                  <th>Group Code</th>
                  <th>Member Name</th>
                  <th>Attendance Status</th>
                  <th>Fines Generated</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map(a => (
                  <tr key={a.id}>
                    <td>{new Date(a.meeting_date).toLocaleDateString()} • {a.meeting_time}</td>
                    <td>{a.group_name}</td>
                    <td>{a.member_name}</td>
                    <td>
                      <span className={`badge badge-${a.status === 'present' ? 'active' : 'suspended'}`}>
                        {a.status}
                      </span>
                    </td>
                    <td>
                      {a.fine_amount > 0 ? (
                        <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
                          RWF {parseFloat(a.fine_amount).toLocaleString()} ({a.fine_status})
                        </span>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Loans */}
      {activeTab === 'loans' && (
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>Loan applications</h3>
          <div className="glass-panel table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>App Date</th>
                  <th>Member</th>
                  <th>Group</th>
                  <th>Principal Amount</th>
                  <th>Purpose</th>
                  <th>Monthly Installment</th>
                  <th>Status</th>
                  <th>Repay Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loans.map(l => (
                  <tr key={l.id}>
                    <td>{new Date(l.created_at).toLocaleDateString()}</td>
                    <td>{l.member_name}</td>
                    <td>{l.group_name}</td>
                    <td style={{ fontWeight: 700 }}>RWF {parseFloat(l.amount).toLocaleString()}</td>
                    <td>{l.purpose}</td>
                    <td>RWF {parseFloat(l.monthly_installment).toLocaleString()}</td>
                    <td>
                      <span className={`badge badge-${l.status}`}>
                        {l.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${l.repayment_status}`}>
                        {l.repayment_status.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {l.status === 'pending_admin' ? (
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button className="btn btn-success btn-icon" onClick={() => handleLoanDecision(l.id, 'approve')}>Approve</button>
                          <button className="btn btn-danger btn-icon" onClick={() => handleLoanDecision(l.id, 'reject')}>Reject</button>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>Finalized</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. Notifications */}
      {activeTab === 'notifications' && (
        <div>
          <div className="flex-between" style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Announcements board</h3>
            <button className="btn btn-primary" onClick={() => setShowNotifModal(true)}>
              <Plus size={16} /> Send System Notification
            </button>
          </div>

          {/* Simple notifications audit preview */}
          <p style={{ color: 'var(--text-secondary)', marginBottom: '10px' }}>
            Notifications are dispatched to group boards or system-wide instantly.
          </p>
        </div>
      )}

      {/* 8. Reports */}
      {activeTab === 'reports' && (
        <div>
          <div className="flex-between" style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Financial & Performance Reports</h3>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>Filter by Group:</span>
              <select 
                className="input-field select-field" 
                value={selectedReportGroupId} 
                onChange={(e) => setSelectedReportGroupId(e.target.value)}
                style={{ padding: '8px 40px 8px 16px' }}
              >
                <option value="">All Groups (Combined)</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          </div>

          {reportData ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              {/* Report Stats Grid */}
              <div className="dashboard-grid">
                <div className="glass-panel dashboard-card">
                  <span className="card-label">Active Members</span>
                  <span className="card-value">{reportData.members}</span>
                </div>
                <div className="glass-panel dashboard-card">
                  <span className="card-label">Total Group Savings</span>
                  <span className="card-value" style={{ color: 'var(--success)' }}>RWF {reportData.savings?.toLocaleString()}</span>
                </div>
                <div className="glass-panel dashboard-card">
                  <span className="card-label">Total Loans Disbursed</span>
                  <span className="card-value" style={{ color: 'var(--warning)' }}>RWF {reportData.loans?.total_disbursed?.toLocaleString()}</span>
                </div>
              </div>

              {/* Graphical representation mockups using CSS */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* Contribution Status */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h4 style={{ fontWeight: 700, marginBottom: '16px' }}>Contributions Summary</h4>
                  <div className="bar-chart-container">
                    <div className="chart-bar-row">
                      <div className="chart-bar-label-row">
                        <span>Paid (RWF {reportData.contributions?.total_paid?.toLocaleString()})</span>
                        <span>{reportData.contributions?.paid_count} records</span>
                      </div>
                      <div className="chart-bar-bg">
                        <div className="chart-bar-fill" style={{ width: `${(reportData.contributions?.paid_count / (reportData.contributions?.paid_count + reportData.contributions?.pending_count + reportData.contributions?.missed_count || 1)) * 100}%`, background: 'var(--success)' }} />
                      </div>
                    </div>
                    <div className="chart-bar-row">
                      <div className="chart-bar-label-row">
                        <span>Pending (RWF {reportData.contributions?.total_pending?.toLocaleString()})</span>
                        <span>{reportData.contributions?.pending_count} records</span>
                      </div>
                      <div className="chart-bar-bg">
                        <div className="chart-bar-fill" style={{ width: `${(reportData.contributions?.pending_count / (reportData.contributions?.paid_count + reportData.contributions?.pending_count + reportData.contributions?.missed_count || 1)) * 100}%`, background: 'var(--warning)' }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Attendance Performance */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h4 style={{ fontWeight: 700, marginBottom: '16px' }}>Attendance Rates</h4>
                  <div className="flex-between" style={{ marginBottom: '20px' }}>
                    <span>General Attendance Rate:</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-primary)' }}>{reportData.attendance?.rate}%</span>
                  </div>
                  <div className="bar-chart-container">
                    <div className="chart-bar-row">
                      <div className="chart-bar-label-row">
                        <span>Present ({reportData.attendance?.present})</span>
                      </div>
                      <div className="chart-bar-bg">
                        <div className="chart-bar-fill" style={{ width: `${(reportData.attendance?.present / (reportData.attendance?.total || 1)) * 100}%`, background: 'var(--success)' }} />
                      </div>
                    </div>
                    <div className="chart-bar-row">
                      <div className="chart-bar-label-row">
                        <span>Late ({reportData.attendance?.late})</span>
                      </div>
                      <div className="chart-bar-bg">
                        <div className="chart-bar-fill" style={{ width: `${(reportData.attendance?.late / (reportData.attendance?.total || 1)) * 100}%`, background: 'var(--info)' }} />
                      </div>
                    </div>
                    <div className="chart-bar-row">
                      <div className="chart-bar-label-row">
                        <span>Absent ({reportData.attendance?.absent})</span>
                      </div>
                      <div className="chart-bar-bg">
                        <div className="chart-bar-fill" style={{ width: `${(reportData.attendance?.absent / (reportData.attendance?.total || 1)) * 100}%`, background: 'var(--danger)' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p>Loading reports data...</p>
          )}
        </div>
      )}

      {/* 9. Audits */}
      {activeTab === 'audits' && (
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>Security Audit History</h3>
          <div className="glass-panel table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Initiator</th>
                  <th>Action Category</th>
                  <th>Affected Group</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map(a => (
                  <tr key={a.id}>
                    <td>{new Date(a.created_at).toLocaleString()}</td>
                    <td style={{ fontWeight: 600 }}>{a.username}</td>
                    <td>
                      <span className="badge badge-member">{a.action}</span>
                    </td>
                    <td>{a.group_name || 'System / All'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{a.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODALS */}

      {/* Group Modal */}
      {showGroupModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <h3 style={{ marginBottom: '20px', fontWeight: 700 }}>{selectedGroup ? 'Edit Group details' : 'Register New Ikibina Group'}</h3>
            <form onSubmit={handleGroupSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label className="form-label">Group Name</label>
                  <input type="text" className="input-field" required value={groupForm.name} onChange={(e) => setGroupForm({...groupForm, name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Group Unique Code</label>
                  <input type="text" className="input-field" required placeholder="G-CODE-###" value={groupForm.code} onChange={(e) => setGroupForm({...groupForm, code: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">District</label>
                  <input type="text" className="input-field" required value={groupForm.district} onChange={(e) => setGroupForm({...groupForm, district: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Sector</label>
                  <input type="text" className="input-field" required value={groupForm.sector} onChange={(e) => setGroupForm({...groupForm, sector: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Cell</label>
                  <input type="text" className="input-field" required value={groupForm.cell} onChange={(e) => setGroupForm({...groupForm, cell: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Village</label>
                  <input type="text" className="input-field" required value={groupForm.village} onChange={(e) => setGroupForm({...groupForm, village: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Launch Date</label>
                  <input type="date" className="input-field" required value={groupForm.launch_date} onChange={(e) => setGroupForm({...groupForm, launch_date: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Launch Time</label>
                  <input type="time" className="input-field" required value={groupForm.launch_time} onChange={(e) => setGroupForm({...groupForm, launch_time: e.target.value})} />
                </div>
              </div>
              <div className="form-group" style={{ marginTop: '15px' }}>
                <label className="form-label">Group Status</label>
                <select className="input-field select-field" value={groupForm.status} onChange={(e) => setGroupForm({...groupForm, status: e.target.value})}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowGroupModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Group</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Chief Registration Modal */}
      {showChiefModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <h3 style={{ marginBottom: '20px', fontWeight: 700 }}>Register Group Chief</h3>
            
            {tempCredentials ? (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid var(--success)', padding: '16px', borderRadius: '10px', marginBottom: '20px' }}>
                  <h4 style={{ color: 'var(--success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Check size={18} /> Credentials Generated Successfully!
                  </h4>
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: '8px' }}>
                    System auto-assigned role <strong>Chief</strong>. Send the credentials below to the leader.
                  </p>
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', marginTop: '12px', fontFamily: 'monospace', fontSize: 'var(--font-size-sm)' }}>
                    <div><strong>Email:</strong> {tempCredentials.email}</div>
                    <div><strong>Temporary Password:</strong> {tempCredentials.tempPassword}</div>
                  </div>
                </div>
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => {
                  setTempCredentials(null);
                  setShowChiefModal(false);
                }}>Done</button>
              </div>
            ) : (
              <form onSubmit={handleChiefSubmit}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input type="text" className="input-field" required value={chiefForm.name} onChange={(e) => setChiefForm({...chiefForm, name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input type="email" className="input-field" placeholder="example@ikibina.com" required value={chiefForm.email} onChange={(e) => setChiefForm({...chiefForm, email: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input type="text" className="input-field" placeholder="+25078..." required value={chiefForm.phone} onChange={(e) => setChiefForm({...chiefForm, phone: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Assign to Ikibina Group</label>
                  <select className="input-field select-field" required value={chiefForm.group_id} onChange={(e) => setChiefForm({...chiefForm, group_id: e.target.value})}>
                    <option value="">Select Group...</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name} ({g.code})</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowChiefModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Register Chief</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Member Registration Modal */}
      {showMemberModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <h3 style={{ marginBottom: '20px', fontWeight: 700 }}>Register Group Member</h3>
            
            {tempCredentials ? (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid var(--success)', padding: '16px', borderRadius: '10px', marginBottom: '20px' }}>
                  <h4 style={{ color: 'var(--success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Check size={18} /> Member registered & Contribution Schedule Configured!
                  </h4>
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: '8px' }}>
                    Auto-assigned role <strong>Member</strong>. Send these credentials to the user.
                  </p>
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', marginTop: '12px', fontFamily: 'monospace', fontSize: 'var(--font-size-sm)' }}>
                    <div><strong>Email:</strong> {tempCredentials.email}</div>
                    <div><strong>Temporary Password:</strong> {tempCredentials.tempPassword}</div>
                  </div>
                </div>
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => {
                  setTempCredentials(null);
                  setShowMemberModal(false);
                }}>Done</button>
              </div>
            ) : (
              <form onSubmit={handleMemberSubmit}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input type="text" className="input-field" required value={memberForm.name} onChange={(e) => setMemberForm({...memberForm, name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input type="email" className="input-field" placeholder="example@mail.com" required value={memberForm.email} onChange={(e) => setMemberForm({...memberForm, email: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input type="text" className="input-field" placeholder="+25078..." required value={memberForm.phone} onChange={(e) => setMemberForm({...memberForm, phone: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Assign to Ikibina Group</label>
                  <select className="input-field select-field" required value={memberForm.group_id} onChange={(e) => setMemberForm({...memberForm, group_id: e.target.value})}>
                    <option value="">Select Group...</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name} ({g.code})</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowMemberModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Create & Assign Member</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Transfer Group Modal */}
      {selectedMemberToTransfer && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ maxWidth: '450px' }}>
            <h3 style={{ marginBottom: '16px', fontWeight: 700 }}>Transfer Member</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: '20px' }}>
              Select target Ikibina group to transfer <strong>{selectedMemberToTransfer.name}</strong>. Ongoing pending contributions will move.
            </p>
            <form onSubmit={handleMemberTransferSubmit}>
              <div className="form-group">
                <label className="form-label">Target Group</label>
                <select className="input-field select-field" required value={transferGroupId} onChange={(e) => setTransferGroupId(e.target.value)}>
                  <option value="">Select target...</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name} ({g.code})</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedMemberToTransfer(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Complete Transfer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notification dispatch Modal */}
      {showNotifModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ maxWidth: '500px' }}>
            <h3 style={{ marginBottom: '20px', fontWeight: 700 }}>Broadcast Announcement</h3>
            <form onSubmit={handleSendNotif}>
              <div className="form-group">
                <label className="form-label">Recipient Scope</label>
                <select className="input-field select-field" value={notifForm.group_id} onChange={(e) => setNotifForm({...notifForm, group_id: e.target.value})}>
                  <option value="">System Wide (All Groups & Users)</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>Group: {g.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="input-field select-field" value={notifForm.type} onChange={(e) => setNotifForm({...notifForm, type: e.target.value})}>
                  <option value="system">System Notification</option>
                  <option value="payment_reminder">Payment Reminder</option>
                  <option value="meeting_reminder">Meeting Reminder</option>
                  <option value="emergency">Emergency Alert</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input type="text" className="input-field" required placeholder="Header text" value={notifForm.title} onChange={(e) => setNotifForm({...notifForm, title: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Message Details</label>
                <textarea rows={4} className="input-field" required placeholder="Detailed message..." value={notifForm.message} onChange={(e) => setNotifForm({...notifForm, message: e.target.value})} style={{ fontFamily: 'inherit', resize: 'none' }} />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowNotifModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Dispatch Announcement</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
