import React, { useState, useEffect } from 'react';
import { 
  User, Users, CheckCircle, XCircle, Search, Bell, FileText, 
  Send, Lock, Phone, Mail, Award, Check, Download, AlertTriangle, Eye, EyeOff
} from 'lucide-react';
import ChatWindow from './ChatWindow';
import { useLang } from '../context/LangContext';

function QuickPayForm({ onPay, contributions, fines, loans }) {
  const [type, setType] = useState('contribution');
  const [provider, setProvider] = useState('MTN');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');

  const getFirstTarget = () => {
    if (type === 'contribution') return contributions.filter(c => c.status === 'pending')[0] || null;
    if (type === 'fine') return fines.filter(f => f.status === 'unpaid')[0] || null;
    return loans.filter(l => l.status === 'approved' && l.repayment_status !== 'fully_paid')[0] || null;
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
    // Pass provider + phone via a special title encoding — picked up inside openPaymentModal
    onPay(type, target.id, amt, `${type.replace(/_/g, ' ')} (${provider})`, null, provider, phone);
    setAmount('');
    setPhone('');
  };

  const target = getFirstTarget();
  const suggestedAmt = target ? (type === 'loan_repayment' ? target.monthly_installment : target.amount) : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Provider selection */}
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
          <label className="form-label">
            Phone ({provider === 'MTN' ? '078/079' : '072/073'})
          </label>
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

