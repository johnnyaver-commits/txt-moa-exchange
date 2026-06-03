"use client";

import {
  Bell,
  Camera,
  CheckCircle2,
  Cloud,
  Database,
  Heart,
  Home,
  Lock,
  LogOut,
  MessageCircle,
  Plus,
  Search,
  Send,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  User,
} from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { isCloudinaryConfigured, uploadImage } from "@/lib/cloudinary";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type Category = "CD" | "照片小卡" | "小物";
type Status = "欲交換" | "徵求" | "已交換";
type View = "feed" | "search" | "create" | "messages" | "profile" | "admin";

type Member = {
  id: string;
  username: string;
  password?: string;
  displayName: string;
  bio: string;
  avatar: string;
  isAdmin?: boolean;
};

type Comment = {
  id: string;
  userId: string;
  text: string;
  createdAt: string;
};

type Post = {
  id: string;
  userId: string;
  title: string;
  content: string;
  category: Category;
  status: Status;
  tags: string[];
  image: string;
  likes: string[];
  comments: Comment[];
  createdAt: string;
};

type ChatMessage = {
  id: string;
  from: string;
  to: string;
  text: string;
  createdAt: string;
};

type ProfileRow = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_admin: boolean | null;
};

type PostRow = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: Category;
  status: Status;
  tags: string[] | null;
  image_url: string;
  created_at: string;
  profiles?: ProfileRow | null;
  comments?: Array<{
    id: string;
    user_id: string;
    content: string;
    created_at: string;
  }>;
  post_likes?: Array<{ user_id: string }>;
};

const now = () => new Date().toISOString();
const newId = () => crypto.randomUUID();
const fallbackImage = "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80";

const seedMembers: Member[] = [
  {
    id: "moa-admin",
    username: "admin",
    password: "admin123",
    displayName: "MOA 管理員",
    bio: "審核交換貼文、處理檢舉與維護社群安全。",
    avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=240&q=80",
    isAdmin: true,
  },
  {
    id: "yeonbin",
    username: "yeonbin",
    password: "txt123",
    displayName: "연빈收藏室",
    bio: "主收 TXT CD、藍色系小卡，可台北面交。",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=240&q=80",
  },
  {
    id: "moa-sora",
    username: "sora",
    password: "txt123",
    displayName: "Sora MOA",
    bio: "喜歡韓系手帳與演唱會小物交換。",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80",
  },
];

const seedPosts: Post[] = [
  {
    id: "post-1",
    userId: "yeonbin",
    title: "The Name Chapter CD 換 Beomgyu 小卡",
    content: "CD 保存良好，含歌詞本。想換 Beomgyu 或 Soobin 概念小卡，台北捷運可面交。",
    category: "CD",
    status: "欲交換",
    tags: ["TXT", "CD", "Beomgyu", "台北面交"],
    image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=80",
    likes: ["moa-sora"],
    comments: [{ id: "c1", userId: "moa-sora", text: "我有 Beomgyu 小卡，可以私訊看細圖嗎？", createdAt: now() }],
    createdAt: now(),
  },
  {
    id: "post-2",
    userId: "moa-sora",
    title: "演唱會手幅與壓克力吊飾",
    content: "想交換同系列 Huening Kai 小物，也歡迎分享收藏照。不販售，純交換。",
    category: "小物",
    status: "徵求",
    tags: ["手幅", "吊飾", "HueningKai", "純交換"],
    image: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=80",
    likes: ["yeonbin"],
    comments: [],
    createdAt: now(),
  },
  {
    id: "post-3",
    userId: "moa-admin",
    title: "交換守則：請保留聊天紀錄與出貨照片",
    content: "平台不提供金流，只作為 TXT 周邊交換分享。請勿公開個資，遇到可疑內容請檢舉。",
    category: "照片小卡",
    status: "已交換",
    tags: ["公告", "安全交換", "MOA"],
    image: "https://images.unsplash.com/photo-1517142089942-ba376ce32a2e?auto=format&fit=crop&w=900&q=80",
    likes: [],
    comments: [],
    createdAt: now(),
  },
];

const seedMessages: ChatMessage[] = [
  { id: "m1", from: "moa-sora", to: "yeonbin", text: "嗨，我想看 CD 內頁狀況～", createdAt: now() },
  { id: "m2", from: "yeonbin", to: "moa-sora", text: "可以，我等等補照片給你。", createdAt: now() },
];

