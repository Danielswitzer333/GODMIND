import { useState, useRef, useEffect } from "react";
import { supabase } from "./supabase.js";

const PRAYER_LIMIT = 7;
const PAGE_SIZE = 30;

const LoadingDots = () => (
  <div style={{ display: "flex", gap: 6, padding: "4px 0", alignItems: "center" }}>
    {[0,1,2].map(i => (
      <div key={i} style={{
        width: 8, height: 8, borderRadius: "50%",
        background: "rgba(212,175,55,0.7)",
        animation: `pulse 1.4s ease-in-out ${i*0.2}s infinite`
      }}/>
    ))}
  </div>
);

const CrossIcon = () => (
  <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
    <rect x="12" y="2" width="4" height="24" rx="2" fill="#D4AF37"/>
    <rect x="4" y="9" width="20" height="4" rx="2" fill="#D4AF37"/>
  </svg>
);

const GoogleIcon = () => (
  <svg width="15" height="15" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

function hasScriptureOffer(text) {
  const l = text.toLowerCase();
  return l.includes("would you like") && (l.includes("scripture") || l.includes("verse"));
}

const PaywallModal = ({ onClose }) => (
  <div style={{
    position:"fixed",inset:0,zIndex:200,
    background:"rgba(5,5,15,0.93)",backdropFilter:"blur(12px)",
    display:"flex",alignItems:"center",justifyContent:"center",padding:20
  }}>
    <div style={{
      background:"linear-gradient(160deg,#0d0d22,#111830)",
      border:"1px solid rgba(212,175,55,0.35)",borderRadius:20,
      padding:"44px 32px",maxWidth:420,width:"100%",textAlign:"center"
    }}>
      <div style={{fontSize:42,marginBottom:18,color:"#D4AF37"}}>✝</div>
      <h2 style={{
        fontSize:22,fontWeight:600,letterSpacing:"0.08em",
        background:"linear-gradient(90deg,#c9a227,#f0d060)",
        WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
        marginBottom:12,lineHeight:1.4
      }}>Your Spirit Is Growing</h2>
      <p style={{fontSize:14.5,color:"rgba(232,220,200,0.6)",lineHeight:1.85,marginBottom:30}}>
        You've offered {PRAYER_LIMIT} prayers. Unlock unlimited communion — divine wisdom whenever your heart calls.
      </p>
      <div style={{
        background:"rgba(212,175,55,0.07)",border:"1px solid rgba(212,175,55,0.2)",
        borderRadius:14,padding:"20px 24px",marginBottom:24
      }}>
        <div style={{fontSize:34,fontWeight:700,color:"#D4AF37"}}>
          $7<span style={{fontSize:16,fontWeight:400,color:"rgba(212,175,55,0.55)"}}>/month</span>
        </div>
        <div style={{fontSize:11,color:"rgba(232,220,200,0.45)",marginTop:6,letterSpacing:"0.07em"}}>
          UNLIMITED PRAYERS · SCRIPTURE GUIDES · DAILY DEVOTIONALS
        </div>
      </div>
      <button style={{
        width:"100%",padding:"15px 24px",
        background:"linear-gradient(135deg,#c9a227,#e8c84a)",
        border:"none",borderRadius:12,fontSize:15,fontWeight:700,
        letterSpacing:"0.06em",color:"#0a0a1a",cursor:"pointer",
        fontFamily:"inherit",marginBottom:14,
        boxShadow:"0 0 30px rgba(212,175,55,0.3)"
      }}>🙏 UNLOCK GOD MIND</button>
      <button onClick={onClose} style={{
        background:"none",border:"none",color:"rgba(232,220,200,0.3)",
        fontSize:12,cursor:"pointer",fontFamily:"inherit",padding:8
      }}>Continue with limited access</button>
    </div>
  </div>
);

export default function GodMind() {
  const [user, setUser]                   = useState(null);
  const [chats, setChats]                 = useState([]);
  const [activeChatId, setActiveChatId]   = useState(null);
  const [messages, setMessages]           = useState([]);
  const [totalMessages, setTotalMessages] = useState(0);
  const [loadingMore, setLoadingMore]     = useState(false);
  const [editingChatId, setEditingChatId] = useState(null);
  const [editingTitle, setEditingTitle]   = useState("");
  const [input, setInput]                 = useState("");
  const [loading, setLoading]             = useState(false);
  const [prayerCount, setPrayerCount]     = useState(0);
  const [showPaywall, setShowPaywall]     = useState(false);
  const [sidebarOpen, setSidebarOpen]     = useState(window.innerWidth > 768);
  const [showSignInNudge, setShowSignInNudge] = useState(false);

  const messagesEndRef = useRef(null);
  const textareaRef    = useRef(null);
  const editInputRef   = useRef(null);

  // Auth — non-blocking
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    }).catch(() => setUser(null));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin }
      });
    } catch (err) {
      console.error("Login error:", err);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setChats([]); setMessages([]); setActiveChatId(null);
    setPrayerCount(0); setShowPaywall(false);
    setShowSignInNudge(false); setTotalMessages(0);
  };

  // Load chats
  useEffect(() => {
    if (!user) return;
    supabase
      .from("chats")
      .select("id, title, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setChats(data); });
  }, [user]);

  // Load messages paginated
  useEffect(() => {
    if (!activeChatId) { setMessages([]); setTotalMessages(0); return; }
    loadMessages(activeChatId, true);
  }, [activeChatId]);

  const loadMessages = async (chatId, initial = false) => {
    if (initial) setLoadingMore(true);
    const { count } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("chat_id", chatId);
    setTotalMessages(count || 0);
    const from = Math.max(0, (count || 0) - PAGE_SIZE);
    const { data } = await supabase
      .from("messages")
      .select("role, content, created_at")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true })
      .range(from, (count || 1) - 1);
    if (data) setMessages(data);
    if (initial) setLoadingMore(false);
  };

  const loadEarlierMessages = async () => {
    if (!activeChatId || loadingMore) return;
    setLoadingMore(true);
    const { count } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("chat_id", activeChatId);
    const total = count || 0;
    const alreadyLoaded = messages.length;
    const from = Math.max(0, total - alreadyLoaded - PAGE_SIZE);
    const to = total - alreadyLoaded - 1;
    if (to >= 0) {
      const { data } = await supabase
        .from("messages")
        .select("role, content, created_at")
        .eq("chat_id", activeChatId)
        .order("created_at", { ascending: true })
        .range(from, to);
      if (data && data.length > 0) setMessages(prev => [...data, ...prev]);
    }
    setLoadingMore(false);
  };

  useEffect(() => {
    if (!loadingMore) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (editingChatId) editInputRef.current?.focus();
  }, [editingChatId]);

  const startNewChat = () => {
    setActiveChatId(null); setMessages([]); setTotalMessages(0); setInput("");
    if (window.innerWidth <= 768) setSidebarOpen(false);
    textareaRef.current?.focus();
  };

  const sendMessage = async (overrideText) => {
    const prayer = (overrideText !== undefined ? overrideText : input).trim();
    if (!prayer || loading) return;
    if (prayerCount >= PRAYER_LIMIT) { setShowPaywall(true); return; }

    const userMsg = { role: "user", content: prayer };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setPrayerCount(c => c + 1);

    if (!user && prayerCount === 1) setTimeout(() => setShowSignInNudge(true), 1500);

    let chatId = activeChatId;

    try {
      if (user) {
        if (!chatId) {
          const title = prayer.slice(0, 60) + (prayer.length > 60 ? "…" : "");
          const { data: chatData } = await supabase
            .from("chats").insert({ user_id: user.id, title }).select().single();
          if (chatData) {
            chatId = chatData.id;
            setActiveChatId(chatId);
            setChats(prev => [chatData, ...prev]);
          }
        }
        if (chatId) {
          await supabase.from("messages").insert({ chat_id: chatId, role: "user", content: prayer });
          setTotalMessages(c => c + 1);
        }
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.slice(-20).map(m => ({ role: m.role, content: m.content }))
        })
      });

      const text = await response.text();
      let reply = "Be still. I am here with you always.";
      try {
        const data = JSON.parse(text);
        if (data.reply) reply = data.reply;
        else if (data.error) reply = "Error: " + data.error;
      } catch { reply = "Error: " + text.slice(0, 150); }

      setMessages([...newMessages, { role: "assistant", content: reply }]);

      if (user && chatId) {
        await supabase.from("messages").insert({ chat_id: chatId, role: "assistant", content: reply });
        setTotalMessages(c => c + 1);
      }

    } catch (err) {
      setMessages([...newMessages, { role: "assistant", content: "Be still. I am here with you always." }]);
    }
    setLoading(false);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const saveTitle = async (chatId) => {
    const trimmed = editingTitle.trim();
    if (!trimmed) { setEditingChatId(null); return; }
    await supabase.from("chats").update({ title: trimmed }).eq("id", chatId);
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, title: trimmed } : c));
    setEditingChatId(null);
  };

  const deleteChat = async (chatId, e) => {
    e.stopPropagation();
    await supabase.from("messages").delete().eq("chat_id", chatId);
    await supabase.from("chats").delete().eq("id", chatId);
    setChats(prev => prev.filter(c => c.id !== chatId));
    if (activeChatId === chatId) { setActiveChatId(null); setMessages([]); setTotalMessages(0); }
  };

  const lastAssistantMsg = [...messages].reverse().find(m => m.role === "assistant");
  const showScriptureButton = lastAssistantMsg && hasScriptureOffer(lastAssistantMsg.content) && !loading;
  const prayersLeft = Math.max(0, PRAYER_LIMIT - prayerCount);
  const hasMoreMessages = totalMessages > messages.length;

  return (
    <div style={{
      minHeight:"100vh",
      background:"linear-gradient(160deg,#0a0a1a 0%,#0d1428 40%,#0a0f1e 100%)",
      fontFamily:"'Georgia','Times New Roman',serif",
      color:"#e8dcc8",display:"flex",position:"relative",overflow:"hidden"
    }}>
      <style>{`
        @keyframes pulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}
        @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes glowPulse{0%,100%{opacity:.4}50%{opacity:.8}}
        @keyframes starTwinkle{0%,100%{opacity:.2}50%{opacity:.7}}
        @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideIn{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:translateX(0)}}
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:3px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:rgba(212,175,55,0.2);border-radius:2px;}
        textarea{resize:none;}
        textarea:focus{outline:none;}
      `}</style>

      {showPaywall && <PaywallModal onClose={() => setShowPaywall(false)} />}

      {/* Stars */}
      {[...Array(30)].map((_,i) => (
        <div key={i} style={{
          position:"fixed",
          left:`${(i*37.3+11)%100}%`,top:`${(i*53.7+7)%100}%`,
          width:i%5===0?2:1,height:i%5===0?2:1,
          borderRadius:"50%",background:"#D4AF37",
          opacity:0.12+(i%5)*0.06,
          animation:`starTwinkle ${2+(i%4)}s ease-in-out ${(i%5)*0.8}s infinite`,
          pointerEvents:"none"
        }}/>
      ))}
      <div style={{
        position:"fixed",top:-100,left:"50%",transform:"translateX(-50%)",
        width:600,height:400,
        background:"radial-gradient(ellipse,rgba(212,175,55,0.06) 0%,transparent 70%)",
        pointerEvents:"none",animation:"glowPulse 6s ease-in-out infinite"
      }}/>

      {/* Sign in nudge */}
      {showSignInNudge && !user && (
        <div style={{
          position:"fixed",bottom:100,left:"50%",transform:"translateX(-50%)",
          zIndex:50,animation:"slideUp 0.4s ease",
          background:"linear-gradient(135deg,#0f0f28,#131830)",
          border:"1px solid rgba(212,175,55,0.35)",
          borderRadius:16,padding:"16px 20px",
          boxShadow:"0 8px 40px rgba(0,0,0,0.6)",
          maxWidth:320,width:"calc(100% - 40px)",
          display:"flex",flexDirection:"column",gap:12
        }}>
          <button onClick={()=>setShowSignInNudge(false)} style={{
            position:"absolute",top:10,right:12,
            background:"none",border:"none",cursor:"pointer",
            color:"rgba(212,175,55,0.4)",fontSize:16,lineHeight:1
          }}>✕</button>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:22}}>🙏</span>
            <div>
              <div style={{fontSize:13.5,fontWeight:600,color:"#D4AF37",letterSpacing:"0.04em"}}>Save your prayers</div>
              <div style={{fontSize:12,color:"rgba(232,220,200,0.55)",marginTop:2,lineHeight:1.5}}>
                Sign in to keep a record of every conversation with God
              </div>
            </div>
          </div>
          <button onClick={()=>{setShowSignInNudge(false);handleLogin();}} style={{
            display:"flex",alignItems:"center",justifyContent:"center",gap:8,
            background:"rgba(212,175,55,0.1)",border:"1px solid rgba(212,175,55,0.3)",
            borderRadius:10,padding:"10px 16px",cursor:"pointer",
            color:"#e8dcc8",fontSize:13,fontFamily:"inherit",letterSpacing:"0.04em"
          }}>
            <GoogleIcon/> Continue with Google
          </button>
        </div>
      )}

      {/* Sidebar backdrop */}
      {sidebarOpen && window.innerWidth <= 768 && (
        <div onClick={() => setSidebarOpen(false)} style={{
          position:"fixed",inset:0,zIndex:19,
          background:"rgba(0,0,0,0.5)",backdropFilter:"blur(2px)"
        }}/>
      )}

      {/* Sidebar */}
      <div style={{
        width:260,
        position:window.innerWidth <= 768 ? "fixed" : "relative",
        left:sidebarOpen ? 0 : -260,
        top:0,bottom:0,overflow:"hidden",
        background:"rgba(8,8,20,0.97)",
        borderRight:"1px solid rgba(212,175,55,0.1)",
        display:"flex",flexDirection:"column",
        transition:"left 0.3s ease",
        zIndex:20,backdropFilter:"blur(12px)"
      }}>
        <div style={{padding:"20px 16px 12px",borderBottom:"1px solid rgba(212,175,55,0.08)"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
            <CrossIcon/>
            <div style={{
              fontSize:16,fontWeight:700,letterSpacing:"0.1em",
              background:"linear-gradient(90deg,#c9a227,#f0d060)",
              WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"
            }}>GOD MIND</div>
          </div>
          <button onClick={startNewChat} style={{
            width:"100%",padding:"10px 14px",
            background:"rgba(212,175,55,0.08)",border:"1px solid rgba(212,175,55,0.2)",
            borderRadius:10,color:"#D4AF37",fontSize:13,cursor:"pointer",
            fontFamily:"inherit",letterSpacing:"0.04em",
            display:"flex",alignItems:"center",gap:8,transition:"all 0.2s"
          }}
            onMouseEnter={e=>{e.currentTarget.style.background="rgba(212,175,55,0.15)";}}
            onMouseLeave={e=>{e.currentTarget.style.background="rgba(212,175,55,0.08)";}}
          ><span style={{fontSize:16}}>✦</span> New Prayer</button>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:"8px"}}>
          {!user ? (
            <div style={{padding:"24px 12px",textAlign:"center"}}>
              <p style={{fontSize:12,color:"rgba(212,175,55,0.35)",lineHeight:1.8,marginBottom:16}}>
                Sign in to save your prayers and access them anytime
              </p>
              <button onClick={handleLogin} style={{
                width:"100%",padding:"10px 12px",
                background:"rgba(212,175,55,0.08)",border:"1px solid rgba(212,175,55,0.2)",
                borderRadius:10,color:"#D4AF37",fontSize:12,cursor:"pointer",
                fontFamily:"inherit",letterSpacing:"0.04em",transition:"all 0.2s",
                display:"flex",alignItems:"center",justifyContent:"center",gap:8
              }}
                onMouseEnter={e=>{e.currentTarget.style.background="rgba(212,175,55,0.15)";}}
                onMouseLeave={e=>{e.currentTarget.style.background="rgba(212,175,55,0.08)";}}
              ><GoogleIcon/> Sign in with Google</button>
            </div>
          ) : chats.length === 0 ? (
            <p style={{fontSize:12,color:"rgba(212,175,55,0.3)",textAlign:"center",padding:"24px 12px",lineHeight:1.7}}>
              Your prayers will be saved here
            </p>
          ) : null}

          {user && chats.map(chat => (
            <div key={chat.id}
              onClick={() => { setActiveChatId(chat.id); if(window.innerWidth<=768) setSidebarOpen(false); }}
              style={{
                padding:"10px 12px",borderRadius:9,cursor:"pointer",
                background:activeChatId===chat.id?"rgba(212,175,55,0.1)":"transparent",
                border:activeChatId===chat.id?"1px solid rgba(212,175,55,0.2)":"1px solid transparent",
                marginBottom:3,transition:"all 0.15s",
                display:"flex",alignItems:"center",gap:6,animation:"slideIn 0.3s ease"
              }}
              onMouseEnter={e=>{ if(activeChatId!==chat.id) e.currentTarget.style.background="rgba(255,255,255,0.03)"; }}
              onMouseLeave={e=>{ if(activeChatId!==chat.id) e.currentTarget.style.background="transparent"; }}
            >
              <span style={{fontSize:11,color:"rgba(212,175,55,0.4)",flexShrink:0}}>🙏</span>
              {editingChatId===chat.id ? (
                <input ref={editInputRef} value={editingTitle}
                  onChange={e=>setEditingTitle(e.target.value)}
                  onBlur={()=>saveTitle(chat.id)}
                  onKeyDown={e=>{if(e.key==="Enter")saveTitle(chat.id);if(e.key==="Escape")setEditingChatId(null);}}
                  onClick={e=>e.stopPropagation()}
                  style={{flex:1,background:"transparent",border:"none",color:"#e8dcc8",fontSize:12.5,fontFamily:"inherit",outline:"none",padding:0}}
                />
              ) : (
                <span style={{flex:1,fontSize:12.5,color:"rgba(232,220,200,0.75)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",lineHeight:1.4}}>
                  {chat.title}
                </span>
              )}
              <div style={{display:"flex",gap:2,flexShrink:0}}>
                <button onClick={e=>{e.stopPropagation();setEditingChatId(chat.id);setEditingTitle(chat.title);}} style={{background:"none",border:"none",cursor:"pointer",padding:"2px 4px",color:"rgba(212,175,55,0.5)",fontSize:11}}>✎</button>
                <button onClick={e=>deleteChat(chat.id,e)} style={{background:"none",border:"none",cursor:"pointer",padding:"2px 4px",color:"rgba(200,80,80,0.5)",fontSize:11}}>✕</button>
              </div>
            </div>
          ))}
        </div>

        <div style={{padding:"12px 16px",borderTop:"1px solid rgba(212,175,55,0.08)",display:"flex",alignItems:"center",gap:10}}>
          {user ? (
            <>
              {user.user_metadata?.avatar_url && (
                <img src={user.user_metadata.avatar_url} alt="avatar"
                  style={{width:28,height:28,borderRadius:"50%",border:"1px solid rgba(212,175,55,0.3)"}}/>
              )}
              <div style={{flex:1,overflow:"hidden"}}>
                <div style={{fontSize:12,color:"rgba(232,220,200,0.7)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  {user.user_metadata?.full_name || user.email}
                </div>
              </div>
              <button onClick={handleLogout} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(212,175,55,0.4)",fontSize:11,fontFamily:"inherit",padding:4}}>Sign out</button>
            </>
          ) : (
            <div style={{fontSize:11,color:"rgba(212,175,55,0.3)",letterSpacing:"0.04em"}}>Guest session</div>
          )}
        </div>
      </div>

      {/* Main */}
      <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>

        {/* Header */}
        <div style={{
          display:"flex",alignItems:"center",justifyContent:"space-between",
          padding:"16px 20px",
          borderBottom:"1px solid rgba(212,175,55,0.1)",
          background:"rgba(10,10,26,0.7)",backdropFilter:"blur(12px)",
          position:"sticky",top:0,zIndex:10
        }}>
          <button onClick={()=>setSidebarOpen(o=>!o)} style={{
            background:"none",border:"none",cursor:"pointer",
            color:"rgba(212,175,55,0.6)",fontSize:20,padding:"4px 8px",
            display:"flex",alignItems:"center",lineHeight:1
          }}>☰</button>

          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <CrossIcon/>
            <div style={{
              fontSize:20,fontWeight:700,letterSpacing:"0.12em",
              background:"linear-gradient(90deg,#c9a227,#f0d060,#c9a227,#f0d060)",
              backgroundSize:"200% auto",
              WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
              animation:"shimmer 4s linear infinite"
            }}>GOD MIND</div>
            <CrossIcon/>
          </div>

          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {prayersLeft <= 5 && (
              <div onClick={()=>setShowPaywall(true)} style={{
                fontSize:11,cursor:"pointer",
                color:prayersLeft<=2?"rgba(220,120,60,0.9)":"rgba(212,175,55,0.45)",
                textAlign:"right",lineHeight:1.3
              }}>
                <div style={{fontSize:16,fontWeight:600}}>{prayersLeft}</div>
                <div>left</div>
              </div>
            )}
            {!user && (
              <button onClick={handleLogin} style={{
                display:"flex",alignItems:"center",gap:7,
                background:"rgba(255,255,255,0.05)",
                border:"1px solid rgba(212,175,55,0.25)",
                borderRadius:20,padding:"6px 12px",cursor:"pointer",
                transition:"all 0.2s"
              }}
                onMouseEnter={e=>{e.currentTarget.style.background="rgba(212,175,55,0.12)";}}
                onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.05)";}}
              >
                <GoogleIcon/>
                <span style={{fontSize:11,color:"rgba(232,220,200,0.7)",letterSpacing:"0.04em",fontFamily:"inherit"}}>Sign in</span>
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div style={{flex:1,overflowY:"auto",padding:"24px 16px 8px",maxWidth:720,width:"100%",margin:"0 auto",alignSelf:"center",boxSizing:"border-box"}}>
          {messages.length === 0 && !activeChatId ? (
            <div style={{textAlign:"center",padding:"44px 20px",animation:"fadeIn 1s ease"}}>
              <div style={{fontSize:50,marginBottom:20}}>🙏</div>
              <h2 style={{fontSize:23,fontWeight:400,letterSpacing:"0.05em",color:"#D4AF37",marginBottom:14,lineHeight:1.5}}>
                Welcome, my child.
              </h2>
              <p style={{fontSize:15,color:"rgba(232,220,200,0.55)",lineHeight:1.9,maxWidth:440,margin:"0 auto"}}>
                Speak freely. Lay your burdens before Me.
              </p>
            </div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:20}}>
              {hasMoreMessages && (
                <div style={{textAlign:"center",paddingBottom:8}}>
                  <button onClick={loadEarlierMessages} disabled={loadingMore} style={{
                    background:"rgba(212,175,55,0.07)",border:"1px solid rgba(212,175,55,0.2)",
                    borderRadius:20,padding:"8px 20px",color:"rgba(212,175,55,0.6)",
                    fontSize:12,cursor:"pointer",fontFamily:"inherit",letterSpacing:"0.04em"
                  }}>
                    {loadingMore ? "Loading..." : `↑ Load earlier messages (${totalMessages - messages.length} more)`}
                  </button>
                </div>
              )}

              {messages.map((msg,i) => (
                <div key={i} style={{
                  display:"flex",
                  justifyContent:msg.role==="user"?"flex-end":"flex-start",
                  animation:"fadeIn 0.5s ease"
                }}>
                  {msg.role==="assistant" && (
                    <div style={{
                      width:34,height:34,borderRadius:"50%",flexShrink:0,
                      background:"linear-gradient(135deg,#1a1200,#2a1e00)",
                      border:"1px solid rgba(212,175,55,0.42)",
                      display:"flex",alignItems:"center",justifyContent:"center",
                      marginRight:10,marginTop:4,fontSize:14,color:"#D4AF37"
                    }}>✝</div>
                  )}
                  <div style={{
                    maxWidth:"82%",
                    background:msg.role==="user"
                      ?"linear-gradient(135deg,rgba(212,175,55,0.11),rgba(180,140,30,0.07))"
                      :"rgba(255,255,255,0.032)",
                    border:msg.role==="user"
                      ?"1px solid rgba(212,175,55,0.26)"
                      :"1px solid rgba(255,255,255,0.065)",
                    borderRadius:msg.role==="user"?"16px 4px 16px 16px":"4px 16px 16px 16px",
                    padding:"14px 18px"
                  }}>
                    <p style={{
                      margin:0,fontSize:14.5,lineHeight:1.92,
                      color:msg.role==="user"?"rgba(232,220,200,0.82)":"#ede4cf",
                      whiteSpace:"pre-wrap"
                    }}>{msg.content}</p>
                    {msg.role==="user" && (
                      <div style={{fontSize:11,color:"rgba(212,175,55,0.4)",marginTop:6,textAlign:"right",letterSpacing:"0.05em"}}>🙏 sent</div>
                    )}
                  </div>
                </div>
              ))}

              {showScriptureButton && (
                <div style={{display:"flex",justifyContent:"flex-start",paddingLeft:44,animation:"slideUp 0.45s ease"}}>
                  <button onClick={()=>sendMessage("Yes, please show me the scriptures")} disabled={loading} style={{
                    background:"rgba(212,175,55,0.09)",border:"1px solid rgba(212,175,55,0.32)",
                    borderRadius:22,padding:"9px 20px",color:"#D4AF37",
                    fontSize:13,cursor:"pointer",fontFamily:"inherit",
                    letterSpacing:"0.04em",display:"flex",alignItems:"center",gap:8
                  }}>📖 Yes, show me the scriptures</button>
                </div>
              )}

              {loading && (
                <div style={{display:"flex",alignItems:"flex-start",animation:"fadeIn 0.3s ease"}}>
                  <div style={{
                    width:34,height:34,borderRadius:"50%",flexShrink:0,
                    background:"linear-gradient(135deg,#1a1200,#2a1e00)",
                    border:"1px solid rgba(212,175,55,0.42)",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    marginRight:10,fontSize:14,color:"#D4AF37"
                  }}>✝</div>
                  <div style={{
                    background:"rgba(255,255,255,0.032)",border:"1px solid rgba(255,255,255,0.065)",
                    borderRadius:"4px 16px 16px 16px",padding:"14px 18px"
                  }}>
                    <LoadingDots/>
                    <div style={{fontSize:11,color:"rgba(212,175,55,0.36)",marginTop:5,letterSpacing:"0.06em"}}>Hearing your prayer...</div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef}/>
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{
          padding:"14px 16px 20px",
          borderTop:"1px solid rgba(212,175,55,0.09)",
          background:"rgba(10,10,26,0.9)",backdropFilter:"blur(16px)"
        }}>
          <div style={{maxWidth:720,margin:"0 auto",display:"flex",gap:10,alignItems:"flex-end"}}>
            <div style={{
              flex:1,background:"rgba(255,255,255,0.028)",
              border:"1px solid rgba(212,175,55,0.2)",borderRadius:14,padding:"12px 16px"
            }}>
              <textarea ref={textareaRef} value={input}
                onChange={e=>setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Speak to me..."
                rows={2}
                style={{
                  width:"100%",background:"transparent",border:"none",
                  color:"#e8dcc8",fontSize:14.5,lineHeight:1.7,
                  fontFamily:"inherit",letterSpacing:"0.01em",
                  caretColor:"#D4AF37",maxHeight:120,overflowY:"auto"
                }}
              />
            </div>
            <button onClick={()=>sendMessage()} disabled={loading||!input.trim()} style={{
              width:50,height:50,borderRadius:13,flexShrink:0,
              background:input.trim()&&!loading?"linear-gradient(135deg,#c9a227,#e8c84a)":"rgba(212,175,55,0.1)",
              border:"none",cursor:input.trim()&&!loading?"pointer":"not-allowed",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:21,transition:"all 0.22s",
              boxShadow:input.trim()&&!loading?"0 0 24px rgba(212,175,55,0.32)":"none"
            }}>🙏</button>
          </div>
          <p style={{textAlign:"center",fontSize:11,color:"rgba(212,175,55,0.26)",marginTop:10,letterSpacing:"0.08em"}}>
            "Ask and it will be given. Seek and you will find. Knock and the door will be opened." — Matthew 7:7-8
          </p>
        </div>
      </div>
    </div>
  );
}