export default function MemberDashboard({ token, user, onLogout }) {
  const { t } = useLang();
  const [activeTab, setActiveTab] = useState('personal');
  const [group, setGroup] = useState(null);
  const [leader, setLeader] = useState(null);
  const [contributions, setContributions] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loans, setLoans] = useState([]);
  const [fines, setFines] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [groupSavings, setGroupSavings] = useState(0);
  const [eligibility, setEligibility] = useState({ attendanceRate: 100, pendingContributions: 0, groupSavings: 0, isEligible: true });

  // Password change Form
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });
  const [passwordStatus, setPasswordStatus] = useState({ type: '', message: '' });
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showMomoPin, setShowMomoPin] = useState(false);

  // Loan Form
  const [loanForm, setLoanForm] = useState({ amount: '', purpose: '', term_months: 3 });
  const [loanError, setLoanError] = useState('');

  // Selected Receipt Modal
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Payment Modal and MoMo States
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState({ type: '', targetId: null, amount: 0, title: '' });
  const [selectedProvider, setSelectedProvider] = useState('MTN'); // MTN or Airtel
  const [paymentPhone, setPaymentPhone] = useState(user.phone || '');
  const [paymentPin, setPaymentPin] = useState('');
  const [paymentStep, setPaymentStep] = useState('input'); // input, processing, success, error
  const [paymentStatusText, setPaymentStatusText] = useState('');
  const [txnReference, setTxnReference] = useState('');
  const [paymentsHistory, setPaymentsHistory] = useState([]);
  const [pendingPaymentRequestId, setPendingPaymentRequestId] = useState(null);

  // Fetch functions
  const fetchData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };

      // Own Group details
      const groupRes = await fetch('http://localhost:5000/api/groups', { headers });
      const groupData = await groupRes.json();
      if (groupData.length > 0) {
        const myGroup = groupData[0];
        setGroup(myGroup);

        // Fetch savings for group
        const savRes = await fetch(`http://localhost:5000/api/loans/group-savings/${myGroup.id}`, { headers });
        const savData = await savRes.json();
        setGroupSavings(savData.savings);

        // Fetch Group users to identify Leader (Chief)
        const userRes = await fetch('http://localhost:5000/api/users', { headers });
        const userData = await userRes.json();
        const myLeader = userData.find(u => u.role === 'chief' && u.group_id === myGroup.id);
        setLeader(myLeader);
      }

      // My Contributions
      const contrRes = await fetch('http://localhost:5000/api/contributions', { headers });
      const contrData = await contrRes.json();
      setContributions(contrData);

      // My Attendance
      const attRes = await fetch('http://localhost:5000/api/attendance', { headers });
      const attData = await attRes.json();
      setAttendance(attData);

      // My Loans
      const loanRes = await fetch('http://localhost:5000/api/loans', { headers });
      const loanData = await loanRes.json();
      setLoans(loanData);

      // My Fines
      const fineRes = await fetch('http://localhost:5000/api/fines', { headers });
      const fineData = await fineRes.json();
      setFines(fineData);

      // My Notifications
      const notRes = await fetch('http://localhost:5000/api/notifications', { headers });
      const notData = await notRes.json();
      setNotifications(notData);

      // My Eligibility metrics
      const ellRes = await fetch(`http://localhost:5000/api/loans/metrics/${user.id}`, { headers });
      const ellData = await ellRes.json();
      setEligibility(ellData);

      // Fetch MTN/Airtel payment logs
      const payHistRes = await fetch('http://localhost:5000/api/payments', { headers });
      if (payHistRes.ok) {
        const payHistData = await payHistRes.json();
        setPaymentsHistory(payHistData);
      }

    } catch (err) {
      console.error("Error fetching member data:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Handle Open MoMo Payment Modal
  const openPaymentModal = (type, targetId, amount, title, isPendingRequest = null, quickProvider = null, quickPhone = null) => {
    setPaymentDetails({ type, targetId, amount, title });
    setSelectedProvider(quickProvider || 'MTN');
    setPaymentPhone(quickPhone || user.phone || '');
    setPaymentPin('');
    setPaymentStep('input');
    setPaymentStatusText('');
    setTxnReference('');
    setShowMomoPin(false);
    setPendingPaymentRequestId(isPendingRequest);
    setShowPaymentModal(true);
  };

  // Handle Submit MoMo Payment - Step 1: Send payment request
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!paymentPhone) {
      alert("Please enter a phone number");
      return;
    }

    setPaymentStep('awaiting_pin');
    
    try {
      setPaymentStatusText(`Sending payment request to ${paymentPhone}...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setPaymentStatusText(`Payment prompt sent to ${selectedProvider} number ${paymentPhone}`);

    } catch (err) {
      console.error(err);
      setPaymentStatusText(err.message || 'Failed to send payment request');
      setPaymentStep('error');
    }
  };

  // Handle Customer PIN Entry (simulated on their phone)
  const handleCustomerPinEntry = async () => {
    setPaymentStep('processing');
    
    try {
      setPaymentStatusText("Customer entering PIN on their device...");
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setPaymentStatusText("Validating PIN with mobile money provider...");
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setPaymentStatusText("Processing payment...");
      await new Promise(resolve => setTimeout(resolve, 800));

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      let response;
      if (pendingPaymentRequestId) {
        response = await fetch(`http://localhost:5000/api/payments/${pendingPaymentRequestId}/approve-pending`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            provider: selectedProvider,
            phone_number: paymentPhone
          })
        });
      } else {
        response = await fetch('http://localhost:5000/api/payments', {
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
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Payment failed');
      }

      setTxnReference(data.payment?.reference_number || data.reference_number || 'TXN-SUCCESS');
      setPaymentStep('success');
      fetchData();
    } catch (err) {
      console.error(err);
      setPaymentStatusText(err.message || 'Payment was declined or cancelled');
      setPaymentStep('error');
    }
  };

  // Handle Password Update
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordStatus({ type: '', message: '' });
    try {
      const response = await fetch('http://localhost:5000/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(passwordForm)
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Error updating password');
      
      setPasswordStatus({ type: 'success', message: 'Password updated successfully!' });
      setPasswordForm({ currentPassword: '', newPassword: '' });
    } catch (err) {
      setPasswordStatus({ type: 'danger', message: err.message });
    }
  };

  // Handle Loan Request
  const handleLoanRequestSubmit = async (e) => {
    e.preventDefault();
    setLoanError('');
    try {
      const response = await fetch('http://localhost:5000/api/loans/apply', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(loanForm)
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Loan request failed');
      
      setLoanForm({ amount: '', purpose: '', term_months: 3 });
      alert('Loan application submitted to your group chief for review!');
      fetchData();
    } catch (err) {
      setLoanError(err.message);
    }
  };

  // Handle View Receipt Details
  const handleViewReceipt = async (contribId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/contributions/${contribId}/receipt`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setSelectedReceipt(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Mark notification read
  const handleMarkRead = async (notifId) => {
    try {
      await fetch(`http://localhost:5000/api/notifications/${notifId}/read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Top Banner */}
      <div className="glass-panel" style={{ padding: '20px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h2 className="text-gradient" style={{ fontSize: '1.8rem', fontWeight: 800 }}>{t('memberDashboard')}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            {t('welcomeBack')}, {user.name} • {t('activeMember')} {group ? group.name : 'Ikibina'}
          </p>
        </div>
        <button onClick={onLogout} className="btn btn-secondary">{t('signOut')}</button>
      </div>

      {/* Tabs */}
      <div className="tabs-bar">
        <button className={`tab-btn ${activeTab === 'personal' ? 'active' : ''}`} onClick={() => setActiveTab('personal')}>{t('myProfile')}</button>
        <button className={`tab-btn ${activeTab === 'contributions' ? 'active' : ''}`} onClick={() => setActiveTab('contributions')}>{t('myContributions')}</button>
        <button className={`tab-btn ${activeTab === 'attendance' ? 'active' : ''}`} onClick={() => setActiveTab('attendance')}>{t('myAttendance')}</button>
        <button className={`tab-btn ${activeTab === 'loans' ? 'active' : ''}`} onClick={() => setActiveTab('loans')}>{t('requestLoan')}</button>
        <button className={`tab-btn ${activeTab === 'pay_now' ? 'active' : ''}`} onClick={() => setActiveTab('pay_now')} style={{ background: activeTab === 'pay_now' ? 'rgba(16,185,129,0.15)' : '', borderColor: activeTab === 'pay_now' ? 'var(--success)' : '' }}>{t('makePayment')}</button>
        <button className={`tab-btn ${activeTab === 'payments' ? 'active' : ''}`} onClick={() => setActiveTab('payments')}>{t('paymentHistory')}</button>
        <button className={`tab-btn ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => setActiveTab('notifications')}>{t('groupBoard')}</button>
        <button className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>{t('groupChat')}</button>
      </div>

      {/* TAB CONTENTS */}

      {/* 1. Profile / Credentials / Leader details */}
      {activeTab === 'personal' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            {/* User Profile */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <User size={20} style={{ color: 'var(--accent-primary)' }} /> {t('personalInfo')}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>{t('fullName')}</span>
                  <p style={{ fontWeight: 600 }}>{user.name}</p>
                </div>
                <div>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>{t('email')}</span>
                  <p style={{ fontWeight: 600 }}>{user.email}</p>
                </div>
                <div>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>{t('phone')}</span>
                  <p style={{ fontWeight: 600 }}>{user.phone}</p>
                </div>
                <div>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>{t('assignedGroup')}</span>
                  <p style={{ fontWeight: 600, color: 'var(--accent-secondary)' }}>{group ? `${group.name} (${group.code})` : 'Unassigned'}</p>
                </div>
              </div>
            </div>

            {/* Leader Details */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Award size={20} style={{ color: 'var(--success)' }} /> {t('groupLeadership')}
              </h3>
              {leader ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>{t('chiefName')}</span>
                    <p style={{ fontWeight: 600 }}>{leader.name}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <Mail size={16} style={{ color: 'var(--text-muted)' }} />
                    <p style={{ fontSize: 'var(--font-size-sm)' }}>{leader.email}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <Phone size={16} style={{ color: 'var(--text-muted)' }} />
                    <p style={{ fontSize: 'var(--font-size-sm)' }}>{leader.phone}</p>
                  </div>
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>No leader currently assigned to this group.</p>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            {/* Group Savings */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontWeight: 700, marginBottom: '16px' }}>{t('groupSavings')}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: '16px' }}>
                Group savings is calculated by total contributions and repayments minus disbursed loans.
              </p>
              <div style={{ background: 'rgba(16,185,129,0.1)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.2)' }}>
                <span className="card-label">{t('availablePool')}</span>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--success)' }}>RWF {groupSavings.toLocaleString()}</h1>
              </div>
            </div>

            {/* Change Password */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Lock size={18} style={{ color: 'var(--accent-secondary)' }} /> {t('changePassword')}
              </h3>
              {passwordStatus.message && (
                <div style={{ 
                  background: passwordStatus.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${passwordStatus.type === 'success' ? 'var(--success)' : 'var(--danger)'}`,
                  color: passwordStatus.type === 'success' ? 'var(--success)' : 'var(--danger)',
                  padding: '10px 14px', borderRadius: '8px', fontSize: 'var(--font-size-sm)', marginBottom: '16px'
                }}>
                  {passwordStatus.message}
                </div>
              )}
              <form onSubmit={handlePasswordSubmit}>
                <div className="form-group">
                  <label className="form-label">{t('currentPassword')}</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showCurrentPw ? 'text' : 'password'} required className="input-field" style={{ paddingRight: '44px' }} value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})} />
                    <button type="button" onClick={() => setShowCurrentPw(v => !v)} tabIndex={-1} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                      {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('newPassword')}</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showNewPw ? 'text' : 'password'} required className="input-field" style={{ paddingRight: '44px' }} value={passwordForm.newPassword} onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})} />
                    <button type="button" onClick={() => setShowNewPw(v => !v)} tabIndex={-1} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                      {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>{t('updatePassword')}</button>
              </form>
            </div>
          </div>

        </div>
      )}

      {/* 2. Contributions */}
      {activeTab === 'contributions' && (
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>{t('contributionRecords')}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: '16px' }}>
            Tontine cycles run weekly. Ensure contributions of RWF 5,000 are completed on time.
          </p>

          <div className="glass-panel table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>{t('cycleWeek')}</th>
                  <th>{t('requiredAmount')}</th>
                  <th>{t('status')}</th>
                  <th>{t('paymentDate')}</th>
                  <th style={{ textAlign: 'right' }}>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {contributions.map(c => (
                  <tr key={c.id}>
                    <td>Week {c.week_number}</td>
                    <td style={{ fontWeight: 600 }}>RWF {parseFloat(c.amount).toLocaleString()}</td>
                    <td><span className={`badge badge-${c.status}`}>{c.status}</span></td>
                    <td>{c.payment_date ? new Date(c.payment_date).toLocaleString() : '-'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        {c.status === 'pending' && (
                          <button className="btn btn-success" onClick={() => openPaymentModal('contribution', c.id, c.amount, `Week ${c.week_number} Contribution`)}>{t('submitPayment')}</button>
                        )}
                        {c.status === 'paid' && (
                          <button className="btn btn-secondary btn-icon" onClick={() => handleViewReceipt(c.id)}>
                            <Download size={14} /> {t('receipt')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Attendance */}
      {activeTab === 'attendance' && (
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>My Attendance Register</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: '16px' }}>
            Meeting absence triggers an automatic fine of RWF 1,000. Late arrivals trigger RWF 500.
          </p>

          <div className="glass-panel table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Meeting Timestamp</th>
                  <th>Attendance Status</th>
                  <th>Generated Fine</th>
                  <th>Fine Status</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map(a => (
                  <tr key={a.id}>
                    <td>{new Date(a.meeting_date).toLocaleDateString()} • {a.meeting_time}</td>
                    <td><span className={`badge badge-${a.status === 'present' ? 'active' : 'suspended'}`}>{a.status}</span></td>
                    <td style={{ fontWeight: 600 }}>
                      {a.fine_amount > 0 ? `RWF ${parseFloat(a.fine_amount).toLocaleString()}` : '-'}
                    </td>
                    <td>
                      {a.fine_amount > 0 ? (
                        <span className={`badge badge-${a.fine_status === 'paid' ? 'active' : 'suspended'}`}>{a.fine_status}</span>
                      ) : '-'}
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
          
          {/* Apply Loan */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontWeight: 700, marginBottom: '16px' }}>Apply for a Loan</h3>
            
            {/* Eligibility checks display */}
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-glass)', marginBottom: '20px' }}>
              <h4 style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', marginBottom: '10px' }}>Eligibility Metrics Checklist:</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: 'var(--font-size-sm)' }}>
                <div className="flex-between">
                  <span>Meeting Attendance:</span>
                  <span style={{ color: eligibility.attendanceRate >= 75 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                    {eligibility.attendanceRate}% (Min 75%)
                  </span>
                </div>
                <div className="flex-between">
                  <span>Pending Contributions:</span>
                  <span style={{ color: eligibility.pendingContributions === 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                    {eligibility.pendingContributions} pending (Max 0)
                  </span>
                </div>
                <div className="flex-between">
                  <span>Group Fund Savings:</span>
                  <span style={{ color: 'var(--success)', fontWeight: 600 }}>RWF {eligibility.groupSavings?.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {loanError && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: 'var(--font-size-sm)' }}>
                {loanError}
              </div>
            )}

            <form onSubmit={handleLoanRequestSubmit}>
              <div className="form-group">
                <label className="form-label">Loan Amount (RWF)</label>
                <input type="number" required placeholder="Maximum value depends on Group Savings" className="input-field" value={loanForm.amount} onChange={(e) => setLoanForm({...loanForm, amount: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Purpose of Loan</label>
                <textarea rows={3} required placeholder="Business support, medical bills, agricultural inputs, etc." className="input-field" value={loanForm.purpose} onChange={(e) => setLoanForm({...loanForm, purpose: e.target.value})} style={{ fontFamily: 'inherit', resize: 'none' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Repayment Term (Months)</label>
                <select className="input-field select-field" value={loanForm.term_months} onChange={(e) => setLoanForm({...loanForm, term_months: e.target.value})}>
                  <option value={3}>3 Months</option>
                  <option value={6}>6 Months</option>
                  <option value={12}>12 Months</option>
                </select>
              </div>
              
              <button 
                type="submit" 
                className="btn btn-primary animate-fade-in" 
                style={{ width: '100%', marginTop: '10px' }}
                disabled={!eligibility.isEligible}
              >
                {!eligibility.isEligible ? 'Ineligible due to low stats' : 'Submit Application'}
              </button>
            </form>
          </div>

          {/* Loan history */}
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>My Active Loans & Status</h3>
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {loans.map(l => (
                <div key={l.id} style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '10px' }}>
                  <div className="flex-between">
                    <span style={{ fontWeight: 800, fontSize: 'var(--font-size-lg)' }}>RWF {parseFloat(l.amount).toLocaleString()}</span>
                    <span className={`badge badge-${l.status}`}>{l.status.replace('_', ' ')}</span>
                  </div>
                  <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: '10px' }}>
                    <div><strong>Purpose:</strong> {l.purpose}</div>
                    <div><strong>Term:</strong> {l.term_months} Months</div>
                    <div><strong>Monthly Installment:</strong> RWF {parseFloat(l.monthly_installment).toLocaleString()}</div>
                    {l.status === 'approved' && (
                      <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(16,185,129,0.05)', borderRadius: '6px' }}>
                        <strong>Repaid Progress:</strong> RWF {parseFloat(l.total_paid || 0).toLocaleString()} / RWF {parseFloat(l.amount).toLocaleString()} ({l.repayment_status})
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loans.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>No loans requested yet.</p>
              )}
            </div>
          </div>

        </div>
      )}

      {/* 5. Make Payment - Dedicated Payment Hub */}
      {activeTab === 'pay_now' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>

          {/* Header Banner */}
          <div className="glass-panel" style={{ padding: '20px 24px', borderLeft: '4px solid var(--success)', background: 'rgba(16,185,129,0.04)' }}>
            <h3 style={{ fontWeight: 800, marginBottom: '6px', color: 'var(--success)' }}>💳 Mobile Money Payment Center</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
              Pay your contributions, fines, and loan installments securely using <strong style={{ color: '#fbbf24' }}>MTN MoMo</strong> or <strong style={{ color: '#f87171' }}>Airtel Money</strong>.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>

            {/* Pending Contributions */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <h4 style={{ fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--accent-primary)', padding: '4px 10px', borderRadius: '20px', fontSize: '12px' }}>CONTRIBUTIONS</span>
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {contributions.filter(c => c.status === 'pending').length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--success)' }}>
                    <CheckCircle size={28} style={{ marginBottom: '8px' }} />
                    <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>{t('allPaid')}</p>
                  </div>
                ) : contributions.filter(c => c.status === 'pending').map(c => (
                  <div key={c.id} style={{ padding: '14px', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '10px' }}>
                    <div className="flex-between" style={{ marginBottom: '10px' }}>
                      <span style={{ fontWeight: 700 }}>Week {c.week_number}</span>
                      <span className="badge badge-pending">pending</span>
                    </div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-primary)', marginBottom: '12px' }}>
                      RWF {parseFloat(c.amount).toLocaleString()}
                    </div>
                    <button
                      className="btn btn-primary"
                      style={{ width: '100%', fontSize: '13px' }}
                      onClick={() => openPaymentModal('contribution', c.id, c.amount, `Week ${c.week_number} Contribution`)}
                    >
                      💳 Pay via MTN/Airtel
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Outstanding Fines */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <h4 style={{ fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--danger)', padding: '4px 10px', borderRadius: '20px', fontSize: '12px' }}>FINES</span>
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {fines.filter(f => f.status === 'unpaid').length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--success)' }}>
                    <CheckCircle size={28} style={{ marginBottom: '8px' }} />
                    <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>{t('noFines')}</p>
                  </div>
                ) : fines.filter(f => f.status === 'unpaid').map(f => (
                  <div key={f.id} style={{ padding: '14px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px' }}>
                    <div className="flex-between" style={{ marginBottom: '6px' }}>
                      <span style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>{f.type.replace(/_/g, ' ')}</span>
                      <span className="badge badge-suspended">unpaid</span>
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px' }}>{f.description}</p>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--danger)', marginBottom: '12px' }}>
                      RWF {parseFloat(f.amount).toLocaleString()}
                    </div>
                    <button
                      className="btn btn-danger"
                      style={{ width: '100%', fontSize: '13px' }}
                      onClick={() => openPaymentModal('fine', f.id, f.amount, `${f.type.replace(/_/g, ' ')} Fine`)}
                    >
                      💳 Clear via MTN/Airtel
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Loan Repayments */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <h4 style={{ fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--warning)', padding: '4px 10px', borderRadius: '20px', fontSize: '12px' }}>LOAN REPAYMENTS</span>
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {loans.filter(l => l.status === 'approved' && l.repayment_status !== 'fully_paid').length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--success)' }}>
                    <CheckCircle size={28} style={{ marginBottom: '8px' }} />
                    <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>{t('noLoans')}</p>
                  </div>
                ) : loans.filter(l => l.status === 'approved' && l.repayment_status !== 'fully_paid').map(l => (
                  <div key={l.id} style={{ padding: '14px', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '10px' }}>
                    <div className="flex-between" style={{ marginBottom: '6px' }}>
                      <span style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>Loan #{l.id}</span>
                      <span className="badge" style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--warning)' }}>{l.repayment_status.replace(/_/g, ' ')}</span>
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      Paid: RWF {parseFloat(l.total_paid || 0).toLocaleString()} / RWF {parseFloat(l.amount).toLocaleString()}
                    </p>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--warning)', marginBottom: '12px' }}>
                      Installment: RWF {parseFloat(l.monthly_installment).toLocaleString()}/mo
                    </div>
                    <button
                      className="btn btn-primary"
                      style={{ width: '100%', fontSize: '13px', background: 'rgba(245,158,11,0.2)', borderColor: 'var(--warning)', color: 'var(--warning)' }}
                      onClick={() => {
                        const amt = prompt('Enter repayment amount (RWF):', l.monthly_installment);
                        if (amt && parseFloat(amt) > 0) {
                          openPaymentModal('loan_repayment', l.id, parseFloat(amt), `Loan #${l.id} Repayment`);
                        }
                      }}
                    >
                      💳 Repay via MTN/Airtel
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Quick Pay — pay any amount anytime */}
          <div className="glass-panel" style={{ padding: '24px', border: '1px solid rgba(16,185,129,0.25)', background: 'rgba(16,185,129,0.03)' }}>
            <h4 style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--success)' }}>⚡ Quick Pay — Pay Any Amount Anytime</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: '20px' }}>
              You can make a custom payment at any time without waiting for a pending record. Enter the details below.
            </p>
            <QuickPayForm onPay={openPaymentModal} contributions={contributions} fines={fines} loans={loans} />
          </div>

          {/* Pending MoMo Requests from Chief */}
          {paymentsHistory.filter(p => p.status === 'pending').length > 0 && (
            <div className="glass-panel" style={{ padding: '20px', border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.04)' }}>
              <h4 style={{ fontWeight: 700, marginBottom: '16px', color: 'var(--accent-primary)' }}>{t('pendingRequests')}</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {paymentsHistory.filter(p => p.status === 'pending').map(p => (
                  <div key={p.id} className="flex-between" style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '10px' }}>
                    <div>
                      <span style={{ fontWeight: 700 }}>{p.payment_type.replace(/_/g, ' ')} — RWF {parseFloat(p.amount).toLocaleString()}</span>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Ref: {p.reference_number}</p>
                    </div>
                    <button
                      className="btn btn-success"
                      style={{ fontSize: '12px' }}
                      onClick={() => openPaymentModal(p.payment_type, p.target_id, p.amount, `Requested ${p.payment_type.replace(/_/g, ' ')}`, p.id)}
                    >
                      {t('authorizeAndPay')}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* 6. Payments History, Fines, Repayments */}
      {activeTab === 'payments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
            {/* Outstanding Fines */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertTriangle size={18} style={{ color: 'var(--danger)' }} /> Outstanding Fine Ledger
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {fines.map(f => (
                  <div key={f.id} className="flex-between" style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '10px' }}>
                    <div>
                      <span style={{ fontWeight: 700 }}>{f.type.replace('_', ' ')}</span>
                      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: '4px' }}>{f.description}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: 'var(--danger)' }}>RWF {parseFloat(f.amount).toLocaleString()}</div>
                      {f.status === 'unpaid' ? (
                        <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '11px', marginTop: '6px' }} onClick={() => openPaymentModal('fine', f.id, f.amount, `${f.type.replace('_', ' ')} Fine`)}>Clear Fine</button>
                      ) : (
                        <span className="badge badge-active" style={{ fontSize: '10px', marginTop: '6px' }}>Paid</span>
                      )}
                    </div>
                  </div>
                ))}
                {fines.length === 0 && (
                  <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>No fines issued.</p>
                )}
              </div>
            </div>

            {/* Active Loans Repayments */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontWeight: 700, marginBottom: '16px' }}>Pay Approved Loan Installment</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {loans.filter(l => l.status === 'approved' && l.repayment_status !== 'fully_paid').map(l => (
                  <div key={l.id} className="flex-between" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '10px' }}>
                    <div>
                      <span style={{ fontWeight: 700 }}>Approved Loan ID: {l.id}</span>
                      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Installment: RWF {parseFloat(l.monthly_installment).toLocaleString()}/mo
                      </p>
                    </div>
                    <button className="btn btn-primary" onClick={() => {
                      const amt = prompt("Enter repayment installment amount (RWF):", l.monthly_installment);
                      if (amt && parseFloat(amt) > 0) {
                        openPaymentModal('loan_repayment', l.id, parseFloat(amt), `Loan ID ${l.id} Repayment`);
                      }
                    }}>Repay Installment</button>
                  </div>
                ))}
                {loans.filter(l => l.status === 'approved' && l.repayment_status !== 'fully_paid').length === 0 && (
                  <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>No active loans requiring repayments.</p>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Money Transactions Ledger */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontWeight: 700, marginBottom: '16px' }}>📋 Mobile Money Payments History (MTN/Airtel)</h3>
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Payment Type</th>
                    <th>Provider</th>
                    <th>Phone Number</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date & Time</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentsHistory.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{p.reference_number}</td>
                      <td><span className="badge badge-member">{p.payment_type.replace('_', ' ')}</span></td>
                      <td>
                        <span className={`badge`} style={{ 
                          background: p.provider === 'MTN' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: p.provider === 'MTN' ? '#fbbf24' : '#f87171',
                          fontWeight: 700 
                        }}>
                          {p.provider} MoMo
                        </span>
                      </td>
                      <td>{p.phone_number}</td>
                      <td style={{ fontWeight: 700, color: 'var(--success)' }}>RWF {parseFloat(p.amount).toLocaleString()}</td>
                      <td><span className={`badge badge-${p.status}`}>{p.status}</span></td>
                      <td>{new Date(p.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                  {paymentsHistory.length === 0 && (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No Mobile Money transactions recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* 6. Notifications Board */}
      {activeTab === 'notifications' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
          
          <div>
            <h3 style={{ fontWeight: 700, marginBottom: '16px' }}>{t('announcements')}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {notifications.map(n => (
                <div key={n.id} style={{ 
                  padding: '16px', 
                  background: n.is_read ? 'rgba(255,255,255,0.01)' : 'rgba(99,102,241,0.04)', 
                  border: `1px solid ${n.is_read ? 'var(--border-glass)' : 'rgba(99,102,241,0.2)'}`, 
                  borderRadius: '10px' 
                }}>
                  <div className="flex-between">
                    <span style={{ fontWeight: 700 }}>{n.title}</span>
                    <span className="badge badge-member">{n.type.replace('_', ' ')}</span>
                  </div>
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: '8px' }}>{n.message}</p>
                  
                  {/* Interactive MoMo prompt trigger */}
                  {n.type === 'payment_reminder' && !n.is_read && paymentsHistory.some(p => p.status === 'pending') && (
                    <div style={{ marginTop: '10px' }}>
                      <button 
                        className="btn btn-success" 
                        style={{ padding: '6px 12px', fontSize: '11px' }}
                        onClick={() => {
                          const pendingItem = paymentsHistory.find(p => p.status === 'pending');
                          if (pendingItem) {
                            openPaymentModal(pendingItem.payment_type, pendingItem.target_id, pendingItem.amount, `Requested ${pendingItem.payment_type.replace('_', ' ')}`, pendingItem.id);
                            handleMarkRead(n.id);
                          }
                        }}
                      >
                        Authorize MoMo Request
                      </button>
                    </div>
                  )}

                  <div className="flex-between" style={{ marginTop: '12px' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{new Date(n.created_at).toLocaleString()}</span>
                    {!n.is_read && (
                      <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => handleMarkRead(n.id)}>{t('markRead')}</button>
                    )}
                  </div>
                </div>
              ))}
              {notifications.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>No notices board posts.</p>
              )}
            </div>
          </div>

          {/* Winner display */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontWeight: 700, marginBottom: '16px' }}>{t('cycleWinner')}</h3>
            {notifications.find(n => n.type === 'winner_notification') ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                  Latest weekly winner announcement for your group:
                </p>
                <div style={{ padding: '16px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '10px', color: 'var(--warning)' }}>
                  <p style={{ fontWeight: 700 }}>{notifications.find(n => n.type === 'winner_notification').title}</p>
                  <p style={{ fontSize: 'var(--font-size-sm)', marginTop: '8px', color: 'var(--text-primary)' }}>
                    {notifications.find(n => n.type === 'winner_notification').message}
                  </p>
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>{t('noWinner')}</p>
            )}
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

      {/* RECEIPT MODAL */}
      {selectedReceipt && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ maxWidth: '400px', border: '1px solid var(--success)' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <span className="badge badge-active" style={{ marginBottom: '8px' }}>Payment Cleared</span>
              <h3 style={{ fontWeight: 800 }}>CONTRIBUTION RECEIPT</h3>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>IKIBINA MANAGEMENT SYSTEM</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px dashed var(--border-glass)', paddingTop: '16px', fontSize: 'var(--font-size-sm)' }}>
              <div className="flex-between">
                <span>Group Code:</span>
                <span style={{ fontWeight: 600 }}>{selectedReceipt.group_code}</span>
              </div>
              <div className="flex-between">
                <span>Group Name:</span>
                <span style={{ fontWeight: 600 }}>{selectedReceipt.group_name}</span>
              </div>
              <div className="flex-between">
                <span>Member Name:</span>
                <span style={{ fontWeight: 600 }}>{selectedReceipt.member_name}</span>
              </div>
              <div className="flex-between">
                <span>Tontine Week:</span>
                <span style={{ fontWeight: 600 }}>Week {selectedReceipt.week_number}</span>
              </div>
              <div className="flex-between" style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '8px', marginTop: '4px' }}>
                <span style={{ fontWeight: 700 }}>Total Payout:</span>
                <span style={{ fontWeight: 800, color: 'var(--success)' }}>RWF {parseFloat(selectedReceipt.amount).toLocaleString()}</span>
              </div>
              <div className="flex-between">
                <span>Payment Date:</span>
                <span>{new Date(selectedReceipt.payment_date).toLocaleString()}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setSelectedReceipt(null)}>Close</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => window.print()}>
                <Download size={14} /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE MONEY PAYMENT MODAL */}
      {showPaymentModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ maxWidth: '480px', border: '1px solid var(--accent-primary)' }}>
            
            {paymentStep === 'input' && (
              <form onSubmit={handlePaymentSubmit}>
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

                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowPaymentModal(false)}>{t('cancel')}</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Send Payment Request</button>
                </div>
              </form>
            )}

            {paymentStep === 'awaiting_pin' && (
              <div style={{ textAlign: 'center', padding: '30px 20px' }}>
                <div className="flex-center" style={{ 
                  width: '80px', 
                  height: '80px', 
                  borderRadius: '50%', 
                  background: selectedProvider === 'MTN' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `3px solid ${selectedProvider === 'MTN' ? 'var(--warning)' : 'var(--danger)'}`,
                  margin: '0 auto 20px auto',
                  animation: 'pulse 2s infinite'
                }}>
                  <Phone size={36} style={{ color: selectedProvider === 'MTN' ? 'var(--warning)' : 'var(--danger)' }} />
                  <style>{`
                    @keyframes pulse {
                      0%, 100% { transform: scale(1); opacity: 1; }
                      50% { transform: scale(1.05); opacity: 0.8; }
                    }
                  `}</style>
                </div>
                <h3 style={{ fontWeight: 800, marginBottom: '8px', color: 'var(--accent-primary)' }}>Payment Request Sent!</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: '24px' }}>
                  {paymentStatusText}
                </p>
                
                <div style={{ 
                  background: 'rgba(99, 102, 241, 0.05)', 
                  border: '1px solid rgba(99, 102, 241, 0.2)', 
                  borderRadius: '12px', 
                  padding: '20px',
                  marginBottom: '24px'
                }}>
                  <h4 style={{ fontWeight: 700, marginBottom: '12px', color: 'var(--accent-primary)' }}>On Your Phone</h4>
                  <div style={{ 
                    background: 'rgba(0,0,0,0.3)', 
                    padding: '16px', 
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    marginBottom: '12px'
                  }}>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>You should receive:</p>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '6px', textAlign: 'left' }}>
                      <p style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>{selectedProvider} Mobile Money</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>Payment Request</p>
                      <p style={{ fontSize: '14px', fontWeight: 700 }}>Amount: RWF {parseFloat(paymentDetails.amount).toLocaleString()}</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>Merchant: Ikibina Tontine</p>
                      <p style={{ fontSize: '11px', fontWeight: 600, marginTop: '8px', color: 'var(--success)' }}>Enter your PIN to approve</p>
                    </div>
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Check your phone ({paymentPhone}) for the payment prompt</p>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowPaymentModal(false)}>Cancel</button>
                  <button className="btn btn-success" style={{ flex: 1 }} onClick={handleCustomerPinEntry}>
                    ✓ I Entered PIN
                  </button>
                </div>
              </div>
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
                  <style>{`
                    @keyframes spin {
                      0% { transform: rotate(0deg); }
                      100% { transform: rotate(360deg); }
                    }
                  `}</style>
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

    </div>
  );
}
