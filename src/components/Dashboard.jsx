import React, { useState, useEffect } from 'react';
import {
    Calendar, Bell, Users, Settings,
    ChevronLeft, ChevronRight,
    Plus, Inbox, LogOut, CalendarDays, X, Clock, Lock, Globe, Users2, ArrowLeft
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import './Dashboard.css';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const today = new Date();
const PLAN_COLORS = ['#7dd3fc', '#86efac', '#fbbf24', '#ff7eb9', '#a78bfa', '#f87171', '#34d399'];
const FRIEND_COLORS = ['#ff7eb9', '#7dd3fc', '#86efac', '#fbbf24', '#a78bfa', '#f87171'];

const MOCK_FRIENDS = [
    { id: '1', full_name: 'Johnson Doe', nickname: 'johnson', color: '#7dd3fc' },
    { id: '2', full_name: 'Alicia Heart', nickname: 'alicia', color: '#ff7eb9' },
    { id: '3', full_name: 'Mike Ross', nickname: 'mross', color: '#86efac' },
];

function getMiniCal(year, month) {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
}

function toLocalDateTimeInput(date) {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
}

function formatPlanTime(iso) {
    return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const Dashboard = ({ userProfile, onLogout, onNavigate }) => {
    const [miniMonth, setMiniMonth] = useState(today.getMonth());
    const [miniYear, setMiniYear] = useState(today.getFullYear());
    const [showModal, setShowModal] = useState(false);
    const [myPlans, setMyPlans] = useState([]);
    const [selectedFriend, setSelectedFriend] = useState(null);
    const [friendSchedule, setFriendSchedule] = useState([]);
    const [loadingFriendSched, setLoadingFriendSched] = useState(false);
    const [savingPlan, setSavingPlan] = useState(false);
    const [friends, setFriends] = useState(MOCK_FRIENDS);

    const [newPlan, setNewPlan] = useState({
        title: '',
        description: '',
        start_time: toLocalDateTimeInput(new Date()),
        end_time: toLocalDateTimeInput(new Date(Date.now() + 3600000)),
        color: PLAN_COLORS[0],
        visibility: 'friends',
    });

    const miniCal = getMiniCal(miniYear, miniMonth);

    useEffect(() => {
        if (userProfile?.id) {
            fetchMyPlans();
            fetchFriends();
        }
    }, [userProfile]);

    const fetchFriends = async () => {
        const { data } = await supabase
            .from('friendships')
            .select(`
                requester_id, addressee_id,
                requester:profiles!friendships_requester_id_fkey(id, full_name, nickname),
                addressee:profiles!friendships_addressee_id_fkey(id, full_name, nickname)
            `)
            .eq('status', 'accepted')
            .or(`requester_id.eq.${userProfile.id},addressee_id.eq.${userProfile.id}`);

        if (data && data.length > 0) {
            const mapped = data.map((f, i) => {
                const isMeRequester = f.requester_id === userProfile.id;
                const profile = isMeRequester ? f.addressee : f.requester;
                return { ...profile, color: FRIEND_COLORS[i % FRIEND_COLORS.length] };
            });
            setFriends(mapped);
        }
    };

    const fetchMyPlans = async () => {
        const { data } = await supabase
            .from('schedules')
            .select('*')
            .eq('user_id', userProfile.id)
            .order('start_time', { ascending: true });
        if (data) setMyPlans(data);
    };

    const fetchFriendSchedule = async (friendId) => {
        setLoadingFriendSched(true);
        setFriendSchedule([]);
        const { data } = await supabase
            .from('schedules')
            .select('*')
            .eq('user_id', friendId)
            .in('visibility', ['friends', 'public'])
            .order('start_time', { ascending: true });
        if (data) setFriendSchedule(data);
        setLoadingFriendSched(false);
    };

    const handleFriendClick = (friend) => {
        if (selectedFriend?.id === friend.id) {
            // Deselect
            setSelectedFriend(null);
            setFriendSchedule([]);
        } else {
            setSelectedFriend(friend);
            fetchFriendSchedule(friend.id);
        }
    };

    const handleSavePlan = async () => {
        if (!newPlan.title.trim()) return;
        setSavingPlan(true);
        const { error } = await supabase.from('schedules').insert({
            user_id: userProfile.id,
            title: newPlan.title,
            description: newPlan.description,
            start_time: new Date(newPlan.start_time).toISOString(),
            end_time: new Date(newPlan.end_time).toISOString(),
            color: newPlan.color,
            visibility: newPlan.visibility,
        });
        setSavingPlan(false);
        if (!error) {
            setShowModal(false);
            setNewPlan({ title: '', description: '', start_time: toLocalDateTimeInput(new Date()), end_time: toLocalDateTimeInput(new Date(Date.now() + 3600000)), color: PLAN_COLORS[0], visibility: 'friends' });
            fetchMyPlans();
        }
    };

    const plansToShow = selectedFriend ? friendSchedule : myPlans;
    const plansHeader = selectedFriend
        ? `${selectedFriend.full_name}'s Plans`
        : `${userProfile?.nickname || userProfile?.full_name || 'Your'}'s Plans`;

    return (
        <div className="dash-wrapper">
            {/* ── LEFT SIDEBAR ── */}
            <aside className="dash-sidebar">
                <div className="sidebar-brand">
                    <div className="logo-grid">
                        <div className="sq sq-navy"></div>
                        <div className="sq sq-gray"></div>
                        <div className="sq sq-gray bottom"></div>
                    </div>
                    <span className="sidebar-brand-name">Ipschedula</span>
                </div>
                <nav className="sidebar-nav">
                    {[
                        { key: 'calendar', label: 'Calendar', icon: <Calendar size={20} /> },
                        { key: 'notifications', label: 'Notifications', icon: <Bell size={20} /> },
                        { key: 'friends', label: 'Friends', icon: <Users size={20} /> },
                        { key: 'settings', label: 'Settings', icon: <Settings size={20} /> },
                    ].map(({ key, label, icon }) => (
                        <button key={key} className={`nav-item ${key === 'calendar' ? 'active' : ''}`} onClick={() => onNavigate(key)}>
                            <span className="nav-icon">{icon}</span><span>{label}</span>
                        </button>
                    ))}
                </nav>
                <div className="sidebar-user" onClick={onLogout} title="Logout">
                    <div className="user-avatar-placeholder">
                        {(userProfile?.nickname || userProfile?.full_name || 'U')[0].toUpperCase()}
                    </div>
                    <div className="user-info">
                        <span className="user-name">{userProfile?.full_name || 'User'}</span>
                        <span className="user-handle">@{userProfile?.nickname || 'user'}</span>
                    </div>
                    <LogOut size={15} className="logout-icon-mini" />
                </div>
            </aside>

            {/* ── MAIN CONTENT ── */}
            <main className="dash-main">
                {/* Friend Avatars — tap to see their schedule */}
                <div className="friends-strip-horizontal">
                    <div className="strip-label-row">
                        <span className="strip-label">
                            {selectedFriend ? (
                                <span className="viewing-label" style={{ color: selectedFriend.color }}>
                                    Viewing {selectedFriend.full_name}'s schedule
                                </span>
                            ) : 'Your Circle'}
                        </span>
                        <button className="strip-link" onClick={() => onNavigate('friends')}>Manage →</button>
                    </div>
                    <div className="avatars-scroll">
                        {friends.map((f) => (
                            <div
                                key={f.id}
                                className={`friend-avatar-wrap ${selectedFriend?.id === f.id ? 'avatar-selected' : ''}`}
                                onClick={() => handleFriendClick(f)}
                            >
                                <div
                                    className="avatar-circle"
                                    style={{
                                        backgroundColor: f.color,
                                        boxShadow: selectedFriend?.id === f.id
                                            ? `0 0 0 3px white, 0 0 0 5px ${f.color}`
                                            : `0 0 0 3px white, 0 0 0 4.5px ${f.color}44`
                                    }}
                                >
                                    {f.full_name ? f.full_name[0] : 'U'}
                                </div>
                                <span className="avatar-name">@{f.nickname}</span>
                            </div>
                        ))}
                        <button className="add-avatar-btn" onClick={() => onNavigate('friends')}>
                            <Plus size={18} />
                        </button>
                    </div>
                </div>

                {/* Plans Section */}
                <div className="plans-section">
                    <div className="plans-header">
                        <div className="plans-header-left">
                            {selectedFriend ? (
                                <button className="back-btn" onClick={() => { setSelectedFriend(null); setFriendSchedule([]); }}>
                                    <ArrowLeft size={16} />
                                </button>
                            ) : (
                                <CalendarDays size={18} className="plans-icon" />
                            )}
                            <h3 className="plans-title">{plansHeader}</h3>

                        </div>
                        <div className="plans-actions">
                            {!selectedFriend && (
                                <button className="add-event-btn" onClick={() => setShowModal(true)}><Plus size={18} /></button>
                            )}
                        </div>
                    </div>

                    {loadingFriendSched ? (
                        <div className="empty-plans">
                            <div className="loading-spinner" />
                            <p className="empty-sub">Loading {selectedFriend?.full_name}'s plans…</p>
                        </div>
                    ) : plansToShow.length === 0 ? (
                        <div className="empty-plans">
                            <Inbox size={52} strokeWidth={1} className="empty-icon" />
                            <p className="empty-title">
                                {selectedFriend
                                    ? `${selectedFriend.full_name} has no shared plans`
                                    : 'No plans yet'}
                            </p>
                            <p className="empty-sub">
                                {selectedFriend
                                    ? 'They may have set their plans to private'
                                    : 'Click + to schedule your first plan'}
                            </p>
                        </div>
                    ) : (
                        <div className="plan-cards-list">
                            {plansToShow.map(plan => (
                                <div key={plan.id} className="plan-card" style={{ borderLeftColor: plan.color }}>
                                    <div className="plan-card-content">
                                        <div className="plan-card-top">
                                            <span className="plan-title">{plan.title}</span>
                                            <span className={`plan-vis-badge vis-${plan.visibility}`}>
                                                {plan.visibility === 'private' ? <Lock size={10} /> : plan.visibility === 'friends' ? <Users2 size={10} /> : <Globe size={10} />}
                                                {plan.visibility}
                                            </span>
                                        </div>
                                        {plan.description && <p className="plan-desc">{plan.description}</p>}
                                        <span className="plan-time">
                                            <Clock size={12} /> {formatPlanTime(plan.start_time)} → {formatPlanTime(plan.end_time)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* ── RIGHT SIDEBAR ── */}
            <aside className="dash-right">
                {/* Mini Calendar */}
                <div className="mini-cal">
                    <div className="mini-cal-header">
                        <span className="mini-cal-title">{MONTHS[miniMonth]} {miniYear}</span>
                        <div className="mini-arrows">
                            <button className="mini-arrow" onClick={() => {
                                if (miniMonth === 0) { setMiniMonth(11); setMiniYear(y => y - 1); }
                                else setMiniMonth(m => m - 1);
                            }}><ChevronLeft size={15} /></button>
                            <button className="mini-arrow" onClick={() => {
                                if (miniMonth === 11) { setMiniMonth(0); setMiniYear(y => y + 1); }
                                else setMiniMonth(m => m + 1);
                            }}><ChevronRight size={15} /></button>
                        </div>
                    </div>
                    <div className="mini-cal-grid">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                            <span key={i} className="mini-day-name">{d}</span>
                        ))}
                        {miniCal.map((d, i) => {
                            const isToday = d === today.getDate() && miniMonth === today.getMonth() && miniYear === today.getFullYear();
                            return (
                                <span key={i} className={`mini-day ${isToday ? 'mini-today' : ''} ${!d ? 'empty' : ''}`}>
                                    {d || ''}
                                </span>
                            );
                        })}
                    </div>
                </div>

                {/* Create Event Box */}
                <div className="create-event-box">
                    <h4 className="create-event-title">Create New Plan</h4>
                    <button className="create-plan-fullbtn" onClick={() => setShowModal(true)}>
                        <Plus size={16} /> Schedule a Plan
                    </button>
                    <div className="upcoming-list-compact">
                        {myPlans.slice(0, 4).map(plan => (
                            <div key={plan.id} className="upcoming-item">
                                <div className="upcoming-dot" style={{ backgroundColor: plan.color }} />
                                <div className="upcoming-info">
                                    <span className="upcoming-name">{plan.title}</span>
                                    <span className="upcoming-time">{formatPlanTime(plan.start_time)}</span>
                                </div>
                            </div>
                        ))}
                        {myPlans.length === 0 && (
                            <p className="upcoming-empty">No upcoming plans</p>
                        )}
                    </div>
                </div>
            </aside>

            {/* ── CREATE SCHEDULE MODAL ── */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Create New Plan</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="modal-field">
                                <label className="modal-label">Title *</label>
                                <input className="modal-input" type="text" placeholder="What's the plan?" value={newPlan.title} onChange={e => setNewPlan(p => ({ ...p, title: e.target.value }))} />
                            </div>
                            <div className="modal-field">
                                <label className="modal-label">Description</label>
                                <textarea className="modal-textarea" placeholder="Add notes or details..." value={newPlan.description} onChange={e => setNewPlan(p => ({ ...p, description: e.target.value }))} />
                            </div>
                            <div className="modal-row">
                                <div className="modal-field half">
                                    <label className="modal-label">Start</label>
                                    <input className="modal-input" type="datetime-local" value={newPlan.start_time} onChange={e => setNewPlan(p => ({ ...p, start_time: e.target.value }))} />
                                </div>
                                <div className="modal-field half">
                                    <label className="modal-label">End</label>
                                    <input className="modal-input" type="datetime-local" value={newPlan.end_time} onChange={e => setNewPlan(p => ({ ...p, end_time: e.target.value }))} />
                                </div>
                            </div>
                            <div className="modal-field">
                                <label className="modal-label">Color Tag</label>
                                <div className="color-picker">
                                    {PLAN_COLORS.map(c => (
                                        <button key={c} className={`color-swatch ${newPlan.color === c ? 'color-active' : ''}`} style={{ backgroundColor: c }} onClick={() => setNewPlan(p => ({ ...p, color: c }))} />
                                    ))}
                                </div>
                            </div>
                            <div className="modal-field">
                                <label className="modal-label">Visibility</label>
                                <div className="vis-options">
                                    {[
                                        { val: 'private', label: 'Private', icon: <Lock size={14} /> },
                                        { val: 'friends', label: 'Friends', icon: <Users2 size={14} /> },
                                        { val: 'public', label: 'Public', icon: <Globe size={14} /> },
                                    ].map(opt => (
                                        <button key={opt.val} className={`vis-btn ${newPlan.visibility === opt.val ? 'vis-active' : ''}`} onClick={() => setNewPlan(p => ({ ...p, visibility: opt.val }))}>
                                            {opt.icon} {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="modal-cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="modal-save-btn" onClick={handleSavePlan} disabled={savingPlan || !newPlan.title.trim()}>
                                {savingPlan ? 'Saving…' : 'Save Plan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
