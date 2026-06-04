import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit, Trash2, Shield, User, Users, CheckCircle, XCircle, 
  Search, Bell, FileText, Database, Layers, Check, Calendar, Award, AlertTriangle, Download, Phone, Eye, EyeOff
} from 'lucide-react';
import ChatWindow from './ChatWindow';
import { useLang } from '../context/LangContext';

function QuickPayForm({ onPay, contributions, fines, loans, userId }) {
  const [type, setType] = useState('contribution');
  const [provider, setProvider] = useState('MTN');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');

  const getFirstTarget = () => {
    if (type === 'contribution') return contributions.filter(c => c.member_id === userId && c.status === 'pending')[0] || null;
    if (type === 'fine') return fines.filter(f => f.member_id === userId && f.status === 'unpaid')[0] || null;
    return loans.filter(l => l.member_id === userId && l.status === 'approved' && l.repayment_status !== 'fully_paid')[0] || null;
  };

  const handleTypeChange = (newType) => {
    setType(newType);
    setAmount('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const target = getFirstTarget();
    const amt = parseFloat(amount);
    if (!target) { alert(`No ${type.replace(/_/g, ' ')} record found to pay.`); return; }
    if (isNaN(amt) || amt <= 0) { alert('Please enter a valid amount.'); return; }
    if (!phone) { alert('Please enter your phone number.'); return; }
    onPay(type, target.id, amt, `${type.replace(/_/g, ' ')}`, null, provider, phone);
    setAmount('');
    setPhone('');
  };

  const target = getFirstTarget();
  const suggestedAmt = target ? (type === 'loan_repayment' ? target.monthly_installment : target.amount) : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label className="form-label">Select Provider</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
          <div
            onClick={() => setProvider('MTN')}
            style={{
              padding: '14px 10px', borderRadius: '12px', cursor: 'pointer', textAlign: 'center', fontWeight: 700,
              border: `2px solid ${provider === 'MTN' ? '#f59e0b' : 'var(--border-glass)'}`,
              background: provider === 'MTN' ? 'rgba(245,158,11,0.12)' : 'rgba(0,0,0,0.1)',
              color: provider === 'MTN' ? '#fbbf24' : 'var(--text-secondary)',
              transition: 'all 0.2s'
            }}
          >
            MTN MoMo
          </div>
          <div
            onClick={() => setProvider('Airtel')}
            style={{
              padding: '14px 10px', borderRadius: '12px', cursor: 'pointer', textAlign: 'center', fontWeight: 700,
              border: `2px solid ${provider === 'Airtel' ? '#ef4444' : 'var(--border-glass)'}`,
              background: provider === 'Airtel' ? 'rgba(239,68,68,0.12)' : 'rgba(0,0,0,0.1)',
              color: provider === 'Airtel' ? '#f87171' : 'var(--text-secondary)',
              transition: 'all 0.2s'
            }}
          >
            Airtel Money
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '12px', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Payment Type</label>
          <select className="input-field select-field" value={type} onChange={(e) => handleTypeChange(e.target.value)}>
            <option value="contribution">Contribution</option>
            <option value="fine">Fine</option>
            <option value="loan_repayment">Loan Repayment</option>
          </select>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Phone ({provider === 'MTN' ? '078/079' : '072/073'})</label>
          <input
            type="tel" required className="input-field"
            placeholder={provider === 'MTN' ? '0788123456' : '0728123456'}
            value={phone} onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Amount (RWF)</label>
          <input
            type="number" required min="1" className="input-field"
            placeholder={suggestedAmt ? `Suggested: ${parseFloat(suggestedAmt).toLocaleString()}` : 'Enter amount'}
            value={amount} onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-success" style={{ padding: '11px 20px', whiteSpace: 'nowrap' }}>
          💳 Pay Now
        </button>
      </form>

      {!target && (
        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          ⚠️ No pending {type.replace(/_/g, ' ')} found. Switch type or use the cards above.
        </p>
      )}
    </div>
  );
}