const memberById = (members: Member[], userId: string) =>
  members.find((member) => member.id === userId) ?? members[0];

const authEmail = (username: string) =>
  username.includes("@") ? username : `${username.toLowerCase().replace(/[^a-z0-9._-]/g, "")}@moa.local`;

const profileToMember = (profile: ProfileRow): Member => ({
  id: profile.id,
  username: profile.username,
  displayName: profile.display_name || profile.username,
  bio: profile.bio || "正在整理 TXT 收藏。",
  avatar: profile.avatar_url || `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(profile.username)}`,
  isAdmin: Boolean(profile.is_admin),
});

const rowToPost = (row: PostRow): Post => ({
  id: row.id,
  userId: row.user_id,
  title: row.title,
  content: row.content,
  category: row.category,
  status: row.status,
  tags: row.tags || [],
  image: row.image_url,
  likes: row.post_likes?.map((like) => like.user_id) || [],
  comments:
    row.comments?.map((comment) => ({
      id: comment.id,
      userId: comment.user_id,
      text: comment.content,
      createdAt: comment.created_at,
    })) || [],
  createdAt: row.created_at,
});

export default function HomePage() {
  const [members, setMembers] = useState<Member[]>(seedMembers);
  const [posts, setPosts] = useState<Post[]>(seedPosts);
  const [messages, setMessages] = useState<ChatMessage[]>(seedMessages);
  const [currentUserId, setCurrentUserId] = useState("yeonbin");
  const [activeView, setActiveView] = useState<View>("feed");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"全部" | Category>("全部");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authForm, setAuthForm] = useState({ username: "yeonbin", password: "txt123", displayName: "" });
  const [postForm, setPostForm] = useState({
    title: "",
    content: "",
    category: "CD" as Category,
    status: "欲交換" as Status,
    tags: "",
    image: "",
  });
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [chatTarget, setChatTarget] = useState("moa-sora");
  const [chatText, setChatText] = useState("");
  const [notice, setNotice] = useState("Demo 模式：設定 Supabase 與 Cloudinary 環境變數後會自動切換為雲端資料。");
  const [uploading, setUploading] = useState(false);
  const [cloudUserId, setCloudUserId] = useState<string | null>(null);
  const backendEnabled = isSupabaseConfigured && Boolean(supabase);

  useEffect(() => {
    if (!backendEnabled || !supabase) {
      const raw = localStorage.getItem("txt-moa-state");
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        members: Member[];
        posts: Post[];
        messages: ChatMessage[];
        currentUserId: string;
      };
      queueMicrotask(() => {
        setMembers(parsed.members);
        setPosts(parsed.posts);
        setMessages(parsed.messages);
        setCurrentUserId(parsed.currentUserId);
      });
      return;
    }

    const client = supabase;
    void loadCloudData();
    const channel = client
      .channel("moa-market-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => void loadCloudData())
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, () => void loadCloudData())
      .on("postgres_changes", { event: "*", schema: "public", table: "post_likes" }, () => void loadCloudData())
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [backendEnabled]);

  useEffect(() => {
    if (backendEnabled) return;
    localStorage.setItem("txt-moa-state", JSON.stringify({ members, posts, messages, currentUserId }));
  }, [backendEnabled, members, posts, messages, currentUserId]);

  const currentUser = memberById(members, currentUserId);
  const mustLoginForCloud = backendEnabled && !cloudUserId;
  const visiblePosts = useMemo(() => {
    const text = query.trim().toLowerCase();
    return posts.filter((post) => {
      const matchesCategory = category === "全部" || post.category === category;
      const author = memberById(members, post.userId);
      const haystack = [post.title, post.content, post.category, post.status, ...post.tags, author.displayName]
        .join(" ")
        .toLowerCase();
      return matchesCategory && (!text || haystack.includes(text));
    });
  }, [category, members, posts, query]);

  async function loadCloudData() {
    if (!supabase) return;
    const [profilesResult, postsResult, sessionResult] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase
        .from("posts")
        .select("*, comments(id,user_id,content,created_at), post_likes(user_id)")
        .order("created_at", { ascending: false }),
      supabase.auth.getSession(),
    ]);

    if (profilesResult.error || postsResult.error) {
      setNotice("Supabase 已設定，但資料表尚未建立或 RLS 尚未允許讀取。請先執行 supabase/schema.sql。");
      return;
    }

    const cloudMembers = ((profilesResult.data || []) as ProfileRow[]).map(profileToMember);
    const cloudPosts = ((postsResult.data || []) as PostRow[]).map(rowToPost);
    setMembers(cloudMembers.length ? cloudMembers : seedMembers);
    setPosts(cloudPosts.length ? cloudPosts : seedPosts);

    const sessionUserId = sessionResult.data.session?.user.id;
    if (sessionUserId) {
      setCurrentUserId(sessionUserId);
      setNotice(`雲端模式：Supabase 已連線${isCloudinaryConfigured ? "，Cloudinary 圖片上傳已啟用。" : "。未設定 Cloudinary 時圖片會留在瀏覽器暫存。"}`);
    } else {
      setCloudUserId(null);
      if (cloudMembers[0]) setCurrentUserId(cloudMembers[0].id);
    }
    setCloudUserId(sessionUserId || null);
  }

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!backendEnabled || !supabase) {
      handleDemoAuth();
      return;
    }

    const email = authEmail(authForm.username);
    if (authMode === "login") {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: authForm.password });
      if (error) {
        setNotice(error.message);
        return;
      }
      setCurrentUserId(data.user.id);
      await loadCloudData();
      setActiveView("feed");
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password: authForm.password,
      options: { data: { username: authForm.username, display_name: authForm.displayName || authForm.username } },
    });
    if (error || !data.user) {
      setNotice(error?.message || "註冊失敗");
      return;
    }

    await supabase.from("profiles").upsert({
      id: data.user.id,
      username: authForm.username,
      display_name: authForm.displayName || authForm.username,
      bio: "新加入的 MOA，正在整理 TXT 收藏。",
      avatar_url: `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(authForm.username)}`,
    });
    setCurrentUserId(data.user.id);
    await loadCloudData();
    setActiveView("feed");
  }

  function handleDemoAuth() {
    if (authMode === "login") {
      const found = members.find((member) => member.username === authForm.username && member.password === authForm.password);
      if (found) {
        setCurrentUserId(found.id);
        setActiveView("feed");
      } else {
        setNotice("Demo 帳號不存在，請用 README 的測試帳號或切到註冊。");
      }
      return;
    }

    const newMember: Member = {
      id: newId(),
      username: authForm.username,
      password: authForm.password,
      displayName: authForm.displayName || authForm.username,
      bio: "新加入的 MOA，正在整理 TXT 收藏。",
      avatar: `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(authForm.username)}`,
    };
    setMembers((list) => [newMember, ...list]);
    setCurrentUserId(newMember.id);
    setActiveView("feed");
  }

  async function handleImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const imageUrl = await uploadImage(file);
      setPostForm((form) => ({ ...form, image: imageUrl }));
      setNotice(isCloudinaryConfigured ? "圖片已上傳到 Cloudinary。" : "圖片已載入 demo 暫存。設定 Cloudinary 後會改為雲端圖片。");
    } catch {
      setNotice("圖片上傳失敗，請確認 Cloudinary upload preset 是否為 unsigned。");
    } finally {
      setUploading(false);
    }
  }

  async function createPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextPost: Post = {
      id: newId(),
      userId: currentUserId,
      title: postForm.title,
      content: postForm.content,
      category: postForm.category,
      status: postForm.status,
      tags: postForm.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      image: postForm.image || fallbackImage,
      likes: [],
      comments: [],
      createdAt: now(),
    };

    if (backendEnabled && supabase) {
      if (!cloudUserId) {
        setNotice("Supabase 雲端模式已啟用。請先登入會員，再發佈貼文。");
        return;
      }
      const { error } = await supabase.from("posts").insert({
        user_id: cloudUserId,
        title: nextPost.title,
        content: nextPost.content,
        category: nextPost.category,
        status: nextPost.status,
        tags: nextPost.tags,
        image_url: nextPost.image,
      });
      if (error) {
        setNotice(error.message);
        return;
      }
      await loadCloudData();
    } else {
      setPosts((list) => [nextPost, ...list]);
    }

    setPostForm({ title: "", content: "", category: "CD", status: "欲交換", tags: "", image: "" });
    setActiveView("feed");
  }

  async function toggleLike(postId: string) {
    const post = posts.find((item) => item.id === postId);
    if (!post) return;
    const liked = post.likes.includes(currentUserId);

    if (backendEnabled && supabase) {
      if (!cloudUserId) {
        setNotice("請先登入會員，再按讚。");
        return;
      }
      if (liked) {
        await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", cloudUserId);
      } else {
        await supabase.from("post_likes").insert({ post_id: postId, user_id: cloudUserId });
      }
      await loadCloudData();
      return;
    }

    setPosts((list) =>
      list.map((item) =>
        item.id === postId
          ? { ...item, likes: liked ? item.likes.filter((like) => like !== currentUserId) : [...item.likes, currentUserId] }
          : item,
      ),
    );
  }

  async function addComment(postId: string) {
    const text = commentDrafts[postId]?.trim();
    if (!text) return;

    if (backendEnabled && supabase) {
      if (!cloudUserId) {
        setNotice("請先登入會員，再留言。");
        return;
      }
      const { error } = await supabase.from("comments").insert({ post_id: postId, user_id: cloudUserId, content: text });
      if (error) {
        setNotice(error.message);
        return;
      }
      await loadCloudData();
    } else {
      setPosts((list) =>
        list.map((post) =>
          post.id === postId ? { ...post, comments: [...post.comments, { id: newId(), userId: currentUserId, text, createdAt: now() }] } : post,
        ),
      );
    }
    setCommentDrafts((drafts) => ({ ...drafts, [postId]: "" }));
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!chatText.trim()) return;
    const nextMessage = { id: newId(), from: currentUserId, to: chatTarget, text: chatText.trim(), createdAt: now() };

    if (backendEnabled && supabase) {
      if (!cloudUserId) {
        setNotice("請先登入會員，再傳送私訊。");
        return;
      }
      const { error } = await supabase.from("messages").insert({ sender_id: cloudUserId, receiver_id: chatTarget, content: chatText.trim() });
      if (error) {
        setNotice(error.message);
        return;
      }
    }

    setMessages((list) => [...list, nextMessage]);
    setChatText("");
  }

  async function signOut() {
    if (backendEnabled && supabase) {
      await supabase.auth.signOut();
    }
    setCloudUserId(null);
    setCurrentUserId("yeonbin");
    setActiveView("feed");
  }

  const navItems = [
    { key: "feed", label: "首頁", icon: Home },
    { key: "search", label: "搜尋", icon: Search },
    { key: "create", label: "發佈", icon: Plus },
    { key: "messages", label: "私訊", icon: MessageCircle },
    { key: "profile", label: "我的", icon: User },
  ] as const;

  return (
    <main className="min-h-screen bg-[#f7f4ef] text-[#211f1d]">
      <header className="sticky top-0 z-30 border-b border-[#e4d9cf] bg-[#fffaf4]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <button className="flex items-center gap-3" onClick={() => setActiveView("feed")} type="button">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#222222] text-white">
              <Sparkles size={21} />
            </span>
            <span>
              <span className="block text-left text-lg font-black tracking-[0.12em]">MOA MARKET</span>
              <span className="block text-left text-xs text-[#7a7168]">TXT 周邊交換社群</span>
            </span>
          </button>
          <div className="hidden items-center gap-2 md:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button className={`nav-button ${activeView === item.key ? "nav-button-active" : ""}`} key={item.key} onClick={() => setActiveView(item.key)} type="button">
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}
            {currentUser.isAdmin && (
              <button className={`nav-button ${activeView === "admin" ? "nav-button-active" : ""}`} onClick={() => setActiveView("admin")} type="button">
                <ShieldCheck size={18} />
                管理
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button className="icon-button" title="通知" type="button">
              <Bell size={20} />
            </button>
            <img alt={currentUser.displayName} className="h-10 w-10 rounded-full object-cover ring-2 ring-[#98b7a6]" src={currentUser.avatar} />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 pb-24 pt-5 lg:grid-cols-[260px_1fr_310px]">
        <aside className="hidden lg:block">
          <section className="panel">
            <div className="flex items-center gap-3">
              <img alt={currentUser.displayName} className="h-14 w-14 rounded-full object-cover" src={currentUser.avatar} />
              <div>
                <p className="font-bold">{currentUser.displayName}</p>
                <p className="text-sm text-[#7a7168]">@{currentUser.username}</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-[#5f5750]">{currentUser.bio}</p>
            <div className="mt-5 grid grid-cols-3 gap-2 text-center text-sm">
              <Metric label="貼文" value={posts.filter((post) => post.userId === currentUserId).length} />
              <Metric label="追蹤" value={18} />
              <Metric label="粉絲" value={126} />
            </div>
          </section>
          <section className="panel mt-4">
            <h2 className="section-title">雲端狀態</h2>
            <StatusRow icon={Database} active={backendEnabled} label={backendEnabled ? "Supabase 已連線" : "Supabase 未設定"} />
            <StatusRow icon={Cloud} active={isCloudinaryConfigured} label={isCloudinaryConfigured ? "Cloudinary 已啟用" : "Cloudinary 未設定"} />
          </section>
          <section className="panel mt-4">
            <h2 className="section-title">交換分類</h2>
            {(["全部", "CD", "照片小卡", "小物"] as const).map((item) => (
              <button className={`filter-row ${category === item ? "filter-row-active" : ""}`} key={item} onClick={() => setCategory(item)} type="button">
                <ShoppingBag size={18} />
                {item}
              </button>
            ))}
          </section>
        </aside>

        <section className="min-w-0">
          {notice && <div className="mb-4 rounded-lg border border-[#d8ccc0] bg-[#fffaf4] px-4 py-3 text-sm text-[#5f5750]">{notice}</div>}

          {activeView === "feed" && (
            <>
              <Hero currentUser={currentUser} setActiveView={setActiveView} />
              <PostList
                addComment={addComment}
                commentDrafts={commentDrafts}
                currentUserId={currentUserId}
                members={members}
                posts={visiblePosts}
                setChatTarget={setChatTarget}
                setCommentDrafts={setCommentDrafts}
                setActiveView={setActiveView}
                toggleLike={toggleLike}
              />
            </>
          )}

          {activeView === "search" && (
            <section className="panel">
              <h1 className="page-title">搜尋 TXT 周邊</h1>
              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_180px]">
                <label className="input-shell">
                  <Search size={18} />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋成員、標籤、商品狀態" />
                </label>
                <select className="select-shell" value={category} onChange={(event) => setCategory(event.target.value as "全部" | Category)}>
                  <option>全部</option>
                  <option>CD</option>
                  <option>照片小卡</option>
                  <option>小物</option>
                </select>
              </div>
              <PostList
                addComment={addComment}
                commentDrafts={commentDrafts}
                currentUserId={currentUserId}
                members={members}
                posts={visiblePosts}
                setChatTarget={setChatTarget}
                setCommentDrafts={setCommentDrafts}
                setActiveView={setActiveView}
                toggleLike={toggleLike}
              />
            </section>
          )}

          {activeView === "create" && (
            <section className="panel">
              <h1 className="page-title">發佈交換貼文</h1>
              {mustLoginForCloud ? (
                <div className="mt-5">
                  <p className="mb-4 rounded-lg bg-[#f3eee7] px-4 py-3 text-sm font-bold text-[#5f5750]">
                    請先登入會員，再發佈交換貼文。
                  </p>
                  <AuthPanel
                    authForm={authForm}
                    authMode={authMode}
                    onAuth={handleAuth}
                    setAuthForm={setAuthForm}
                    setAuthMode={setAuthMode}
                  />
                </div>
              ) : (
                <form className="mt-5 grid gap-4" onSubmit={createPost}>
                  <input className="field" required value={postForm.title} onChange={(event) => setPostForm({ ...postForm, title: event.target.value })} placeholder="商品標題，例如：Blue Hour CD 換小卡" />
                  <textarea className="field min-h-28" required value={postForm.content} onChange={(event) => setPostForm({ ...postForm, content: event.target.value })} placeholder="描述保存狀況、希望交換品項、面交/寄送方式" />
                  <div className="grid gap-3 sm:grid-cols-3">
                    <select className="field" value={postForm.category} onChange={(event) => setPostForm({ ...postForm, category: event.target.value as Category })}>
                      <option>CD</option>
                      <option>照片小卡</option>
                      <option>小物</option>
                    </select>
                    <select className="field" value={postForm.status} onChange={(event) => setPostForm({ ...postForm, status: event.target.value as Status })}>
                      <option>欲交換</option>
                      <option>徵求</option>
                      <option>已交換</option>
                    </select>
                    <input className="field" value={postForm.tags} onChange={(event) => setPostForm({ ...postForm, tags: event.target.value })} placeholder="標籤，以逗號分隔" />
                  </div>
                  <label className="upload-box">
                    <Camera size={24} />
                    <span>{uploading ? "圖片上傳中..." : postForm.image ? "已選擇照片，可重新上傳" : "上傳商品照片"}</span>
                    <input accept="image/*" className="hidden" type="file" onChange={handleImage} />
                  </label>
                  {postForm.image && <img alt="貼文預覽" className="aspect-[4/3] w-full rounded-lg object-cover" src={postForm.image} />}
                  <p className="text-sm text-[#7a7168]">標題與描述為必填；圖片可選，未上傳時會使用預設圖片。</p>
                  <button className="primary-button disabled:cursor-not-allowed disabled:opacity-60" disabled={uploading} type="submit">
                    <Plus size={19} />
                    {uploading ? "等待圖片上傳" : "發佈到交換牆"}
                  </button>
                </form>
              )}
            </section>
          )}

          {activeView === "messages" && (
            <section className="panel min-h-[620px]">
              <h1 className="page-title">私訊交換細節</h1>
              <div className="mt-5 grid gap-4 md:grid-cols-[190px_1fr]">
                <div className="space-y-2">
                  {members.filter((member) => member.id !== currentUserId).map((member) => (
                    <button className={`chat-user ${chatTarget === member.id ? "chat-user-active" : ""}`} key={member.id} onClick={() => setChatTarget(member.id)} type="button">
                      <img alt={member.displayName} src={member.avatar} />
                      <span>{member.displayName}</span>
                    </button>
                  ))}
                </div>
                <div className="flex min-h-[480px] flex-col rounded-lg border border-[#e1d7cc] bg-[#fffdf8]">
                  <div className="flex-1 space-y-3 overflow-y-auto p-4">
                    {messages
                      .filter((message) => [message.from, message.to].includes(currentUserId) && [message.from, message.to].includes(chatTarget))
                      .map((message) => (
                        <div className={`message ${message.from === currentUserId ? "message-me" : ""}`} key={message.id}>
                          {message.text}
                        </div>
                      ))}
                  </div>
                  <form className="flex gap-2 border-t border-[#e1d7cc] p-3" onSubmit={sendMessage}>
                    <input className="field flex-1" value={chatText} onChange={(event) => setChatText(event.target.value)} placeholder="輸入訊息，約交換時間或照片細節" />
                    <button className="icon-button bg-[#222] text-white" type="submit">
                      <Send size={18} />
                    </button>
                  </form>
                </div>
              </div>
            </section>
          )}

          {activeView === "profile" && (
            <section className="panel">
              {mustLoginForCloud && (
                <div className="mb-6 lg:hidden">
                  <h1 className="page-title">會員登入</h1>
                  <p className="mt-2 mb-4 text-sm text-[#7a7168]">登入後可以發佈交換貼文、留言與私訊。</p>
                  <AuthPanel
                    authForm={authForm}
                    authMode={authMode}
                    onAuth={handleAuth}
                    setAuthForm={setAuthForm}
                    setAuthMode={setAuthMode}
                  />
                </div>
              )}
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <img alt={currentUser.displayName} className="h-24 w-24 rounded-full object-cover ring-4 ring-[#c7ded2]" src={currentUser.avatar} />
                <div className="flex-1">
                  <h1 className="page-title">{currentUser.displayName}</h1>
                  <p className="mt-2 text-[#5f5750]">{currentUser.bio}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge>公開帳號</Badge>
                    <Badge>不開放金流</Badge>
                    <Badge>{backendEnabled ? "雲端同步" : "Demo 暫存"}</Badge>
                  </div>
                </div>
                <button className="secondary-button" onClick={signOut} type="button">
                  <LogOut size={18} />
                  登出
                </button>
              </div>
            </section>
          )}

          {activeView === "admin" && currentUser.isAdmin && (
            <section className="panel">
              <h1 className="page-title">管理後台</h1>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <AdminCard label="待審核貼文" value="3" />
                <AdminCard label="檢舉留言" value="1" />
                <AdminCard label="活躍會員" value={members.length.toString()} />
              </div>
              <div className="mt-6 space-y-3">
                {posts.map((post) => (
                  <div className="flex items-center justify-between rounded-lg border border-[#e1d7cc] bg-white p-4" key={post.id}>
                    <div>
                      <p className="font-bold">{post.title}</p>
                      <p className="text-sm text-[#7a7168]">{post.status} · {post.category}</p>
                    </div>
                    <button className="secondary-button" type="button">
                      <CheckCircle2 size={18} />
                      通過
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </section>

        <aside className="hidden lg:block">
          <section className="panel">
            <h2 className="section-title">會員登入</h2>
            <AuthPanel
              authForm={authForm}
              authMode={authMode}
              onAuth={handleAuth}
              setAuthForm={setAuthForm}
              setAuthMode={setAuthMode}
            />
          </section>
          <section className="panel mt-4">
            <h2 className="section-title">推薦 MOA</h2>
            <div className="mt-4 space-y-3">
              {members.filter((member) => member.id !== currentUserId).map((member) => (
                <div className="flex items-center gap-3" key={member.id}>
                  <img alt={member.displayName} className="h-10 w-10 rounded-full object-cover" src={member.avatar} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{member.displayName}</p>
                    <p className="text-xs text-[#7a7168]">@{member.username}</p>
                  </div>
                  <button className="mini-button" type="button">追蹤</button>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-[#e4d9cf] bg-[#fffaf4] px-2 py-2 shadow-[0_-8px_20px_rgba(60,45,30,0.08)] md:hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button className={`mobile-tab ${activeView === item.key ? "mobile-tab-active" : ""}`} key={item.key} onClick={() => setActiveView(item.key)} type="button">
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </main>
  );
}

function Hero({ currentUser, setActiveView }: { currentUser: Member; setActiveView: (view: View) => void }) {
  return (
    <section className="mb-5 overflow-hidden rounded-lg bg-[#1f1e1c] text-white">
      <div className="grid gap-0 md:grid-cols-[1.1fr_0.9fr]">
        <div className="p-6 sm:p-8">
          <p className="text-sm font-bold tracking-[0.22em] text-[#9ed0bd]">TXT MERCH EXCHANGE</p>
          <h1 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">MOA 的 CD、小卡與演唱會小物交換牆</h1>
          <p className="mt-4 max-w-xl leading-7 text-[#e7ded5]">像 IG / FB 一樣發照片、留言、按讚與私訊，不串金流，只專注安全交換與收藏分享。</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button className="hero-button" onClick={() => setActiveView("create")} type="button">
              <Plus size={19} />
              發佈交換
            </button>
            <button className="hero-button hero-button-muted" onClick={() => setActiveView("messages")} type="button">
              <MessageCircle size={19} />
              開啟私訊
            </button>
          </div>
        </div>
        <div className="relative min-h-72">
          <img alt="韓式收藏桌面" className="absolute inset-0 h-full w-full object-cover" src="https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1100&q=80" />
          <div className="absolute bottom-4 left-4 right-4 rounded-lg bg-white/90 p-4 text-[#211f1d] shadow-xl backdrop-blur">
            <p className="text-sm text-[#7a7168]">目前登入</p>
            <div className="mt-2 flex items-center gap-3">
              <img alt={currentUser.displayName} className="h-11 w-11 rounded-full object-cover" src={currentUser.avatar} />
              <p className="font-black">{currentUser.displayName}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PostList(props: {
  posts: Post[];
  members: Member[];
  currentUserId: string;
  commentDrafts: Record<string, string>;
  setCommentDrafts: (value: Record<string, string>) => void;
  toggleLike: (postId: string) => void;
  addComment: (postId: string) => void;
  setChatTarget: (id: string) => void;
  setActiveView: (view: View) => void;
}) {
  if (!props.posts.length) {
    return <div className="panel mt-4 text-center text-[#7a7168]">目前沒有符合條件的交換貼文。</div>;
  }

  return (
    <div className="mt-4 space-y-5">
      {props.posts.map((post) => {
        const author = memberById(props.members, post.userId);
        return (
          <article className="post-card" key={post.id}>
            <div className="flex items-center gap-3 p-4">
              <img alt={author.displayName} className="h-11 w-11 rounded-full object-cover" src={author.avatar} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-black">{author.displayName}</p>
                <p className="text-xs text-[#7a7168]">{post.category} · {post.status}</p>
              </div>
              <Badge>{post.status}</Badge>
            </div>
            <img alt={post.title} className="aspect-[4/3] w-full object-cover" src={post.image} />
            <div className="space-y-4 p-4">
              <div>
                <h2 className="text-xl font-black">{post.title}</h2>
                <p className="mt-2 leading-7 text-[#4c4640]">{post.content}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => <Badge key={tag}>#{tag}</Badge>)}
              </div>
              <div className="flex items-center gap-2">
                <button className="action-button" onClick={() => props.toggleLike(post.id)} type="button">
                  <Heart className={post.likes.includes(props.currentUserId) ? "fill-[#d65f5f] text-[#d65f5f]" : ""} size={19} />
                  {post.likes.length}
                </button>
                <button className="action-button" type="button">
                  <MessageCircle size={19} />
                  {post.comments.length}
                </button>
                <button
                  className="action-button ml-auto"
                  onClick={() => {
                    props.setChatTarget(author.id);
                    props.setActiveView("messages");
                  }}
                  type="button"
                >
                  <Send size={18} />
                  私訊
                </button>
              </div>
              <div className="space-y-2">
                {post.comments.map((comment) => {
                  const commenter = memberById(props.members, comment.userId);
                  return (
                    <p className="rounded-lg bg-[#f3eee7] px-3 py-2 text-sm" key={comment.id}>
                      <b>{commenter.displayName}</b> {comment.text}
                    </p>
                  );
                })}
                <div className="flex gap-2">
                  <input
                    className="field flex-1"
                    value={props.commentDrafts[post.id] ?? ""}
                    onChange={(event) => props.setCommentDrafts({ ...props.commentDrafts, [post.id]: event.target.value })}
                    placeholder="留言詢問保存狀況或交換方式"
                  />
                  <button className="icon-button bg-[#222] text-white" onClick={() => props.addComment(post.id)} type="button">
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function AuthPanel({
  authForm,
  authMode,
  onAuth,
  setAuthForm,
  setAuthMode,
}: {
  authForm: { username: string; password: string; displayName: string };
  authMode: "login" | "register";
  onAuth: (event: FormEvent<HTMLFormElement>) => void;
  setAuthForm: (value: { username: string; password: string; displayName: string }) => void;
  setAuthMode: (value: "login" | "register") => void;
}) {
  return (
    <form className="mt-4 grid gap-3" onSubmit={onAuth}>
      <div className="grid grid-cols-2 rounded-lg bg-[#ece3d8] p-1 text-sm font-bold">
        <button className={`rounded-md py-2 ${authMode === "login" ? "bg-white" : ""}`} onClick={() => setAuthMode("login")} type="button">
          登入
        </button>
        <button className={`rounded-md py-2 ${authMode === "register" ? "bg-white" : ""}`} onClick={() => setAuthMode("register")} type="button">
          註冊
        </button>
      </div>
      <label className="input-shell">
        <User size={18} />
        <input value={authForm.username} onChange={(event) => setAuthForm({ ...authForm, username: event.target.value })} placeholder="帳號或 Email" required />
      </label>
      {authMode === "register" && (
        <label className="input-shell">
          <Sparkles size={18} />
          <input value={authForm.displayName} onChange={(event) => setAuthForm({ ...authForm, displayName: event.target.value })} placeholder="暱稱" />
        </label>
      )}
      <label className="input-shell">
        <Lock size={18} />
        <input type="password" value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} placeholder="密碼" required />
      </label>
      <button className="primary-button" type="submit">
        {authMode === "login" ? "登入" : "建立帳號"}
      </button>
    </form>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-[#f3eee7] px-2 py-3">
      <p className="font-black">{value}</p>
      <p className="text-xs text-[#7a7168]">{label}</p>
    </div>
  );
}

function StatusRow({ icon: Icon, active, label }: { icon: typeof Database; active: boolean; label: string }) {
  return (
    <div className="mt-3 flex items-center gap-3 rounded-lg bg-[#f3eee7] px-3 py-2 text-sm font-bold">
      <Icon size={18} className={active ? "text-[#315c4b]" : "text-[#9a4e40]"} />
      {label}
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-[#e3f0e9] px-3 py-1 text-xs font-bold text-[#315c4b]">{children}</span>;
}

function AdminCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#222] p-5 text-white">
      <p className="text-3xl font-black">{value}</p>
      <p className="mt-1 text-sm text-[#d9cec4]">{label}</p>
    </div>
  );
}
