import React, { useState, useEffect } from 'react';
import {
    Calendar, Bell, Users, Settings,
    Plus, LogOut, Search, MessageCircle, UserPlus,
    CheckCircle, X, UserCheck, Clock, Check, Send
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import './Dashboard.css';

const NAV_ITEMS = [
    { key: 'calendar', label: 'Calendar', icon: <Calendar size={20} /> },
    { key: 'notifications', label: 'Notifications', icon: <Bell size={20} /> },
    { key: 'friends', label: 'Friends', icon: <Users size={20} /> },
    { key: 'settings', label: 'Settings', icon: <Settings size={20} /> },
];

const COLORS = ['#ff7eb9', '#7dd3fc', '#86efac', '#fbbf24', '#a78bfa', '#f87171', '#34d399'];

const Friends = ({ userProfile, onLogout, onNavigate }) => {
    const [activeTab, setActiveTab] = useState('friends');   // 'friends' | 'requests' | 'discover'
    const [myFriends, setMyFriends] = useState([]);
    const [pendingIn, setPendingIn] = useState([]);
    const [pendingOut, setPendingOut] = useState([]);
    const [discoverUsers, setDiscoverUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [chatFriend, setChatFriend] = useState(null);
    const [sentMap, setSentMap] = useState({});
    const [chatMsg, setChatMsg] = useState('');

    useEffect(() => {
        if (userProfile?.id) {
            fetchFriends();
            fetchRequests();
            fetchDiscover();
        }
    }, [userProfile]);

    // Server-side debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (userProfile?.id) fetchDiscover(searchQuery);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchQuery, userProfile?.id]);

    const fetchFriends = async () => {
        const { data } = await supabase
            .from('friendships')
            .select(`
                id, requester_id, addressee_id,
                requester:profiles!friendships_requester_id_fkey(id, full_name, nickname),
                addressee:profiles!friendships_addressee_id_fkey(id, full_name, nickname)
            `)
            .eq('status', 'accepted')
            .or(`requester_id.eq.${userProfile.id},addressee_id.eq.${userProfile.id}`);

        if (data) {
            setMyFriends(data.map(f =>
                f.requester_id === userProfile.id ? f.addressee : f.requester
            ));
        }
    };

    const fetchRequests = async () => {
        // Try to fetch incoming requests. Using explicit join if named FK fails
        const { data: inc, error: incErr } = await supabase
            .from('friendships')
            .select('id, requester:requester_id(id, full_name, nickname)')
            .eq('addressee_id', userProfile.id).eq('status', 'pending');

        if (inc) setPendingIn(inc);

        // Try to fetch outgoing requests
        const { data: out, error: outErr } = await supabase
            .from('friendships')
            .select('id, addressee:addressee_id(id, full_name, nickname)')
            .eq('requester_id', userProfile.id).eq('status', 'pending');

        if (out) setPendingOut(out);

        if (incErr || outErr) console.warn("Request fetch error:", incErr || outErr);
    };

    const fetchDiscover = async (query = '') => {
        let rpc = supabase.from('profiles').select('id, full_name, nickname').neq('id', userProfile.id);

        if (query) {
            rpc = rpc.or(`full_name.ilike.%${query}%,nickname.ilike.%${query}%`);
        }

        const { data } = await rpc.limit(30);
        if (data) setDiscoverUsers(data);
    };

    const sendRequest = async (toUserId) => {
        // Use UPSERT to handle existing 'declined' or 'pending' requests gracefully
        const { error } = await supabase.from('friendships').upsert({
            requester_id: userProfile.id,
            addressee_id: toUserId,
            status: 'pending',
            updated_at: new Date().toISOString()
        }, { onConflict: 'requester_id,addressee_id' });

        if (error) {
            // If upsert fails due to policy or other reason, show friendly msg
            if (error.code === '23505') {
                alert("A request already exists between you and this user.");
                setSentMap(p => ({ ...p, [toUserId]: true }));
            } else {
                console.error("Friend request failed:", error);
                alert("Could not send request: " + error.message);
            }
        } else {
            setSentMap(p => ({ ...p, [toUserId]: true }));
            fetchRequests(); // Sync UI
        }
    };

    const accept = async (id) => { await supabase.from('friendships').update({ status: 'accepted' }).eq('id', id); fetchFriends(); fetchRequests(); };
    const decline = async (id) => { await supabase.from('friendships').delete().eq('id', id); fetchRequests(); };

    const filtered = discoverUsers.filter(u => {
        if (myFriends.some(f => f?.id === u.id)) return false;
        if (pendingOut.some(p => p.addressee?.id === u.id) || sentMap[u.id]) return false;
        if (pendingIn.some(p => p.requester?.id === u.id)) return false;
        return true;
    });

    const requestCount = pendingIn.length;

    return (
        <div className="friends-layout">

            {/* ── LEFT SIDEBAR ── */}
            <aside className="dash-sidebar">
                <div className="sidebar-brand">
                    <div className="logo-grid">
                        <div className="sq sq-navy" /><div className="sq sq-gray" /><div className="sq sq-gray bottom" />
                    </div>
                    <span className="sidebar-brand-name">Ipschedula</span>
                </div>
                <nav className="sidebar-nav">
                    {NAV_ITEMS.map(({ key, label, icon }) => (
                        <button key={key}
                            className={`nav-item ${key === 'friends' ? 'active' : ''}`}
                            onClick={() => onNavigate(key)}>
                            <span className="nav-icon">{icon}</span>
                            <span>{label}</span>
                            {key === 'notifications' && requestCount > 0 &&
                                <span className="badge">{requestCount}</span>}
                        </button>
                    ))}
                </nav>
                <div className="sidebar-user" onClick={onLogout} title="Logout">
                    <div className="user-avatar-placeholder">
                        {(userProfile?.full_name || 'U')[0].toUpperCase()}
                    </div>
                    <div className="user-info">
                        <span className="user-name">{userProfile?.full_name || 'User'}</span>
                        <span className="user-handle">@{userProfile?.nickname || 'user'}</span>
                    </div>
                    <LogOut size={15} className="logout-icon-mini" />
                </div>
            </aside>

            {/* ── FRIENDS LIST PANEL ── */}
            <div className="fl-panel">
                <div className="fl-panel-header">
                    <h2 className="fl-panel-title">Friends</h2>
                    <span className="fl-count">{myFriends.length}</span>
                </div>

                {/* Tab bar */}
                <div className="fl-tabs">
                    <button className={`fl-tab ${activeTab === 'friends' ? 'fl-tab-on' : ''}`} onClick={() => { setActiveTab('friends'); setChatFriend(null); }}>
                        My Friends
                    </button>
                    <button className={`fl-tab ${activeTab === 'requests' ? 'fl-tab-on' : ''}`} onClick={() => { setActiveTab('requests'); setChatFriend(null); }}>
                        Requests {requestCount > 0 && <span className="fl-tab-badge">{requestCount}</span>}
                    </button>
                    <button className={`fl-tab ${activeTab === 'discover' ? 'fl-tab-on' : ''}`} onClick={() => { setActiveTab('discover'); setChatFriend(null); }}>
                        Add People
                    </button>
                </div>

                {/* Friends list */}
                {activeTab === 'friends' && (
                    <div className="fl-list">
                        {myFriends.length === 0 ? (
                            <div className="fl-empty">
                                <Users size={40} strokeWidth={1} />
                                <p>No friends yet</p>
                                <span>Discover people on the right →</span>
                            </div>
                        ) : myFriends.map((f, i) => (
                            <div
                                key={f.id}
                                className={`fl-item ${chatFriend?.id === f.id ? 'fl-item-active' : ''}`}
                                onClick={() => setChatFriend(chatFriend?.id === f.id ? null : f)}
                            >
                                <div className="fl-avatar" style={{ backgroundColor: COLORS[i % COLORS.length] }}>
                                    {f.full_name?.[0] || 'U'}
                                    <div className="fl-online-dot" />
                                </div>
                                <div className="fl-item-info">
                                    <span className="fl-item-name">{f.full_name}</span>
                                    <span className="fl-item-handle">@{f.nickname}</span>
                                </div>
                                <button className="fl-msg-icon" onClick={(e) => { e.stopPropagation(); setChatFriend(f); }}>
                                    <MessageCircle size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Requests list */}
                {activeTab === 'requests' && (
                    <div className="fl-list">
                        {pendingIn.length > 0 && (
                            <>
                                <p className="fl-section-label">Received</p>
                                {pendingIn.map((req, i) => (
                                    <div key={req.id} className="fl-item">
                                        <div className="fl-avatar" style={{ backgroundColor: COLORS[i % COLORS.length] }}>
                                            {req.requester?.full_name?.[0] || 'U'}
                                        </div>
                                        <div className="fl-item-info">
                                            <span className="fl-item-name">{req.requester?.full_name}</span>
                                            <span className="fl-item-handle">@{req.requester?.nickname}</span>
                                        </div>
                                        <div className="fl-req-actions">
                                            <button className="fl-accept-btn" onClick={() => accept(req.id)}><Check size={14} /></button>
                                            <button className="fl-decline-btn" onClick={() => decline(req.id)}><X size={14} /></button>
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}
                        {pendingOut.length > 0 && (
                            <>
                                <p className="fl-section-label" style={{ marginTop: 16 }}>Sent</p>
                                {pendingOut.map((req, i) => (
                                    <div key={req.id} className="fl-item">
                                        <div className="fl-avatar" style={{ backgroundColor: COLORS[i % COLORS.length] }}>
                                            {req.addressee?.full_name?.[0] || 'U'}
                                        </div>
                                        <div className="fl-item-info">
                                            <span className="fl-item-name">{req.addressee?.full_name}</span>
                                            <span className="fl-item-handle">@{req.addressee?.nickname}</span>
                                        </div>
                                        <span className="fl-pending-tag"><Clock size={11} /> Pending</span>
                                    </div>
                                ))}
                            </>
                        )}
                        {pendingIn.length === 0 && pendingOut.length === 0 && (
                            <div className="fl-empty">
                                <UserCheck size={40} strokeWidth={1} />
                                <p>No pending requests</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Discover list (Inside panel for mobile) */}
                {activeTab === 'discover' && (
                    <div className="fl-list">
                        <div className="fl-search-wrap" style={{ margin: '8px 4px 12px' }}>
                            <Search size={15} className="fl-search-icon" />
                            <input
                                className="fl-search-input"
                                type="text"
                                placeholder="Search by name…"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                        {filtered.length === 0 ? (
                            <div className="fl-empty">
                                <Search size={40} strokeWidth={1} />
                                <p>No users found</p>
                            </div>
                        ) : filtered.map((user, i) => (
                            <div key={user.id} className="fl-discover-item">
                                <div className="fl-d-avatar" style={{ backgroundColor: COLORS[i % COLORS.length] }}>
                                    {user.full_name?.[0] || 'U'}
                                </div>
                                <div className="fl-d-info">
                                    <span className="fl-d-name">{user.full_name || 'User'}</span>
                                    <span className="fl-d-handle">@{user.nickname || 'user'}</span>
                                </div>
                                <button
                                    className={`fl-d-btn ${sentMap[user.id] ? 'fl-d-sent' : ''}`}
                                    onClick={() => sendRequest(user.id)}
                                    disabled={sentMap[user.id]}
                                >
                                    {sentMap[user.id]
                                        ? <><CheckCircle size={13} /> Sent</>
                                        : <><UserPlus size={13} /> Add</>}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── MAIN AREA: chat or welcome ── */}
            <main className="fl-main">
                {chatFriend ? (
                    <div className="fl-chat">
                        <div className="fl-chat-header">
                            <div className="fl-chat-avatar"
                                style={{ backgroundColor: COLORS[myFriends.findIndex(f => f?.id === chatFriend.id) % COLORS.length] }}>
                                {chatFriend.full_name?.[0]}
                            </div>
                            <div>
                                <p className="fl-chat-name">{chatFriend.full_name}</p>
                                <p className="fl-chat-sub">@{chatFriend.nickname} · Online</p>
                            </div>
                            <button className="fl-chat-close" onClick={() => setChatFriend(null)}><X size={18} /></button>
                        </div>
                        <div className="fl-chat-body">
                            <div className="fl-chat-empty">
                                <MessageCircle size={48} strokeWidth={1} />
                                <p>No messages yet</p>
                                <span>Send the first message to {chatFriend.full_name}!</span>
                            </div>
                        </div>
                        <div className="fl-chat-footer">
                            <input
                                className="fl-chat-input"
                                placeholder={`Message ${chatFriend.full_name}…`}
                                value={chatMsg}
                                onChange={e => setChatMsg(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && setChatMsg('')}
                            />
                            <button className="fl-chat-send" onClick={() => setChatMsg('')}>
                                <Send size={17} />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="fl-welcome">
                        <div className="fl-welcome-inner">
                            <div className="fl-welcome-icon">
                                <MessageCircle size={40} strokeWidth={1.5} />
                            </div>
                            <h3>Select a friend to chat</h3>
                            <p>Click any friend on the left to open a conversation, or discover new people on the right.</p>
                        </div>
                    </div>
                )}
            </main>

            {/* ── RIGHT DISCOVER PANEL ── */}
            <aside className="fl-discover">
                <div className="fl-discover-header">
                    <h3 className="fl-discover-title">Discover People</h3>
                    <span className="fl-discover-count">{filtered.length}</span>
                </div>

                <div className="fl-search-wrap">
                    <Search size={15} className="fl-search-icon" />
                    <input
                        className="fl-search-input"
                        type="text"
                        placeholder="Search by name…"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="fl-discover-list">
                    {filtered.length === 0 ? (
                        <div className="fl-empty" style={{ padding: '32px 0' }}>
                            <Search size={32} strokeWidth={1} />
                            <p>No users found</p>
                        </div>
                    ) : filtered.map((user, i) => (
                        <div key={user.id} className="fl-discover-item">
                            <div className="fl-d-avatar" style={{ backgroundColor: COLORS[i % COLORS.length] }}>
                                {user.full_name?.[0] || 'U'}
                            </div>
                            <div className="fl-d-info">
                                <span className="fl-d-name">{user.full_name || 'User'}</span>
                                <span className="fl-d-handle">@{user.nickname || 'user'}</span>
                            </div>
                            <button
                                className={`fl-d-btn ${sentMap[user.id] ? 'fl-d-sent' : ''}`}
                                onClick={() => sendRequest(user.id)}
                                disabled={sentMap[user.id]}
                            >
                                {sentMap[user.id]
                                    ? <><CheckCircle size={13} /> Sent</>
                                    : <><UserPlus size={13} /> Add</>}
                            </button>
                        </div>
                    ))}
                </div>
            </aside>
        </div>
    );
};

export default Friends;