export default function ChiefDashboard({ token, user, onLogout }) {
  const { t } = useLang();
  const [activeTab, setActiveTab] = useState('members');
  const [members, setMembers] = useState([]);
  const [group, setGroup] = useState(null);
  const [contributions, setContributions] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loans, setLoans] = useState([]);
  const [fines, setFines] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [report, setReport] = useState(null);
  
  // Modals
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberForm, setMemberForm] = useState({ name: '', email: '', phone: '' });
  const [tempCredentials, setTempCredentials] = useState(null);

  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetingForm, setMeetingForm] = useState({ meeting_date: '', meeting_time: '', notes: '' });

  const [showMarkAttendanceModal, setShowMarkAttendanceModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [attendanceList, setAttendanceList] = useState([]); // Array of { member_id, status }

  const [showFineModal, setShowFineModal] = useState(false);
  const [fineForm, setFineForm] = useState({ member_id: '', type: 'rule_violation', amount: '', description: '' });

  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [winnerForm, setWinnerForm] = useState({ member_id: '', week_number: '' });

  const [showNotifModal, setShowNotifModal] = useState(false);
  const [notifForm, setNotifForm] = useState({ type: 'payment_reminder', title: '', message: '' });

  const [searchQuery, setSearchQuery] = useState('');

  // Payments Ledger and My Payments States
  const [paymentsHistory, setPaymentsHistory] = useState([]);
  const [momoStats, setMomoStats] = useState({
    MTN: { count: 0, total: 0 },
    Airtel: { count: 0, total: 0 },
    totalCollected: 0,
    totalCount: 0
  });

  // Chief Personal Payment Modal States
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState({ type: '', targetId: null, amount: 0, title: '' });
  const [selectedProvider, setSelectedProvider] = useState('MTN');
  const [paymentPhone, setPaymentPhone] = useState(user.phone || '');
  const [paymentPin, setPaymentPin] = useState('');
  const [paymentStep, setPaymentStep] = useState('input');
  const [paymentStatusText, setPaymentStatusText] = useState('');
  const [txnReference, setTxnReference] = useState('');
  const [showMomoPin, setShowMomoPin] = useState(false);

  // Payment Recording & Prompt Action Modal
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState(null); // { id, type, amount, member_id, member_name }

  // Manual Initiate Request Modal States
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [selectedRequestMember, setSelectedRequestMember] = useState('');
  const [selectedRequestTargetType, setSelectedRequestTargetType] = useState('contribution');
  const [selectedRequestTargetId, setSelectedRequestTargetId] = useState('');
  const [requestAmount, setRequestAmount] = useState('');

  // Fetch functions
  const fetchData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      
      // Get own group info
      const groupRes = await fetch('http://localhost:5000/api/groups', { headers });
      const groupData = await groupRes.json();
      if (groupData.length > 0) {
        setGroup(groupData[0]);
      }

      // Get group members
      const memberRes = await fetch('http://localhost:5000/api/users', { headers });
      const memberData = await memberRes.json();
      setMembers(memberData.filter(u => u.role === 'member'));

      // Contributions
      const contrRes = await fetch('http://localhost:5000/api/contributions', { headers });
      const contrData = await contrRes.json();
      setContributions(contrData);

      // Meetings
      const meetRes = await fetch('http://localhost:5000/api/attendance/meetings', { headers });
      const meetData = await meetRes.json();
      setMeetings(meetData);

      // Attendance Logs
      const attRes = await fetch('http://localhost:5000/api/attendance', { headers });
      const attData = await attRes.json();
      setAttendance(attData);

      // Loans
      const loanRes = await fetch('http://localhost:5000/api/loans', { headers });
      const loanData = await loanRes.json();
      setLoans(loanData);

      // Fines
      const fineRes = await fetch('http://localhost:5000/api/fines', { headers });
      const fineData = await fineRes.json();
      setFines(fineData);

      // Notifications
      const notRes = await fetch('http://localhost:5000/api/notifications', { headers });
      const notData = await notRes.json();
      setNotifications(notData);

      // Reports
      const repRes = await fetch('http://localhost:5000/api/reports', { headers });
      const repData = await repRes.json();
      setReport(repData);

      // Get group payments history
      const payRes = await fetch('http://localhost:5000/api/payments', { headers });
      if (payRes.ok) {
        const payData = await payRes.json();
        setPaymentsHistory(payData);
      }

      // Get payments stats
      const statsRes = await fetch('http://localhost:5000/api/payments/stats', { headers });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setMomoStats(statsData);
      }

    } catch (err) {
      console.error("Error fetching chief data:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Member CRUD Handlers
  const handleMemberSubmit = async (e) => {
    e.preventDefault();
    try {
      const headers = { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      const method = selectedMember ? 'PUT' : 'POST';
      const url = selectedMember 
        ? `http://localhost:5000/api/users/${selectedMember.id}`
        : 'http://localhost:5000/api/users/member';

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(memberForm)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Error saving member');
      
      if (!selectedMember) {
        setTempCredentials(data);
      } else {
        setShowMemberModal(false);
        setSelectedMember(null);
        setMemberForm({ name: '', email: '', phone: '' });
      }
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleMemberDelete = async (memberId) => {
    if (!confirm('Are you sure you want to remove this member from the group?')) return;
    try {
      await fetch(`http://localhost:5000/api/users/${memberId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMemberStatusToggle = async (memberId, currentStatus) => {
    const nextStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    try {
      await fetch(`http://localhost:5000/api/users/${memberId}/status`, {
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

  const handlePasswordReset = async (memberId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/users/${memberId}/reset-password`, {
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

  // Record Direct Offline Contribution
  const handleRecordPayment = async (contribId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/contributions/${contribId}/pay`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setShowActionModal(false);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Record Direct Offline Fine
  const handleRecordFinePaid = async (fineId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/fines/${fineId}/pay`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setShowActionModal(false);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Send MoMo payment request prompt to member
  const handleSendMoMoPrompt = async (memberId, paymentType, targetId, amount) => {
    try {
      const response = await fetch('http://localhost:5000/api/payments/request-prompt', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          member_id: memberId,
          payment_type: paymentType,
          target_id: targetId,
          amount: parseFloat(amount)
        })
      });
      if (response.ok) {
        alert("Mobile Money payment request prompted to member!");
        setShowActionModal(false);
        setShowPromptModal(false);
        fetchData();
      } else {
        const data = await response.json();
        alert(data.message || "Failed to send payment prompt");
      }
    } catch (err) {
      console.error(err);
      alert("Error sending request");
    }
  };

  // Open Chief Personal MoMo Payment Modal
  const openChiefPaymentModal = (type, targetId, amount, title, isPendingRequest = null, quickProvider = null, quickPhone = null) => {
    setPaymentDetails({ type, targetId, amount, title });
    setSelectedProvider(quickProvider || 'MTN');
    setPaymentPhone(quickPhone || user.phone || '');
    setPaymentPin('');
    setPaymentStep('input');
    setPaymentStatusText('');
    setTxnReference('');
    setShowMomoPin(false);
    setShowPaymentModal(true);
  };

  // Chief Personal MoMo Payment Submission
  const handleChiefPaymentSubmit = async (e) => {
    e.preventDefault();
    if (!paymentPhone) {
      alert("Please enter a phone number");
      return;
    }
    if (!/^\d{4}$/.test(paymentPin)) {
      alert("Please enter a valid 4-digit PIN");
      return;
    }

    setPaymentStep('processing');
    
    try {
      setPaymentStatusText(`Initiating ${selectedProvider} MoMo prompt...`);
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setPaymentStatusText("Awaiting customer authorization PIN on device...");
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setPaymentStatusText("Reconciling transaction with telco gateway...");
      await new Promise(resolve => setTimeout(resolve, 800));

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const response = await fetch('http://localhost:5000/api/payments', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          payment_type: paymentDetails.type,
          target_id: paymentDetails.targetId,
          provider: selectedProvider,
          phone_number: paymentPhone,
          amount: paymentDetails.amount
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Payment simulation failed');
      }

      setTxnReference(data.payment?.reference_number || data.reference_number || 'TXN-SUCCESS');
      setPaymentStep('success');
      fetchData();
    } catch (err) {
      console.error(err);
      setPaymentStatusText(err.message || 'Communication error with Telco server');
      setPaymentStep('error');
    }
  };

  // Meeting scheduler
  const handleMeetingSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/attendance/meetings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(meetingForm)
      });
      if (response.ok) {
        setShowMeetingModal(false);
        setMeetingForm({ meeting_date: '', meeting_time: '', notes: '' });
        fetchData();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Mark attendance modal setup
  const openAttendanceModal = async (meeting) => {
    setSelectedMeeting(meeting);
    // Find all attendance records for this meeting
    const meetingAtt = attendance.filter(a => a.meeting_id === meeting.id);
    
    // Set up standard list
    const initialList = members.map(m => {
      const existingRecord = meetingAtt.find(a => a.member_id === m.id);
      return {
        member_id: m.id,
        name: m.name,
        status: existingRecord ? existingRecord.status : 'present'
      };
    });
    
    setAttendanceList(initialList);
    setShowMarkAttendanceModal(true);
  };

  const handleMarkAttendanceSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/attendance/mark', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          meeting_id: selectedMeeting.id,
          attendance_list: attendanceList.map(a => ({ member_id: a.member_id, status: a.status }))
        })
      });
      if (response.ok) {
        setShowMarkAttendanceModal(false);
        setSelectedMeeting(null);
        fetchData();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const updateAttendanceStatus = (memberId, status) => {
    setAttendanceList(attendanceList.map(a => 
      a.member_id === memberId ? { ...a, status } : a
    ));
  };

  // Loan Recommendation
  const handleLoanRecommend = async (loanId, decision) => {
    const remarks = prompt(`Enter comments or recommendation remarks:`);
    try {
      const response = await fetch(`http://localhost:5000/api/loans/${loanId}/recommend`, {
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

  // Issue fine
  const handleFineSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/fines', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(fineForm)
      });
      if (response.ok) {
        setShowFineModal(false);
        setFineForm({ member_id: '', type: 'rule_violation', amount: '', description: '' });
        fetchData();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Designate Winner
  const handleWinnerSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/notifications/winner', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(winnerForm)
      });
      if (response.ok) {
        setShowWinnerModal(false);
        setWinnerForm({ member_id: '', week_number: '' });
        alert('Weekly Money Winner nominated successfully! Notification sent.');
        fetchData();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Send group notification
  const handleSendNotif = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/notifications', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(notifForm)
      });
      if (response.ok) {
        setShowNotifModal(false);
        setNotifForm({ type: 'payment_reminder', title: '', message: '' });
        alert('Announcement sent to your group');
        fetchData();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Filters
  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="animate-fade-in" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Top Banner */}
      <div className="glass-panel" style={{ padding: '20px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h2 className="text-gradient-purple" style={{ fontSize: '1.8rem', fontWeight: 800 }}>{t('chiefDashboard')}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            {t('group')}: {group ? `${group.name} (${group.code})` : 'Loading...'} • {t('leader')}: {user.name}
          </p>
        </div>
        <button onClick={onLogout} className="btn btn-secondary">{t('signOut')}</button>
      </div>

      {/* Stats row */}
      {report && (
        <div className="dashboard-grid">
          <div className="glass-panel dashboard-card">
            <span className="card-label">My Members</span>
            <span className="card-value">{report.members}</span>
          </div>
          <div className="glass-panel dashboard-card">
            <span className="card-label">Group Savings</span>
            <span className="card-value" style={{ color: 'var(--success)' }}>RWF {report.savings?.toLocaleString()}</span>
          </div>
          <div className="glass-panel dashboard-card">
            <span className="card-label">Attendance Rate</span>
            <span className="card-value" style={{ color: 'var(--accent-primary)' }}>{report.attendance?.rate}%</span>
          </div>
          <div className="glass-panel dashboard-card">
            <span className="card-label">Unpaid Fines</span>
            <span className="card-value" style={{ color: 'var(--danger)' }}>RWF {report.fines?.total_outstanding?.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs-bar">
        <button className={`tab-btn ${activeTab === 'members' ? 'active' : ''}`} onClick={() => setActiveTab('members')}>{t('myGroupMembers')}</button>
        <button className={`tab-btn ${activeTab === 'contributions' ? 'active' : ''}`} onClick={() => setActiveTab('contributions')}>{t('contributions')}</button>
        <button className={`tab-btn ${activeTab === 'attendance' ? 'active' : ''}`} onClick={() => setActiveTab('attendance')}>{t('meetingsAttendance')}</button>
        <button className={`tab-btn ${activeTab === 'loans' ? 'active' : ''}`} onClick={() => setActiveTab('loans')}>{t('reviewLoans')}</button>
        <button className={`tab-btn ${activeTab === 'fines' ? 'active' : ''}`} onClick={() => setActiveTab('fines')}>{t('ruleFines')}</button>
        <button className={`tab-btn ${activeTab === 'momo_ledger' ? 'active' : ''}`} onClick={() => setActiveTab('momo_ledger')}>{t('mobileLedger')}</button>
        <button className={`tab-btn ${activeTab === 'my_payments' ? 'active' : ''}`} onClick={() => setActiveTab('my_payments')} style={{ background: activeTab === 'my_payments' ? 'rgba(16,185,129,0.15)' : '', borderColor: activeTab === 'my_payments' ? 'var(--success)' : '' }}>{t('myPayments')}</button>
        <button className={`tab-btn ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => setActiveTab('notifications')}>{t('groupNotices')}</button>
        <button className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>{t('groupChat')}</button>
      </div>

      {/* TAB CONTENTS */}

      {/* 1. Members CRUD */}
      {activeTab === 'members' && (
        <div>
          <div className="flex-between" style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Group Members</h3>
            <button className="btn btn-primary" onClick={() => {
              setSelectedMember(null);
              setMemberForm({ name: '', email: '', phone: '' });
              setShowMemberModal(true);
            }}>
              <Plus size={16} /> Register New Member
            </button>
          </div>

          <div className="glass-panel table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Member Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Joined Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map(m => (
                  <tr key={m.id}>
                    <td>{m.name}</td>
                    <td>{m.email}</td>
                    <td>{m.phone}</td>
                    <td>{new Date(m.created_at).toLocaleDateString()}</td>
                    <td><span className={`badge badge-${m.status}`}>{m.status}</span></td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button className="btn btn-secondary btn-icon" onClick={() => {
                          setSelectedMember(m);
                          setMemberForm({ name: m.name, email: m.email, phone: m.phone });
                          setShowMemberModal(true);
                        }}><Edit size={14} /></button>
                        <button className="btn btn-secondary btn-icon" onClick={() => handlePasswordReset(m.id)}>Reset Pass</button>
                        <button className="btn btn-secondary btn-icon" onClick={() => handleMemberStatusToggle(m.id, m.status)}>
                          {m.status === 'suspended' ? 'Activate' : 'Suspend'}
                        </button>
                        <button className="btn btn-secondary btn-icon" onClick={() => handleMemberDelete(m.id)}>
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

      {/* 2. Contributions */}
      {activeTab === 'contributions' && (
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>Group Contributions</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: '16px' }}>
            Verify and clear member payments. Weekly contribution: RWF 5,000.
          </p>

          <div className="glass-panel table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Week</th>
                  <th>Member</th>
                  <th>Amount</th>
                  <th>Payment Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {contributions.map(c => (
                  <tr key={c.id}>
                    <td>Week {c.week_number}</td>
                    <td>{c.member_name}</td>
                    <td style={{ fontWeight: 600 }}>RWF {parseFloat(c.amount).toLocaleString()}</td>
                    <td>{c.payment_date ? new Date(c.payment_date).toLocaleString() : '-'}</td>
                    <td><span className={`badge badge-${c.status}`}>{c.status}</span></td>
                    <td style={{ textAlign: 'right' }}>
                      {c.status === 'pending' ? (
                        <button className="btn btn-success btn-icon" onClick={() => {
                          setSelectedTarget({ id: c.id, type: 'contribution', amount: c.amount, member_id: c.member_id, member_name: c.member_name });
                          setShowActionModal(true);
                        }}>
                          Record Paid
                        </button>
                      ) : (
                        <span style={{ color: 'var(--success)', fontWeight: 600 }}>Cleared</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Meetings & Attendance */}
      {activeTab === 'attendance' && (
        <div>
          <div className="flex-between" style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Scheduled Meetings</h3>
            <button className="btn btn-primary" onClick={() => setShowMeetingModal(true)}>
              <Calendar size={16} /> Schedule Meeting
            </button>
          </div>

          <div className="glass-panel table-container" style={{ marginBottom: '30px' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Meeting ID</th>
                  <th>Meeting Date</th>
                  <th>Meeting Time</th>
                  <th>Notes</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {meetings.map(m => (
                  <tr key={m.id}>
                    <td>MEET-{m.id}</td>
                    <td>{m.meeting_date}</td>
                    <td>{m.meeting_time}</td>
                    <td>{m.notes || '-'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-primary" onClick={() => openAttendanceModal(m)}>Mark Attendance</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>Attendance logs</h3>
          <div className="glass-panel table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Meeting Timestamp</th>
                  <th>Member Name</th>
                  <th>Status</th>
                  <th>Automatic Fine Trigger</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map(a => (
                  <tr key={a.id}>
                    <td>{new Date(a.meeting_date).toLocaleDateString()} • {a.meeting_time}</td>
                    <td>{a.member_name}</td>
                    <td><span className={`badge badge-${a.status === 'present' ? 'active' : 'suspended'}`}>{a.status}</span></td>
                    <td>
                      {a.fine_amount > 0 ? (
                        <span style={{ color: 'var(--danger)', fontWeight: 600 }}>RWF {parseFloat(a.fine_amount).toLocaleString()} ({a.fine_status})</span>
                      ) : 'None'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Loans */}
      {activeTab === 'loans' && (
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>Loan requests</h3>
          <div className="glass-panel table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>App Date</th>
                  <th>Member Name</th>
                  <th>Amount</th>
                  <th>Term</th>
                  <th>Purpose</th>
                  <th>Status</th>
                  <th>Repay Status</th>
                  <th style={{ textAlign: 'right' }}>Recommendation Action</th>
                </tr>
              </thead>
              <tbody>
                {loans.map(l => (
                  <tr key={l.id}>
                    <td>{new Date(l.created_at).toLocaleDateString()}</td>
                    <td>{l.member_name}</td>
                    <td style={{ fontWeight: 700 }}>RWF {parseFloat(l.amount).toLocaleString()}</td>
                    <td>{l.term_months} Months</td>
                    <td>{l.purpose}</td>
                    <td><span className={`badge badge-${l.status}`}>{l.status.replace('_', ' ')}</span></td>
                    <td><span className={`badge badge-${l.repayment_status}`}>{l.repayment_status.replace('_', ' ')}</span></td>
                    <td style={{ textAlign: 'right' }}>
                      {l.status === 'pending_chief' ? (
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button className="btn btn-success btn-icon" onClick={() => handleLoanRecommend(l.id, 'approve')}>Recommend Approve</button>
                          <button className="btn btn-danger btn-icon" onClick={() => handleLoanRecommend(l.id, 'reject')}>Reject</button>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>
                          {l.status === 'pending_admin' ? 'Recommended' : 'Finalized'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Fines */}
      {activeTab === 'fines' && (
        <div>
          <div className="flex-between" style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Disciplinary Fines</h3>
            <button className="btn btn-primary" onClick={() => setShowFineModal(true)}>
              <AlertTriangle size={16} /> Issue Custom Fine
            </button>
          </div>

          <div className="glass-panel table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Date Issued</th>
                  <th>Member Name</th>
                  <th>Fine Type</th>
                  <th>Amount</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {fines.map(f => (
                  <tr key={f.id}>
                    <td>{new Date(f.created_at).toLocaleDateString()}</td>
                    <td>{f.member_name}</td>
                    <td>
                      <span className="badge badge-member">{f.type.replace('_', ' ')}</span>
                    </td>
                    <td style={{ fontWeight: 600 }}>RWF {parseFloat(f.amount).toLocaleString()}</td>
                    <td>{f.description}</td>
                    <td><span className={`badge badge-${f.status === 'paid' ? 'active' : 'suspended'}`}>{f.status}</span></td>
                    <td style={{ textAlign: 'right' }}>
                      {f.status === 'unpaid' ? (
                        <button className="btn btn-danger btn-icon" onClick={() => {
                          setSelectedTarget({ id: f.id, type: 'fine', amount: f.amount, member_id: f.member_id, member_name: f.member_name });
                          setShowActionModal(true);
                        }}>
                          Record Clear
                        </button>
                      ) : (
                        <span style={{ color: 'var(--success)', fontWeight: 600 }}>Paid</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Mobile Money Ledger (Extra Feature) */}
      {activeTab === 'momo_ledger' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* Top stats section */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* MTN stats card */}
            <div className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid var(--warning)', position: 'relative', overflow: 'hidden' }}>
              <div className="card-label" style={{ color: 'var(--warning)' }}>MTN Mobile Money Summary</div>
              <h2 className="card-value" style={{ color: 'var(--text-primary)' }}>RWF {(momoStats.MTN?.total || 0).toLocaleString()}</h2>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: '8px' }}>
                Total Transactions: {momoStats.MTN?.count || 0}
              </div>
            </div>

            {/* Airtel stats card */}
            <div className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid var(--danger)', position: 'relative', overflow: 'hidden' }}>
              <div className="card-label" style={{ color: 'var(--danger)' }}>Airtel Money Summary</div>
              <h2 className="card-value" style={{ color: 'var(--text-primary)' }}>RWF {(momoStats.Airtel?.total || 0).toLocaleString()}</h2>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: '8px' }}>
                Total Transactions: {momoStats.Airtel?.count || 0}
              </div>
            </div>
          </div>

          {/* Ledger table card */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div className="flex-between" style={{ marginBottom: '20px' }}>
              <h3 style={{ fontWeight: 700 }}>Mobile Money Payments Ledger</h3>
              <button className="btn btn-primary" onClick={() => {
                setSelectedRequestMember('');
                setSelectedRequestTargetId('');
                setRequestAmount('');
                setShowPromptModal(true);
              }}>
                <Phone size={14} /> Send Payment Request
              </button>
            </div>

            {/* Filtering Controls */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
              <input 
                type="text" 
                placeholder="Search by member name..." 
                className="input-field" 
                style={{ flex: 1 }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Transactions Table */}
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Member</th>
                    <th>Payment Type</th>
                    <th>Provider</th>
                    <th>Phone Number</th>
                    <th>Reference</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentsHistory.filter(p => p.member_name?.toLowerCase().includes(searchQuery.toLowerCase())).map(p => (
                    <tr key={p.id}>
                      <td>{new Date(p.created_at).toLocaleString()}</td>
                      <td style={{ fontWeight: 600 }}>{p.member_name}</td>
                      <td><span className="badge badge-member">{p.payment_type.replace('_', ' ')}</span></td>
                      <td>
                        <span className="badge" style={{ 
                          background: p.provider === 'MTN' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: p.provider === 'MTN' ? '#fbbf24' : '#f87171',
                          fontWeight: 700 
                        }}>
                          {p.provider} MoMo
                        </span>
                      </td>
                      <td>{p.phone_number}</td>
                      <td style={{ fontFamily: 'monospace' }}>{p.reference_number}</td>
                      <td style={{ fontWeight: 700, color: 'var(--success)' }}>RWF {parseFloat(p.amount).toLocaleString()}</td>
                      <td><span className={`badge badge-${p.status}`}>{p.status}</span></td>
                    </tr>
                  ))}
                  {paymentsHistory.length === 0 && (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No Mobile Money transactions recorded in this group.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>

        </div>
      )}

      {/* 5.5 My Personal Payments */}
      {activeTab === 'my_payments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>

          {/* Header Banner */}
          <div className="glass-panel" style={{ padding: '20px 24px', borderLeft: '4px solid var(--success)', background: 'rgba(16,185,129,0.04)' }}>
            <h3 style={{ fontWeight: 800, marginBottom: '6px', color: 'var(--success)' }}>💳 My Personal Payment Center</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
              Pay your own contributions, fines, and loan installments using <strong style={{ color: '#fbbf24' }}>MTN MoMo</strong> or <strong style={{ color: '#f87171' }}>Airtel Money</strong>.
            </p>
          </div>

          {/* Quick Pay — pay any amount anytime */}
          <div className="glass-panel" style={{ padding: '24px', border: '1px solid rgba(16,185,129,0.25)', background: 'rgba(16,185,129,0.03)' }}>
            <h4 style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--success)' }}>⚡ Quick Pay — Pay Any Amount Anytime</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: '20px' }}>
              Make a payment instantly without waiting for a pending record. Select the type, record, and enter your amount.
            </p>
            <QuickPayForm onPay={openChiefPaymentModal} contributions={contributions} fines={fines} loans={loans} userId={user.id} />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
            {/* My contributions */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontWeight: 700, marginBottom: '16px' }}>My Personal Contributions</h3>
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Week</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contributions.filter(c => c.member_id === user.id).map(c => (
                      <tr key={c.id}>
                        <td>Week {c.week_number}</td>
                        <td style={{ fontWeight: 600 }}>RWF {parseFloat(c.amount).toLocaleString()}</td>
                        <td><span className={`badge badge-${c.status}`}>{c.status}</span></td>
                        <td>
                          {c.status === 'pending' && (
                            <button className="btn btn-success" style={{ padding: '6px 12px', fontSize: '11px' }} onClick={() => openChiefPaymentModal('contribution', c.id, c.amount, `My Week ${c.week_number} Contribution`)}>
                              💳 Pay via MTN/Airtel
                            </button>
                          )}
                          {c.status === 'paid' && <span style={{ color: 'var(--success)', fontWeight: 600 }}>Paid</span>}
                        </td>
                      </tr>
                    ))}
                    {contributions.filter(c => c.member_id === user.id).length === 0 && (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No personal contributions found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* My outstanding fines */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontWeight: 700, marginBottom: '16px' }}>My Personal Fines</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {fines.filter(f => f.member_id === user.id).map(f => (
                  <div key={f.id} className="flex-between" style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '10px' }}>
                    <div>
                      <span style={{ fontWeight: 700 }}>{f.type.replace('_', ' ')}</span>
                      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: '4px' }}>{f.description}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: 'var(--danger)' }}>RWF {parseFloat(f.amount).toLocaleString()}</div>
                      {f.status === 'unpaid' ? (
                        <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '11px', marginTop: '6px' }} onClick={() => openChiefPaymentModal('fine', f.id, f.amount, `My Fine: ${f.type.replace('_', ' ')}`)}
                        >💳 Pay via MTN/Airtel</button>
                      ) : (
                        <span className="badge badge-active" style={{ fontSize: '10px', marginTop: '6px' }}>Paid</span>
                      )}
                    </div>
                  </div>
                ))}
                {fines.filter(f => f.member_id === user.id).length === 0 && (
                  <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>No personal fines issued.</p>
                )}
              </div>
            </div>
          </div>

          {/* My approved loans */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontWeight: 700, marginBottom: '16px' }}>My Active Loans</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {loans.filter(l => l.member_id === user.id && l.status === 'approved' && l.repayment_status !== 'fully_paid').map(l => (
                <div key={l.id} className="flex-between" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '10px' }}>
                  <div>
                    <span style={{ fontWeight: 700 }}>Approved Loan ID: {l.id}</span>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Installment: RWF {parseFloat(l.monthly_installment).toLocaleString()}/mo
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Paid: RWF {parseFloat(l.total_paid || 0).toLocaleString()} / RWF {parseFloat(l.amount).toLocaleString()}
                    </p>
                  </div>
                  <button className="btn btn-primary" onClick={() => {
                    const amt = prompt("Enter repayment installment amount (RWF):", l.monthly_installment);
                    if (amt && parseFloat(amt) > 0) {
                      openChiefPaymentModal('loan_repayment', l.id, parseFloat(amt), `My Loan ID ${l.id} Repayment`);
                    }
                  }}>💳 Pay via MTN/Airtel</button>
                </div>
              ))}
              {loans.filter(l => l.member_id === user.id && l.status === 'approved' && l.repayment_status !== 'fully_paid').length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>No active personal loans requiring repayments.</p>
              )}
            </div>
          </div>

        </div>
      )}

      {/* 6. Notifications & Reports */}
      {activeTab === 'notifications' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
            
            {/* Announcement dispatch */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h4 style={{ fontWeight: 700, marginBottom: '16px' }}>Dispatch Alert to Group</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: '20px' }}>
                Broadcast emergency alerts, meeting notes, or announcements directly to all members of {group?.name}.
              </p>
              <button className="btn btn-primary" onClick={() => setShowNotifModal(true)}>Send Notification</button>
            </div>

            {/* Winner Designate */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h4 style={{ fontWeight: 700, marginBottom: '16px' }}>Select Weekly Money Winner</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: '20px' }}>
                Nominate the group member designated to receive the weekly savings pool payout. All members will be notified.
              </p>
              <button className="btn btn-primary" onClick={() => setShowWinnerModal(true)}>
                <Award size={16} /> Choose Weekly Winner
              </button>
            </div>

          </div>

          {/* Historical broadcasts */}
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>Recent Broadcasts</h3>
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {notifications.filter(n => n.group_id === group?.id).slice(0, 5).map(n => (
              <div key={n.id} style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '10px' }}>
                <div className="flex-between">
                  <span style={{ fontWeight: 700 }}>{n.title}</span>
                  <span className="badge badge-member" style={{ fontSize: '10px' }}>{n.type}</span>
                </div>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: '8px' }}>{n.message}</p>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '8px', display: 'block' }}>{new Date(n.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. Chat Room */}
      {activeTab === 'chat' && (
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>Group Discussion Channel</h3>
          <ChatWindow token={token} user={user} />
        </div>
      )}

      {/* MODALS */}

      {/* Member Creation Modal */}
      {showMemberModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <h3 style={{ marginBottom: '20px', fontWeight: 700 }}>{selectedMember ? 'Edit Member Profile' : 'Register Group Member'}</h3>
            
            {tempCredentials ? (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid var(--success)', padding: '16px', borderRadius: '10px', marginBottom: '20px' }}>
                  <h4 style={{ color: 'var(--success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Check size={18} /> Member registered successfully!
                  </h4>
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: '8px' }}>
                    This member was added to your group. Send their login credentials:
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
                  <input type="email" className="input-field" required placeholder="name@mail.com" value={memberForm.email} onChange={(e) => setMemberForm({...memberForm, email: e.target.value})} disabled={selectedMember} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input type="text" className="input-field" required placeholder="+250..." value={memberForm.phone} onChange={(e) => setMemberForm({...memberForm, phone: e.target.value})} />
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowMemberModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save Member</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Meeting schedule Modal */}
      {showMeetingModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ maxWidth: '450px' }}>
            <h3 style={{ marginBottom: '20px', fontWeight: 700 }}>Schedule Meeting</h3>
            <form onSubmit={handleMeetingSubmit}>
              <div className="form-group">
                <label className="form-label">Meeting Date</label>
                <input type="date" className="input-field" required value={meetingForm.meeting_date} onChange={(e) => setMeetingForm({...meetingForm, meeting_date: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Meeting Time</label>
                <input type="time" className="input-field" required value={meetingForm.meeting_time} onChange={(e) => setMeetingForm({...meetingForm, meeting_time: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Agenda Notes</label>
                <textarea rows={3} className="input-field" placeholder="Topic to discuss..." value={meetingForm.notes} onChange={(e) => setMeetingForm({...meetingForm, notes: e.target.value})} style={{ fontFamily: 'inherit', resize: 'none' }} />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowMeetingModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Schedule Meeting</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mark Attendance Modal */}
      {showMarkAttendanceModal && selectedMeeting && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <h3 style={{ marginBottom: '10px', fontWeight: 700 }}>Mark Attendance</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: '20px' }}>
              Meeting date: {selectedMeeting.meeting_date} at {selectedMeeting.meeting_time}
            </p>
            
            <form onSubmit={handleMarkAttendanceSubmit}>
              <div style={{ maxHeight: '350px', overflowY: 'auto', marginBottom: '20px' }}>
                {attendanceList.map(a => (
                  <div key={a.member_id} className="flex-between" style={{ padding: '12px 0', borderBottom: '1px solid var(--border-glass)' }}>
                    <span style={{ fontWeight: 500 }}>{a.name}</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="button" className={`btn btn-icon ${a.status === 'present' ? 'btn-success' : 'btn-secondary'}`} onClick={() => updateAttendanceStatus(a.member_id, 'present')}>Present</button>
                      <button type="button" className={`btn btn-icon ${a.status === 'late' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => updateAttendanceStatus(a.member_id, 'late')}>Late</button>
                      <button type="button" className={`btn btn-icon ${a.status === 'absent' ? 'btn-danger' : 'btn-secondary'}`} onClick={() => updateAttendanceStatus(a.member_id, 'absent')}>Absent</button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => {
                  setShowMarkAttendanceModal(false);
                  setSelectedMeeting(null);
                }}>Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Logs</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fine Modal */}
      {showFineModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ maxWidth: '450px' }}>
            <h3 style={{ marginBottom: '20px', fontWeight: 700 }}>Issue Fine Card</h3>
            <form onSubmit={handleFineSubmit}>
              <div className="form-group">
                <label className="form-label">Group Member</label>
                <select className="input-field select-field" required value={fineForm.member_id} onChange={(e) => setFineForm({...fineForm, member_id: e.target.value})}>
                  <option value="">Select Member...</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Violation Category</label>
                <select className="input-field select-field" value={fineForm.type} onChange={(e) => setFineForm({...fineForm, type: e.target.value})}>
                  <option value="rule_violation">Rule Violation</option>
                  <option value="late_payment">Late Payment</option>
                  <option value="meeting_absence">Meeting Absence</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Fine Amount (RWF)</label>
                <input type="number" className="input-field" placeholder="1000" required value={fineForm.amount} onChange={(e) => setFineForm({...fineForm, amount: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Explanation Note</label>
                <textarea rows={3} className="input-field" placeholder="Explain the breach of rule..." value={fineForm.description} onChange={(e) => setFineForm({...fineForm, description: e.target.value})} style={{ fontFamily: 'inherit', resize: 'none' }} />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowFineModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Log Fine</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Select Winner Modal */}
      {showWinnerModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ maxWidth: '450px' }}>
            <h3 style={{ marginBottom: '20px', fontWeight: 700 }}>Choose Weekly Money Winner</h3>
            <form onSubmit={handleWinnerSubmit}>
              <div className="form-group">
                <label className="form-label">Nominate Group Member</label>
                <select className="input-field select-field" required value={winnerForm.member_id} onChange={(e) => setWinnerForm({...winnerForm, member_id: e.target.value})}>
                  <option value="">Select Member...</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tontine Week Number</label>
                <input type="number" className="input-field" placeholder="3" required value={winnerForm.week_number} onChange={(e) => setWinnerForm({...winnerForm, week_number: e.target.value})} />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowWinnerModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Announce Winner</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Chief Prompt Action Choice Modal */}
      {showActionModal && selectedTarget && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ maxWidth: '450px', border: '1px solid var(--accent-primary)' }}>
            <h3 style={{ fontWeight: 800, marginBottom: '12px' }}>Clear Member Payment</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: '20px' }}>
              Recording payment for <strong>{selectedTarget.member_name}</strong>: {selectedTarget.type === 'contribution' ? 'Contribution' : 'Fine'} (Amount: RWF {parseFloat(selectedTarget.amount).toLocaleString()})
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div 
                style={{ 
                  padding: '16px', 
                  borderRadius: '12px', 
                  border: '1px solid var(--border-glass)', 
                  background: 'rgba(255,255,255,0.02)', 
                  cursor: 'pointer' 
                }}
                className="glass-panel-hover"
                onClick={() => {
                  if (selectedTarget.type === 'contribution') {
                    handleRecordPayment(selectedTarget.id);
                  } else {
                    handleRecordFinePaid(selectedTarget.id);
                  }
                }}
              >
                <h4 style={{ fontWeight: 700, color: 'var(--success)' }}>Option A: Reconcile Offline / Cash</h4>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Clear the payment immediately. Use this if the member paid you directly in cash or bank transfer.
                </p>
              </div>

              <div 
                style={{ 
                  padding: '16px', 
                  borderRadius: '12px', 
                  border: '1px solid var(--border-glass)', 
                  background: 'rgba(255,255,255,0.02)', 
                  cursor: 'pointer' 
                }}
                className="glass-panel-hover"
                onClick={() => {
                  handleSendMoMoPrompt(selectedTarget.member_id, selectedTarget.type, selectedTarget.id, selectedTarget.amount);
                }}
              >
                <h4 style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>Option B: Push MTN/Airtel MoMo Prompt</h4>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Sends a mobile money payment prompt notification request to the member to authorize and enter their PIN.
                </p>
              </div>
            </div>

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowActionModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Chief Manual Request Modal */}
      {showPromptModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ maxWidth: '480px' }}>
            <h3 style={{ fontWeight: 800, marginBottom: '16px' }}>Request Member Payment via MoMo</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!selectedRequestMember || !selectedRequestTargetId || !requestAmount) {
                alert("Please select all fields");
                return;
              }
              handleSendMoMoPrompt(selectedRequestMember, selectedRequestTargetType, selectedRequestTargetId, requestAmount);
            }}>
              <div className="form-group">
                <label className="form-label">Select Group Member</label>
                <select 
                  className="input-field select-field"
                  value={selectedRequestMember}
                  onChange={(e) => {
                    setSelectedRequestMember(e.target.value);
                    setSelectedRequestTargetId('');
                  }}
                  required
                >
                  <option value="">-- Choose Member --</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.phone})</option>
                  ))}
                </select>
              </div>

              {selectedRequestMember && (
                <>
                  <div className="form-group">
                    <label className="form-label">Payment Category</label>
                    <select 
                      className="input-field select-field"
                      value={selectedRequestTargetType}
                      onChange={(e) => {
                        setSelectedRequestTargetType(e.target.value);
                        setSelectedRequestTargetId('');
                      }}
                      required
                    >
                      <option value="contribution">Contribution</option>
                      <option value="fine">Fine</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Select Target Outstanding Record</label>
                    <select 
                      className="input-field select-field"
                      value={selectedRequestTargetId}
                      onChange={(e) => {
                        const targetId = e.target.value;
                        setSelectedRequestTargetId(targetId);
                        if (selectedRequestTargetType === 'contribution') {
                          const item = contributions.find(c => c.id === parseInt(targetId));
                          setRequestAmount(item ? item.amount : '');
                        } else {
                          const item = fines.find(f => f.id === parseInt(targetId));
                          setRequestAmount(item ? item.amount : '');
                        }
                      }}
                      required
                    >
                      <option value="">-- Select Record --</option>
                      {selectedRequestTargetType === 'contribution' 
                        ? contributions.filter(c => c.member_id === parseInt(selectedRequestMember) && c.status === 'pending').map(c => (
                            <option key={c.id} value={c.id}>Week {c.week_number} Contribution - RWF {parseFloat(c.amount).toLocaleString()}</option>
                          ))
                        : fines.filter(f => f.member_id === parseInt(selectedRequestMember) && f.status === 'unpaid').map(f => (
                            <option key={f.id} value={f.id}>{f.type.replace('_', ' ')} - RWF {parseFloat(f.amount).toLocaleString()}</option>
                          ))
                      }
                    </select>
                  </div>

                  {selectedRequestTargetId && (
                    <div className="form-group">
                      <label className="form-label">Request Payout Amount (RWF)</label>
                      <input 
                        type="number" 
                        className="input-field" 
                        value={requestAmount} 
                        onChange={(e) => setRequestAmount(e.target.value)} 
                        required 
                        readOnly={selectedRequestTargetType === 'contribution'}
                      />
                    </div>
                  )}
                </>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowPromptModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={!selectedRequestTargetId}>Send MoMo Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Chief Personal Payment MoMo Modal */}
      {showPaymentModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ maxWidth: '480px', border: '1px solid var(--accent-primary)' }}>
            
            {paymentStep === 'input' && (
              <form onSubmit={handleChiefPaymentSubmit}>
                <h3 style={{ fontWeight: 800, marginBottom: '8px' }} className="text-gradient">{t('mobileMoneyPayment')}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: '20px' }}>
                  {t('completePaymentFor')}: <strong>{paymentDetails.title}</strong>
                </p>

                {/* Amount Display */}
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-glass)', marginBottom: '20px', textAlign: 'center' }}>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{t('amountToPay')}</span>
                  <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--success)', marginTop: '4px' }}>RWF {parseFloat(paymentDetails.amount).toLocaleString()}</h2>
                </div>

                {/* Provider Selection */}
                <div className="form-group">
                  <label className="form-label">{t('selectProviderFull')}</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div 
                      onClick={() => setSelectedProvider('MTN')}
                      style={{
                        padding: '16px',
                        borderRadius: '12px',
                        border: `2px solid ${selectedProvider === 'MTN' ? 'var(--warning)' : 'var(--border-glass)'}`,
                        background: selectedProvider === 'MTN' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(0,0,0,0.1)',
                        cursor: 'pointer',
                        textAlign: 'center',
                        fontWeight: 700,
                        color: selectedProvider === 'MTN' ? 'var(--warning)' : 'var(--text-secondary)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {t('mtnMomo')}
                    </div>
                    <div 
                      onClick={() => setSelectedProvider('Airtel')}
                      style={{
                        padding: '16px',
                        borderRadius: '12px',
                        border: `2px solid ${selectedProvider === 'Airtel' ? 'var(--danger)' : 'var(--border-glass)'}`,
                        background: selectedProvider === 'Airtel' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(0,0,0,0.1)',
                        cursor: 'pointer',
                        textAlign: 'center',
                        fontWeight: 700,
                        color: selectedProvider === 'Airtel' ? 'var(--danger)' : 'var(--text-secondary)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {t('airtelMoney')}
                    </div>
                  </div>
                </div>

                {/* Phone Number */}
                <div className="form-group">
                  <label className="form-label">{t('mobilePhone')}</label>
                  <input 
                    type="tel" 
                    required 
                    placeholder="e.g. 0788123456" 
                    className="input-field" 
                    value={paymentPhone} 
                    onChange={(e) => setPaymentPhone(e.target.value)} 
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Must be a valid {selectedProvider} number (e.g. {selectedProvider === 'MTN' ? '078/079/075' : '072/073'})
                  </span>
                </div>

                {/* Simulated 4-digit PIN */}
                <div className="form-group">
                  <label className="form-label">{t('pinLabel')}</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type={showMomoPin ? 'text' : 'password'} 
                      maxLength={4} 
                      required 
                      placeholder="••••" 
                      className="input-field" 
                      value={paymentPin} 
                      onChange={(e) => setPaymentPin(e.target.value.replace(/\D/g, ''))} 
                      style={{ letterSpacing: '8px', textAlign: 'center', fontSize: 'var(--font-size-xl)', paddingRight: '44px' }}
                    />
                    <button type="button" onClick={() => setShowMomoPin(v => !v)} tabIndex={-1} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                      {showMomoPin ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>{t('pinHint')}</span>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setShowPaymentModal(false); setShowMomoPin(false); }}>{t('cancel')}</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{t('authorizePay')}</button>
                </div>
              </form>
            )}

            {paymentStep === 'processing' && (
              <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                <div className="flex-center" style={{ marginBottom: '20px' }}>
                  <div style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    border: `4px solid ${selectedProvider === 'MTN' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)'}`,
                    borderTop: `4px solid ${selectedProvider === 'MTN' ? 'var(--warning)' : 'var(--danger)'}`,
                    animation: 'spin 1s linear infinite'
                  }} />
                </div>
                <h4 style={{ fontWeight: 700, marginBottom: '8px' }}>{t('processingPayment')}</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                  {paymentStatusText}
                </p>
              </div>
            )}

            {paymentStep === 'success' && (
              <div style={{ textAlign: 'center', padding: '20px 10px' }}>
                <div className="flex-center" style={{ 
                  width: '60px', 
                  height: '60px', 
                  borderRadius: '50%', 
                  background: 'rgba(16, 185, 129, 0.1)', 
                  border: '2px solid var(--success)', 
                  color: 'var(--success)',
                  margin: '0 auto 20px auto'
                }}>
                  <CheckCircle size={32} />
                </div>
                <h3 style={{ fontWeight: 800, color: 'var(--success)', marginBottom: '8px' }}>{t('paymentApproved')}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: '20px' }}>{t('telcoSuccess')}</p>

                <div style={{ 
                  background: 'rgba(255,255,255,0.02)', 
                  border: '1px solid var(--border-glass)', 
                  borderRadius: '10px', 
                  padding: '16px', 
                  marginBottom: '24px', 
                  textAlign: 'left',
                  fontSize: 'var(--font-size-sm)'
                }}>
                  <div className="flex-between" style={{ marginBottom: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{t('operator')}:</span>
                    <span style={{ fontWeight: 600 }}>{selectedProvider} MoMo</span>
                  </div>
                  <div className="flex-between" style={{ marginBottom: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{t('phoneNumber')}:</span>
                    <span style={{ fontWeight: 600 }}>{paymentPhone}</span>
                  </div>
                  <div className="flex-between" style={{ marginBottom: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{t('amountPaid')}:</span>
                    <span style={{ fontWeight: 700, color: 'var(--success)' }}>RWF {parseFloat(paymentDetails.amount).toLocaleString()}</span>
                  </div>
                  <div className="flex-between">
                    <span style={{ color: 'var(--text-secondary)' }}>{t('referenceId')}:</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--accent-primary)' }}>{txnReference}</span>
                  </div>
                </div>

                <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setShowPaymentModal(false)}>{t('returnDashboard')}</button>
              </div>
            )}

            {paymentStep === 'error' && (
              <div style={{ textAlign: 'center', padding: '20px 10px' }}>
                <div className="flex-center" style={{ 
                  width: '60px', 
                  height: '60px', 
                  borderRadius: '50%', 
                  background: 'rgba(239, 68, 68, 0.1)', 
                  border: '2px solid var(--danger)', 
                  color: 'var(--danger)',
                  margin: '0 auto 20px auto'
                }}>
                  <XCircle size={32} />
                </div>
                <h3 style={{ fontWeight: 800, color: 'var(--danger)', marginBottom: '8px' }}>{t('transactionFailed')}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: '24px' }}>
                  {paymentStatusText}
                </p>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowPaymentModal(false)}>{t('close')}</button>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setPaymentStep('input')}>{t('tryAgain')}</button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Notification Modal */}
      {showNotifModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ maxWidth: '450px' }}>
            <h3 style={{ marginBottom: '20px', fontWeight: 700 }}>Send Notification Alert</h3>
            <form onSubmit={handleSendNotif}>
              <div className="form-group">
                <label className="form-label">Notification Type</label>
                <select className="input-field select-field" value={notifForm.type} onChange={(e) => setNotifForm({...notifForm, type: e.target.value})}>
                  <option value="payment_reminder">Payment Reminder</option>
                  <option value="meeting_reminder">Meeting Reminder</option>
                  <option value="emergency">Emergency Notification</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Title Header</label>
                <input type="text" className="input-field" placeholder="Reminder" required value={notifForm.title} onChange={(e) => setNotifForm({...notifForm, title: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Alert Message</label>
                <textarea rows={4} className="input-field" placeholder="Details..." required value={notifForm.message} onChange={(e) => setNotifForm({...notifForm, message: e.target.value})} style={{ fontFamily: 'inherit', resize: 'none' }} />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowNotifModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Dispatch Alert</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
