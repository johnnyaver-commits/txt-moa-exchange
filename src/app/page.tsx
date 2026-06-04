"use client";

import {
  AlertTriangle,
  Bell,
  Bookmark,
  Camera,
  Cloud,
  Database,
  Edit3,
  Eye,
  EyeOff,
  Flag,
  Minus,
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
  Star,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
  User,
} from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { isCloudinaryConfigured, uploadImage } from "@/lib/cloudinary";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type Category = "CD" | "照片小卡" | "小物";
type Status = "欲交換" | "徵求" | "洽談中" | "已保留" | "已完成" | "取消交換" | "已交換";
type DmPolicy = "everyone" | "following" | "mutual";
type View = "feed" | "search" | "create" | "messages" | "profile" | "public-profile" | "notifications" | "admin";
type AuthMode = "login" | "register" | "forgot";

type Member = {
  id: string;
  username: string;
  password?: string;
  displayName: string;
  bio: string;
  avatar: string;
  isAdmin?: boolean;
  isBlocked?: boolean;
  dmPolicy?: DmPolicy;
  hidePublicPosts?: boolean;
  hidePublicComments?: boolean;
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
  isHidden?: boolean;
  createdAt: string;
};

type ChatMessage = {
  id: string;
  from: string;
  to: string;
  text: string;
  postId?: string | null;
  readAt?: string | null;
  createdAt: string;
};

type SavedPost = { postId: string; userId: string; createdAt: string };
type SavedPostRow = { post_id: string; user_id: string; created_at: string };

type UserBlock = { blockerId: string; blockedId: string; createdAt: string };
type UserBlockRow = { blocker_id: string; blocked_id: string; created_at: string };

type ExchangeReview = {
  id: string;
  postId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment: string;
  createdAt: string;
};

type ExchangeReviewRow = {
  id: string;
  post_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_admin: boolean | null;
  is_blocked?: boolean | null;
  dm_policy?: DmPolicy | null;
  hide_public_posts?: boolean | null;
  hide_public_comments?: boolean | null;
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
  is_hidden?: boolean;
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

type MessageRow = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  post_id?: string | null;
  read_at?: string | null;
  created_at: string;
};

type Report = {
  id: string;
  reporterId: string;
  category: string;
  reason: string;
  status: string;
  postId: string | null;
  commentId: string | null;
  resolution: string | null;
  createdAt: string;
};

type ReportRow = {
  id: string;
  reporter_id: string;
  category: string | null;
  reason: string;
  status: string;
  post_id: string | null;
  comment_id: string | null;
  resolution: string | null;
  created_at: string;
};

type Follow = { followerId: string; followeeId: string; createdAt: string };
type FollowRow = { follower_id: string; followee_id: string; created_at: string };

type NotificationItem = {
  id: string;
  userId: string;
  actorId: string | null;
  type: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  postId: string | null;
};

type NotificationRow = {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: string;
  content: string;
  is_read: boolean;
  created_at: string;
  post_id: string | null;
};

const now = () => new Date().toISOString();
const newId = () => crypto.randomUUID();
const fallbackImage = "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80";
const categories = ["CD", "照片小卡", "小物"] as const;
const postStatuses = ["欲交換", "徵求", "洽談中", "已保留", "已完成", "取消交換", "已交換"] as const;
const activeExchangeStatuses: Status[] = ["欲交換", "徵求", "洽談中", "已保留"];
const reportCategories = ["詐騙疑慮", "不實廣告", "不當內容", "重複洗版", "其他"] as const;
const dmPolicyLabels: Record<DmPolicy, string> = {
  everyone: "所有會員可私訊",
  following: "只允許我追蹤的人",
  mutual: "只允許互追的人",
};

const seedMembers: Member[] = [
  {
    id: "moa-admin",
    username: "admin",
    password: "admin123",
    displayName: "MOA 管理員",
    bio: "審核交換貼文、處理檢舉與維護社群安全。",
  avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=240&q=80",
  isAdmin: true,
  isBlocked: false,
  dmPolicy: "everyone",
  hidePublicPosts: false,
  hidePublicComments: false,
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

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
const publicUsernameFromEmail = (email: string, userId: string) => {
  const localPart = email.split("@")[0].toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 20) || "moa";
  return `${localPart}_${userId.replace(/-/g, "").slice(0, 6)}`;
};

const loginErrorMessage = (message?: string) => {
  const normalized = message?.toLowerCase() || "";
  if (normalized.includes("invalid login credentials") || normalized.includes("invalid credentials")) {
    return "E-mail 或密碼錯誤，請重新輸入。";
  }
  if (normalized.includes("email not confirmed")) {
    return "Email 尚未驗證，請先到信箱完成驗證。";
  }
  return message || "登入失敗，請確認 E-mail 與密碼。";
};

const profileToMember = (profile: ProfileRow): Member => ({
  id: profile.id,
  username: profile.username,
  displayName: profile.display_name || profile.username,
  bio: profile.bio || "正在整理 TXT 收藏。",
  avatar: profile.avatar_url || `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(profile.username)}`,
  isAdmin: Boolean(profile.is_admin),
  isBlocked: Boolean(profile.is_blocked),
  dmPolicy: profile.dm_policy || "everyone",
  hidePublicPosts: Boolean(profile.hide_public_posts),
  hidePublicComments: Boolean(profile.hide_public_comments),
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
  isHidden: Boolean(row.is_hidden),
  comments:
    row.comments?.map((comment) => ({
      id: comment.id,
      userId: comment.user_id,
      text: comment.content,
      createdAt: comment.created_at,
    })) || [],
  createdAt: row.created_at,
});

const rowToMessage = (row: MessageRow): ChatMessage => ({
  id: row.id,
  from: row.sender_id,
  to: row.receiver_id,
  text: row.content,
  postId: row.post_id || null,
  readAt: row.read_at || null,
  createdAt: row.created_at,
});

const rowToReport = (row: ReportRow): Report => ({
  id: row.id,
  reporterId: row.reporter_id,
  category: row.category || "其他",
  reason: row.reason,
  status: row.status,
  postId: row.post_id,
  commentId: row.comment_id,
  resolution: row.resolution,
  createdAt: row.created_at,
});

const rowToSavedPost = (row: SavedPostRow): SavedPost => ({
  postId: row.post_id,
  userId: row.user_id,
  createdAt: row.created_at,
});

const rowToFollow = (row: FollowRow): Follow => ({
  followerId: row.follower_id,
  followeeId: row.followee_id,
  createdAt: row.created_at,
});

const rowToUserBlock = (row: UserBlockRow): UserBlock => ({
  blockerId: row.blocker_id,
  blockedId: row.blocked_id,
  createdAt: row.created_at,
});

const rowToExchangeReview = (row: ExchangeReviewRow): ExchangeReview => ({
  id: row.id,
  postId: row.post_id,
  reviewerId: row.reviewer_id,
  revieweeId: row.reviewee_id,
  rating: row.rating,
  comment: row.comment || "",
  createdAt: row.created_at,
});

const rowToNotification = (row: NotificationRow): NotificationItem => ({
  id: row.id,
  userId: row.user_id,
  actorId: row.actor_id,
  type: row.type,
  content: row.content,
  isRead: row.is_read,
  createdAt: row.created_at,
  postId: row.post_id,
});

export default function HomePage() {
  const [members, setMembers] = useState<Member[]>(seedMembers);
  const [posts, setPosts] = useState<Post[]>(seedPosts);
  const [messages, setMessages] = useState<ChatMessage[]>(seedMessages);
  const [reports, setReports] = useState<Report[]>([]);
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
  const [follows, setFollows] = useState<Follow[]>([]);
  const [userBlocks, setUserBlocks] = useState<UserBlock[]>([]);
  const [exchangeReviews, setExchangeReviews] = useState<ExchangeReview[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [currentUserId, setCurrentUserId] = useState("yeonbin");
  const [selectedProfileId, setSelectedProfileId] = useState("yeonbin");
  const [activeView, setActiveView] = useState<View>("feed");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"全部" | Category>("全部");
  const [statusFilter, setStatusFilter] = useState<"全部" | Status>("全部");
  const [memberFilter, setMemberFilter] = useState("");
  const [idolFilter, setIdolFilter] = useState("");
  const [albumFilter, setAlbumFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [followingOnly, setFollowingOnly] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authForm, setAuthForm] = useState({ email: "", password: "", displayName: "" });
  const [postForm, setPostForm] = useState({
    title: "",
    content: "",
    category: "CD" as Category,
    status: "欲交換" as Status,
    tags: "",
    image: "",
  });
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editPostForm, setEditPostForm] = useState({
    title: "",
    content: "",
    category: "CD" as Category,
    status: "欲交換" as Status,
    tags: "",
  });
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [chatTarget, setChatTarget] = useState("moa-sora");
  const [chatText, setChatText] = useState("");
  const [chatPostId, setChatPostId] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    displayName: "",
    bio: "",
    avatar: "",
    dmPolicy: "everyone" as DmPolicy,
    hidePublicPosts: false,
    hidePublicComments: false,
  });
  const [editingPassword, setEditingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ password: "", confirmPassword: "" });
  const [passwordUpdating, setPasswordUpdating] = useState(false);
  const [notice, setNotice] = useState("Demo 模式：設定 Supabase 與 Cloudinary 環境變數後會自動切換為雲端資料。");
  const [uploading, setUploading] = useState(false);
  const [profileUploading, setProfileUploading] = useState(false);
  const [cloudUserId, setCloudUserId] = useState<string | null>(null);
  const [viewerImage, setViewerImage] = useState<{ src: string; alt: string } | null>(null);
  const backendEnabled = isSupabaseConfigured && Boolean(supabase);

  useEffect(() => {
    if (!backendEnabled || !supabase) {
      const raw = localStorage.getItem("txt-moa-state");
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        members: Member[];
        posts: Post[];
        messages: ChatMessage[];
        follows?: Follow[];
        savedPosts?: SavedPost[];
        userBlocks?: UserBlock[];
        exchangeReviews?: ExchangeReview[];
        notifications?: NotificationItem[];
        currentUserId: string;
      };
      queueMicrotask(() => {
        setMembers(parsed.members);
        setPosts(parsed.posts);
        setMessages(parsed.messages);
        setFollows(parsed.follows || []);
        setSavedPosts(parsed.savedPosts || []);
        setUserBlocks(parsed.userBlocks || []);
        setExchangeReviews(parsed.exchangeReviews || []);
        setNotifications(parsed.notifications || []);
        setCurrentUserId(parsed.currentUserId);
      });
      return;
    }

    const client = supabase;
    void loadCloudData();
    const { data: authListener } = client.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session?.user.id) {
        setCloudUserId(session.user.id);
        setCurrentUserId(session.user.id);
        setActiveView("profile");
        setEditingPassword(true);
        setNotice("請設定新密碼。");
      }
    });
    const channel = client
      .channel("moa-market-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => void loadCloudData())
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, () => void loadCloudData())
      .on("postgres_changes", { event: "*", schema: "public", table: "post_likes" }, () => void loadCloudData())
      .on("postgres_changes", { event: "*", schema: "public", table: "post_saves" }, () => void loadCloudData())
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => void loadCloudData())
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => void loadCloudData())
      .on("postgres_changes", { event: "*", schema: "public", table: "follows" }, () => void loadCloudData())
      .on("postgres_changes", { event: "*", schema: "public", table: "user_blocks" }, () => void loadCloudData())
      .on("postgres_changes", { event: "*", schema: "public", table: "exchange_reviews" }, () => void loadCloudData())
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => void loadCloudData())
      .subscribe();

    return () => {
      authListener.subscription.unsubscribe();
      void client.removeChannel(channel);
    };
  }, [backendEnabled]);

  useEffect(() => {
    if (backendEnabled) return;
    localStorage.setItem("txt-moa-state", JSON.stringify({ members, posts, messages, follows, savedPosts, userBlocks, exchangeReviews, notifications, currentUserId }));
  }, [backendEnabled, members, posts, messages, follows, savedPosts, userBlocks, exchangeReviews, notifications, currentUserId]);

  useEffect(() => {
    if (!viewerImage) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setViewerImage(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewerImage]);

  useEffect(() => {
    if (activeView !== "messages" || !chatTarget) return;
    const unreadIds = messages.filter((message) => message.from === chatTarget && message.to === currentUserId && !message.readAt).map((message) => message.id);
    if (!unreadIds.length) return;
    const readAt = now();
    if (backendEnabled && supabase) {
      void supabase.from("messages").update({ read_at: readAt }).in("id", unreadIds);
    }
    queueMicrotask(() => {
      setMessages((list) => list.map((message) => (unreadIds.includes(message.id) ? { ...message, readAt } : message)));
    });
  }, [activeView, backendEnabled, chatTarget, currentUserId, messages]);

  const currentUser = memberById(members, currentUserId);
  const mustLoginForCloud = backendEnabled && !cloudUserId;
  const isAuthenticated = !backendEnabled || Boolean(cloudUserId);
  const blockedNotice = "你的帳號已被管理員限制發言與發布，請聯絡管理員處理。";
  const unreadNotifications = notifications.filter((notification) => !notification.isRead).length;
  const selectedProfile = memberById(members, selectedProfileId);
  const canViewSelectedPosts = selectedProfile.id === currentUserId || currentUser.isAdmin || !selectedProfile.hidePublicPosts;
  const canViewSelectedComments = selectedProfile.id === currentUserId || currentUser.isAdmin || !selectedProfile.hidePublicComments;
  const selectedProfilePosts = canViewSelectedPosts
    ? posts.filter((post) => post.userId === selectedProfile.id && (!post.isHidden || currentUser.isAdmin || post.userId === currentUserId))
    : [];
  const selectedProfileComments = canViewSelectedComments
    ? posts
        .flatMap((post) =>
          post.comments
            .filter((comment) => comment.userId === selectedProfile.id)
            .map((comment) => ({ ...comment, postId: post.id, postTitle: post.title, postHidden: post.isHidden })),
        )
        .filter((comment) => !comment.postHidden || currentUser.isAdmin || selectedProfile.id === currentUserId)
    : [];
  const followerCount = (memberId: string) => follows.filter((follow) => follow.followeeId === memberId).length;
  const followingCount = (memberId: string) => follows.filter((follow) => follow.followerId === memberId).length;
  const isFollowing = (memberId: string) => follows.some((follow) => follow.followerId === currentUserId && follow.followeeId === memberId);
  const isFollowedBy = (memberId: string) => follows.some((follow) => follow.followerId === memberId && follow.followeeId === currentUserId);
  const canMessageMember = (member: Member) => {
    if (member.id === currentUserId) return false;
    if (currentUser.isBlocked || member.isBlocked || isMutuallyBlocked(member.id)) return false;
    if ((member.dmPolicy || "everyone") === "everyone") return true;
    if (member.dmPolicy === "following") return isFollowedBy(member.id);
    return isFollowedBy(member.id) && isFollowing(member.id);
  };
  const isSaved = (postId: string) => savedPosts.some((save) => save.userId === currentUserId && save.postId === postId);
  const isBlockedByMe = (memberId: string) => userBlocks.some((block) => block.blockerId === currentUserId && block.blockedId === memberId);
  const isMutuallyBlocked = (memberId: string) =>
    userBlocks.some((block) => [block.blockerId, block.blockedId].includes(currentUserId) && [block.blockerId, block.blockedId].includes(memberId));
  const reviewsForUser = (memberId: string) => exchangeReviews.filter((review) => review.revieweeId === memberId);
  const averageRating = (memberId: string) => {
    const list = reviewsForUser(memberId);
    if (!list.length) return "尚無";
    return (list.reduce((sum, review) => sum + review.rating, 0) / list.length).toFixed(1);
  };
  const conversationMessages = messages.filter((message) => [message.from, message.to].includes(currentUserId) && [message.from, message.to].includes(chatTarget));
  const chatPartner = memberById(members, chatTarget);
  const chatPost = chatPostId ? posts.find((post) => post.id === chatPostId) || null : null;
  const isChatBlocked = Boolean(currentUser.isBlocked || chatPartner?.isBlocked || isMutuallyBlocked(chatTarget) || (chatPartner && !canMessageMember(chatPartner)));
  const unreadMessageCount = (memberId?: string) =>
    messages.filter((message) => message.to === currentUserId && !message.readAt && (!memberId || message.from === memberId)).length;
  const chatMembers = members
    .filter((member) => member.id !== currentUserId)
    .sort((a, b) => {
      const latestFor = (memberId: string) =>
        messages
          .filter((message) => [message.from, message.to].includes(currentUserId) && [message.from, message.to].includes(memberId))
          .map((message) => new Date(message.createdAt).getTime())
          .sort((left, right) => right - left)[0] || 0;
      return latestFor(b.id) - latestFor(a.id);
    });

  const visiblePosts = useMemo(() => {
    const text = query.trim().toLowerCase();
    const memberText = memberFilter.trim().toLowerCase();
    const idolText = idolFilter.trim().toLowerCase();
    const albumText = albumFilter.trim().toLowerCase();
    const regionText = regionFilter.trim().toLowerCase();
    const followingIds = new Set(follows.filter((follow) => follow.followerId === currentUserId).map((follow) => follow.followeeId));
    return posts.filter((post) => {
      if (post.isHidden && !currentUser.isAdmin) return false;
      if (text === "saved:me" && !savedPosts.some((save) => save.userId === currentUserId && save.postId === post.id)) return false;
      const matchesCategory = category === "全部" || post.category === category;
      const matchesStatus = statusFilter === "全部" || post.status === statusFilter;
      const matchesAvailable = !onlyAvailable || activeExchangeStatuses.includes(post.status);
      const matchesFollowing = !followingOnly || followingIds.has(post.userId);
      const author = memberById(members, post.userId);
      const haystack = [post.title, post.content, post.category, post.status, ...post.tags, author.displayName, author.username, author.bio]
        .join(" ")
        .toLowerCase();
      const matchesText = !text || text === "saved:me" || haystack.includes(text);
      const matchesMember = !memberText || author.displayName.toLowerCase().includes(memberText) || author.username.toLowerCase().includes(memberText);
      const matchesIdol = !idolText || haystack.includes(idolText);
      const matchesAlbum = !albumText || haystack.includes(albumText);
      const matchesRegion = !regionText || haystack.includes(regionText);
      return matchesCategory && matchesStatus && matchesAvailable && matchesFollowing && matchesText && matchesMember && matchesIdol && matchesAlbum && matchesRegion;
    });
  }, [albumFilter, category, currentUser.isAdmin, currentUserId, followingOnly, follows, idolFilter, memberFilter, members, onlyAvailable, posts, query, regionFilter, savedPosts, statusFilter]);

  async function loadCloudData() {
    if (!supabase) return;
    const [profilesResult, postsResult, followsResult, reviewsResult, sessionResult] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase
        .from("posts")
        .select("*, comments(id,user_id,content,created_at), post_likes(user_id)")
        .order("created_at", { ascending: false }),
      supabase.from("follows").select("follower_id,followee_id,created_at").order("created_at", { ascending: false }),
      supabase.from("exchange_reviews").select("id,post_id,reviewer_id,reviewee_id,rating,comment,created_at").order("created_at", { ascending: false }),
      supabase.auth.getSession(),
    ]);

    if (profilesResult.error || postsResult.error || followsResult.error) {
      setNotice("Supabase 已設定，但資料表尚未建立或 RLS 尚未允許讀取。請先執行 supabase/schema.sql。");
      return;
    }

    const cloudMembers = ((profilesResult.data || []) as ProfileRow[]).map(profileToMember);
    const cloudPosts = ((postsResult.data || []) as PostRow[]).map(rowToPost);
    const cloudFollows = ((followsResult.data || []) as FollowRow[]).map(rowToFollow);
    const cloudReviews = ((reviewsResult.data || []) as ExchangeReviewRow[]).map(rowToExchangeReview);
    setMembers(cloudMembers.length ? cloudMembers : seedMembers);
    setPosts(cloudPosts.length ? cloudPosts : seedPosts);
    setFollows(cloudFollows);
    setExchangeReviews(cloudReviews);

    const sessionUserId = sessionResult.data.session?.user.id;
    if (sessionUserId) {
      setCurrentUserId(sessionUserId);
      const firstChatTarget = cloudMembers.find((member) => member.id !== sessionUserId)?.id;
      if (firstChatTarget && !cloudMembers.some((member) => member.id === chatTarget)) setChatTarget(firstChatTarget);
      setNotice(`雲端模式：Supabase 已連線${isCloudinaryConfigured ? "，Cloudinary 圖片上傳已啟用。" : "。未設定 Cloudinary 時圖片會留在瀏覽器暫存。"}`);
      const { data: messageRows, error: messagesError } = await supabase
        .from("messages")
        .select("id,sender_id,receiver_id,content,post_id,read_at,created_at")
        .order("created_at", { ascending: true });
      if (!messagesError) setMessages(((messageRows || []) as MessageRow[]).map(rowToMessage));
      const { data: reportRows, error: reportsError } = await supabase
        .from("reports")
        .select("id,reporter_id,category,reason,status,post_id,comment_id,resolution,created_at")
        .order("created_at", { ascending: false });
      if (!reportsError) setReports(((reportRows || []) as ReportRow[]).map(rowToReport));
      const { data: savedRows, error: savedError } = await supabase
        .from("post_saves")
        .select("post_id,user_id,created_at")
        .order("created_at", { ascending: false });
      if (!savedError) setSavedPosts(((savedRows || []) as SavedPostRow[]).map(rowToSavedPost));
      const { data: blockRows, error: blockError } = await supabase
        .from("user_blocks")
        .select("blocker_id,blocked_id,created_at")
        .order("created_at", { ascending: false });
      if (!blockError) setUserBlocks(((blockRows || []) as UserBlockRow[]).map(rowToUserBlock));
      const { data: notificationRows, error: notificationsError } = await supabase
        .from("notifications")
        .select("id,user_id,actor_id,type,content,is_read,created_at,post_id")
        .order("created_at", { ascending: false });
      if (!notificationsError) setNotifications(((notificationRows || []) as NotificationRow[]).map(rowToNotification));
    } else {
      setCloudUserId(null);
      setReports([]);
      setSavedPosts([]);
      setUserBlocks([]);
      setNotifications([]);
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

    const email = authForm.email.trim().toLowerCase();
    if (!isValidEmail(email)) {
      const message = "請輸入有效的 E-mail 地址。";
      setNotice(message);
      window.alert(message);
      return;
    }
    if (authMode === "forgot") {
      const redirectTo = window.location.origin;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) {
        setNotice(error.message);
        return;
      }
      setNotice("已寄出密碼重設信，請到信箱點擊連結後回到網站設定新密碼。");
      setAuthForm({ email: "", password: "", displayName: "" });
      setAuthMode("login");
      return;
    }

    if (authMode === "login") {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: authForm.password });
      if (error) {
        const message = loginErrorMessage(error.message);
        setNotice(message);
        setAuthForm((form) => ({ ...form, password: "" }));
        window.alert(message);
        return;
      }
      setCloudUserId(data.user.id);
      setCurrentUserId(data.user.id);
      await loadCloudData();
      setActiveView("feed");
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password: authForm.password,
      options: { data: { display_name: authForm.displayName || email.split("@")[0] } },
    });
    if (error || !data.user) {
      setNotice(error?.message || "註冊失敗");
      return;
    }

    const publicUsername = publicUsernameFromEmail(email, data.user.id);
    await supabase.from("profiles").upsert({
      id: data.user.id,
      username: publicUsername,
      display_name: authForm.displayName || email.split("@")[0],
      bio: "新加入的 MOA，正在整理 TXT 收藏。",
      avatar_url: `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(publicUsername)}`,
    });
    setCloudUserId(data.user.id);
    setCurrentUserId(data.user.id);
    await loadCloudData();
    setActiveView("feed");
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (passwordForm.password.length < 6) {
      setNotice("新密碼至少需要 6 個字元。");
      return;
    }
    if (passwordForm.password !== passwordForm.confirmPassword) {
      setNotice("兩次輸入的新密碼不一致。");
      return;
    }

    if (backendEnabled && supabase) {
      setPasswordUpdating(true);
      try {
        const { error } = await supabase.auth.updateUser({ password: passwordForm.password });
        if (error) {
          setNotice(error.message);
          return;
        }
        setNotice("密碼已更新，之後請使用新密碼登入。");
      } finally {
        setPasswordUpdating(false);
      }
    } else {
      setMembers((list) =>
        list.map((member) => (member.id === currentUserId ? { ...member, password: passwordForm.password } : member)),
      );
      setNotice("Demo 密碼已更新。");
    }

    setPasswordForm({ password: "", confirmPassword: "" });
    setEditingPassword(false);
  }

  function handleDemoAuth() {
    const email = authForm.email.trim().toLowerCase();
    if (!isValidEmail(email)) {
      setNotice("請輸入有效的 E-mail 地址。");
      return;
    }
    if (authMode === "forgot") {
      setNotice("Demo 模式不支援寄送重設密碼信，請使用 Supabase 雲端模式。");
      return;
    }
    if (authMode === "login") {
      const found = members.find((member) => `${member.username}@moa.demo` === email && member.password === authForm.password);
      if (found) {
        setCurrentUserId(found.id);
        setActiveView("feed");
      } else {
        setNotice("Demo 帳號不存在，請用 README 的測試帳號或切到註冊。");
      }
      return;
    }

    const newMemberId = newId();
    const newMember: Member = {
      id: newMemberId,
      username: publicUsernameFromEmail(email, newMemberId),
      password: authForm.password,
      displayName: authForm.displayName || email.split("@")[0],
      bio: "新加入的 MOA，正在整理 TXT 收藏。",
      avatar: `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(email)}`,
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

  async function handleAvatarImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setProfileUploading(true);
    try {
      const imageUrl = await uploadImage(file);
      setProfileForm((form) => ({ ...form, avatar: imageUrl }));
      setNotice(isCloudinaryConfigured ? "頭像已上傳到 Cloudinary，請按儲存資料完成更新。" : "頭像已載入預覽，請按儲存資料完成更新。");
    } catch {
      setNotice("頭像上傳失敗，請確認 Cloudinary upload preset 是否為 unsigned。");
    } finally {
      setProfileUploading(false);
      event.target.value = "";
    }
  }

  function openPublicProfile(memberId: string) {
    setSelectedProfileId(memberId);
    setActiveView(memberId === currentUserId ? "profile" : "public-profile");
  }

  function openChat(memberId: string, postId?: string) {
    setChatTarget(memberId);
    setChatPostId(postId || null);
    setActiveView("messages");
  }

  async function createNotification(input: { userId: string; type: string; content: string; postId?: string; commentId?: string; messageId?: string }) {
    if (input.userId === currentUserId) return;
    if (backendEnabled && supabase && cloudUserId) {
      await supabase.from("notifications").insert({
        user_id: input.userId,
        actor_id: cloudUserId,
        type: input.type,
        content: input.content,
        post_id: input.postId || null,
        comment_id: input.commentId || null,
        message_id: input.messageId || null,
      });
      return;
    }
    setNotifications((list) => [
      { id: newId(), userId: input.userId, actorId: currentUserId, type: input.type, content: input.content, isRead: false, createdAt: now(), postId: input.postId || null },
      ...list,
    ]);
  }

  async function toggleFollow(member: Member) {
    if (member.id === currentUserId) return;
    if (currentUser.isBlocked) {
      setNotice(blockedNotice);
      window.alert(blockedNotice);
      return;
    }
    const followed = isFollowing(member.id);
    if (backendEnabled && supabase) {
      if (!cloudUserId) {
        setNotice("請先登入會員後再追蹤。");
        return;
      }
      if (followed) {
        await supabase.from("follows").delete().eq("follower_id", cloudUserId).eq("followee_id", member.id);
      } else {
        const { error } = await supabase.from("follows").insert({ follower_id: cloudUserId, followee_id: member.id });
        if (error) {
          setNotice(error.message);
          return;
        }
        await createNotification({ userId: member.id, type: "follow", content: `${currentUser.displayName} 開始追蹤你。` });
      }
      await loadCloudData();
      return;
    }
    setFollows((list) =>
      followed
        ? list.filter((follow) => !(follow.followerId === currentUserId && follow.followeeId === member.id))
        : [{ followerId: currentUserId, followeeId: member.id, createdAt: now() }, ...list],
    );
    if (!followed) await createNotification({ userId: member.id, type: "follow", content: `${currentUser.displayName} 開始追蹤你。` });
  }

  async function toggleSavePost(post: Post) {
    if (currentUser.isBlocked) {
      setNotice(blockedNotice);
      window.alert(blockedNotice);
      return;
    }
    const saved = isSaved(post.id);
    if (backendEnabled && supabase) {
      if (!cloudUserId) {
        setNotice("請先登入會員，再收藏貼文。");
        return;
      }
      if (saved) {
        await supabase.from("post_saves").delete().eq("post_id", post.id).eq("user_id", cloudUserId);
      } else {
        const { error } = await supabase.from("post_saves").insert({ post_id: post.id, user_id: cloudUserId });
        if (error) {
          setNotice(error.message);
          return;
        }
        await createNotification({ userId: post.userId, type: "save", content: `${currentUser.displayName} 收藏了你的貼文。`, postId: post.id });
      }
      await loadCloudData();
      return;
    }
    setSavedPosts((list) =>
      saved
        ? list.filter((save) => !(save.postId === post.id && save.userId === currentUserId))
        : [{ postId: post.id, userId: currentUserId, createdAt: now() }, ...list],
    );
  }

  async function toggleUserBlock(member: Member) {
    if (member.id === currentUserId) return;
    const blocked = isBlockedByMe(member.id);
    if (!window.confirm(`${blocked ? "解除黑名單" : "加入黑名單"} ${member.displayName}？${blocked ? "" : "加入後雙方將不能私訊。"}`)) return;
    if (backendEnabled && supabase) {
      if (!cloudUserId) {
        setNotice("請先登入會員，再管理黑名單。");
        return;
      }
      if (blocked) {
        await supabase.from("user_blocks").delete().eq("blocker_id", cloudUserId).eq("blocked_id", member.id);
      } else {
        const { error } = await supabase.from("user_blocks").insert({ blocker_id: cloudUserId, blocked_id: member.id });
        if (error) {
          setNotice(error.message);
          return;
        }
      }
      await loadCloudData();
      return;
    }
    setUserBlocks((list) =>
      blocked
        ? list.filter((block) => !(block.blockerId === currentUserId && block.blockedId === member.id))
        : [{ blockerId: currentUserId, blockedId: member.id, createdAt: now() }, ...list],
    );
  }

  async function submitExchangeReview(post: Post) {
    if (post.userId === currentUserId) return;
    if (!["已完成", "已交換"].includes(post.status)) {
      setNotice("只有已完成的交換貼文可以評價。");
      return;
    }
    const existing = exchangeReviews.find((review) => review.postId === post.id && review.reviewerId === currentUserId && review.revieweeId === post.userId);
    const ratingText = window.prompt("請輸入 1-5 星評價", existing?.rating.toString() || "5");
    if (!ratingText) return;
    const rating = Number(ratingText);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      setNotice("評價星等需為 1 到 5。");
      return;
    }
    const comment = window.prompt("請輸入評價內容（可留空）", existing?.comment || "") || "";
    if (backendEnabled && supabase) {
      if (!cloudUserId) {
        setNotice("請先登入會員，再留下評價。");
        return;
      }
      const { error } = await supabase.from("exchange_reviews").upsert(
        {
          post_id: post.id,
          reviewer_id: cloudUserId,
          reviewee_id: post.userId,
          rating,
          comment: comment.trim(),
        },
        { onConflict: "post_id,reviewer_id,reviewee_id" },
      );
      if (error) {
        setNotice(error.message);
        return;
      }
      await createNotification({ userId: post.userId, type: "review", content: `${currentUser.displayName} 完成了一則交換評價。`, postId: post.id });
      await loadCloudData();
      return;
    }
    const nextReview: ExchangeReview = {
      id: existing?.id || newId(),
      postId: post.id,
      reviewerId: currentUserId,
      revieweeId: post.userId,
      rating,
      comment: comment.trim(),
      createdAt: existing?.createdAt || now(),
    };
    setExchangeReviews((list) => [nextReview, ...list.filter((review) => review.id !== nextReview.id)]);
  }

  async function markNotificationsRead() {
    if (!notifications.some((notification) => !notification.isRead)) return;
    if (backendEnabled && supabase && cloudUserId) {
      await supabase.from("notifications").update({ is_read: true }).eq("user_id", cloudUserId).eq("is_read", false);
      await loadCloudData();
      return;
    }
    setNotifications((list) => list.map((notification) => ({ ...notification, isRead: true })));
  }

  async function createPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (currentUser.isBlocked) {
      setNotice(blockedNotice);
      window.alert(blockedNotice);
      return;
    }
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

  function startEditPost(post: Post) {
    setEditingPostId(post.id);
    setEditPostForm({
      title: post.title,
      content: post.content,
      category: post.category,
      status: post.status,
      tags: post.tags.join(", "),
    });
  }

  async function savePostEdit(postId: string) {
    const tags = editPostForm.tags.split(",").map((tag) => tag.trim()).filter(Boolean);
    if (backendEnabled && supabase) {
      const { error } = await supabase
        .from("posts")
        .update({
          title: editPostForm.title,
          content: editPostForm.content,
          category: editPostForm.category,
          status: editPostForm.status,
          tags,
        })
        .eq("id", postId);
      if (error) {
        setNotice(error.message);
        return;
      }
      await loadCloudData();
    } else {
      setPosts((list) =>
        list.map((post) =>
          post.id === postId
            ? { ...post, title: editPostForm.title, content: editPostForm.content, category: editPostForm.category, status: editPostForm.status, tags }
            : post,
        ),
      );
    }
    setEditingPostId(null);
  }

  async function deletePost(postId: string) {
    if (!window.confirm("確定要刪除這篇貼文嗎？")) return;
    if (backendEnabled && supabase) {
      const { error } = await supabase.from("posts").delete().eq("id", postId);
      if (error) {
        setNotice(error.message);
        return;
      }
      await loadCloudData();
    } else {
      setPosts((list) => list.filter((post) => post.id !== postId));
    }
  }

  async function deleteComment(postId: string, commentId: string) {
    if (!window.confirm("確定要刪除這則留言嗎？")) return;
    if (backendEnabled && supabase) {
      const { error } = await supabase.from("comments").delete().eq("id", commentId);
      if (error) {
        setNotice(error.message);
        return;
      }
      await loadCloudData();
    } else {
      setPosts((list) => list.map((post) => (post.id === postId ? { ...post, comments: post.comments.filter((comment) => comment.id !== commentId) } : post)));
    }
  }

  async function reportPost(postId: string) {
    await createReport({ postId });
  }

  async function reportComment(commentId: string) {
    await createReport({ commentId });
  }

  async function createReport(target: { postId?: string; commentId?: string }) {
    const categoryInput = window.prompt(`請選擇檢舉分類：${reportCategories.join(" / ")}`, "不實廣告");
    if (!categoryInput?.trim()) return;
    const category = reportCategories.includes(categoryInput.trim() as (typeof reportCategories)[number]) ? categoryInput.trim() : "其他";
    const reason = window.prompt("請輸入檢舉原因補充");
    if (!reason?.trim()) return;
    if (backendEnabled && supabase) {
      if (!cloudUserId) {
        setNotice("請先登入會員，再檢舉內容。");
        return;
      }
      const { error } = await supabase.from("reports").insert({
        reporter_id: cloudUserId,
        post_id: target.postId || null,
        comment_id: target.commentId || null,
        category,
        reason: reason.trim(),
      });
      setNotice(error ? error.message : "已送出檢舉，管理員會進行審核。");
    } else {
      setNotice("已送出檢舉。");
    }
  }

  async function resolveReport(report: Report, status: "reviewed" | "dismissed") {
    if (!currentUser.isAdmin) return;
    const resolution = window.prompt(status === "reviewed" ? "請輸入處理結果，例如：已隱藏內容 / 已提醒會員" : "請輸入駁回原因", status === "reviewed" ? "已處理" : "未違反規範");
    if (!resolution?.trim()) return;
    if (backendEnabled && supabase) {
      const { error } = await supabase
        .from("reports")
        .update({ status, handled_at: now(), handled_by: cloudUserId, resolution: resolution.trim() })
        .eq("id", report.id);
      if (error) {
        setNotice(error.message);
        return;
      }
      if (status === "reviewed" && report.postId) {
        await supabase.from("posts").update({ is_hidden: true, hidden_at: now(), hidden_by: cloudUserId }).eq("id", report.postId);
      }
      await createNotification({
        userId: report.reporterId,
        type: "report_result",
        content: status === "reviewed" ? `你的檢舉已處理：${resolution.trim()}` : `你的檢舉已駁回：${resolution.trim()}`,
        postId: report.postId || undefined,
        commentId: report.commentId || undefined,
      });
      await loadCloudData();
      return;
    }
    setReports((list) => list.map((item) => (item.id === report.id ? { ...item, status, resolution: resolution.trim() } : item)));
    if (status === "reviewed" && report.postId) setPosts((list) => list.map((post) => (post.id === report.postId ? { ...post, isHidden: true } : post)));
  }

  async function togglePostHidden(post: Post) {
    if (!currentUser.isAdmin) return;
    if (backendEnabled && supabase) {
      const nextHidden = !post.isHidden;
      const { error } = await supabase
        .from("posts")
        .update({
          is_hidden: nextHidden,
          hidden_at: nextHidden ? now() : null,
          hidden_by: nextHidden ? cloudUserId : null,
        })
        .eq("id", post.id);
      if (error) {
        setNotice(error.message);
        return;
      }
      await loadCloudData();
    } else {
      setPosts((list) => list.map((item) => (item.id === post.id ? { ...item, isHidden: !item.isHidden } : item)));
    }
  }

  async function toggleMemberBlocked(member: Member) {
    if (!currentUser.isAdmin || member.id === currentUserId) return;
    const nextBlocked = !member.isBlocked;
    const action = nextBlocked ? "封鎖" : "解除封鎖";
    if (!window.confirm(`確定要${action} ${member.displayName}？${nextBlocked ? " 封鎖後他將不能發文、留言或私訊。" : ""}`)) return;

    if (backendEnabled && supabase) {
      const { error } = await supabase
        .from("profiles")
        .update({
          is_blocked: nextBlocked,
          blocked_at: nextBlocked ? now() : null,
          blocked_by: nextBlocked ? cloudUserId : null,
        })
        .eq("id", member.id);
      if (error) {
        setNotice(error.message);
        return;
      }
      await loadCloudData();
    } else {
      setMembers((list) => list.map((item) => (item.id === member.id ? { ...item, isBlocked: nextBlocked } : item)));
    }
    setNotice(`${member.displayName} 已${action}。`);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (backendEnabled && supabase) {
      if (!cloudUserId) {
        setNotice("請先登入會員，再編輯個人資料。");
        return;
      }
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: profileForm.displayName,
          bio: profileForm.bio,
          avatar_url: profileForm.avatar,
          dm_policy: profileForm.dmPolicy,
          hide_public_posts: profileForm.hidePublicPosts,
          hide_public_comments: profileForm.hidePublicComments,
        })
        .eq("id", cloudUserId);
      if (error) {
        setNotice(error.message);
        return;
      }
      await loadCloudData();
    } else {
      setMembers((list) =>
        list.map((member) =>
          member.id === currentUserId
            ? {
                ...member,
                displayName: profileForm.displayName,
                bio: profileForm.bio,
                avatar: profileForm.avatar,
                dmPolicy: profileForm.dmPolicy,
                hidePublicPosts: profileForm.hidePublicPosts,
                hidePublicComments: profileForm.hidePublicComments,
              }
            : member,
        ),
      );
    }
    setEditingProfile(false);
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
        await createNotification({ userId: post.userId, type: "like", content: `${currentUser.displayName} 對你的貼文按讚。`, postId });
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
    if (!liked) await createNotification({ userId: post.userId, type: "like", content: `${currentUser.displayName} 對你的貼文按讚。`, postId });
  }

  async function addComment(postId: string) {
    const text = commentDrafts[postId]?.trim();
    if (!text) return;
    if (currentUser.isBlocked) {
      setNotice(blockedNotice);
      window.alert(blockedNotice);
      return;
    }

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
      const post = posts.find((item) => item.id === postId);
      if (post) await createNotification({ userId: post.userId, type: "comment", content: `${currentUser.displayName} 留言了你的貼文。`, postId });
      await loadCloudData();
    } else {
      setPosts((list) =>
        list.map((post) =>
          post.id === postId ? { ...post, comments: [...post.comments, { id: newId(), userId: currentUserId, text, createdAt: now() }] } : post,
        ),
      );
      const post = posts.find((item) => item.id === postId);
      if (post) await createNotification({ userId: post.userId, type: "comment", content: `${currentUser.displayName} 留言了你的貼文。`, postId });
    }
    setCommentDrafts((drafts) => ({ ...drafts, [postId]: "" }));
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!chatText.trim()) return;
    if (isChatBlocked) {
      const message = currentUser.isBlocked
        ? blockedNotice
        : isMutuallyBlocked(chatTarget)
          ? "你或對方已將彼此加入黑名單，暫時不能私訊。"
          : chatPartner?.isBlocked
            ? "對方帳號目前已被管理員限制，暫時不能私訊。"
            : "對方已限制陌生人私訊，請先追蹤或互追後再傳訊息。";
      setNotice(message);
      window.alert(message);
      return;
    }
    const nextMessage = { id: newId(), from: currentUserId, to: chatTarget, text: chatText.trim(), postId: chatPostId, readAt: null, createdAt: now() };

    if (backendEnabled && supabase) {
      if (!cloudUserId) {
        setNotice("請先登入會員，再傳送私訊。");
        return;
      }
      const { error } = await supabase.from("messages").insert({ sender_id: cloudUserId, receiver_id: chatTarget, content: chatText.trim(), post_id: chatPostId });
      if (error) {
        setNotice(error.message);
        return;
      }
      await createNotification({ userId: chatTarget, type: "message", content: `${currentUser.displayName} 傳了新私訊給你。` });
      await loadCloudData();
    } else {
      setMessages((list) => [...list, nextMessage]);
      await createNotification({ userId: chatTarget, type: "message", content: `${currentUser.displayName} 傳了新私訊給你。` });
    }
    setChatText("");
    setChatPostId(null);
  }

  async function signOut() {
    if (backendEnabled && supabase) {
      await supabase.auth.signOut();
    }
    setCloudUserId(null);
    setCurrentUserId(members[0]?.id || "yeonbin");
    setAuthMode("login");
    setAuthForm({ email: "", password: "", displayName: "" });
    setEditingPassword(false);
    setPasswordForm({ password: "", confirmPassword: "" });
    setNotice("已登出。請重新登入後再發佈、留言或私訊。");
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
            {isAuthenticated && currentUser.isAdmin && (
              <button className={`nav-button ${activeView === "admin" ? "nav-button-active" : ""}`} onClick={() => setActiveView("admin")} type="button">
                <ShieldCheck size={18} />
                管理
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button className="icon-button relative" onClick={() => setActiveView(isAuthenticated ? "notifications" : "profile")} title={isAuthenticated ? "通知" : "登入"} type="button">
              <Bell size={20} />
              {isAuthenticated && unreadNotifications > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#b24731] px-1 text-[0.68rem] font-black text-white">
                  {unreadNotifications}
                </span>
              )}
            </button>
            {isAuthenticated ? (
              <img alt={currentUser.displayName} className="h-10 w-10 rounded-full object-cover ring-2 ring-[#98b7a6]" src={currentUser.avatar} />
            ) : (
              <button className="icon-button" onClick={() => setActiveView("profile")} title="會員登入" type="button">
                <User size={20} />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 pb-24 pt-5 lg:grid-cols-[260px_1fr_310px]">
        <aside className="hidden lg:block">
          <section className="panel">
            {isAuthenticated ? (
              <>
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
                  <Metric label="追蹤" value={followingCount(currentUserId)} />
                  <Metric label="粉絲" value={followerCount(currentUserId)} />
                </div>
              </>
            ) : (
              <>
                <h2 className="section-title">尚未登入</h2>
                <p className="mt-3 text-sm leading-6 text-[#5f5750]">登入後可以發佈貼文、留言、收藏與私訊。</p>
                <button className="primary-button mt-4 w-full" onClick={() => setActiveView("profile")} type="button">
                  <User size={18} />
                  會員登入
                </button>
              </>
            )}
          </section>
          <section className="panel mt-4">
            <h2 className="section-title">雲端狀態</h2>
            <StatusRow icon={Database} active={backendEnabled} label={backendEnabled ? "Supabase 已連線" : "Supabase 未設定"} />
            <StatusRow icon={Cloud} active={isCloudinaryConfigured} label={isCloudinaryConfigured ? "Cloudinary 已啟用" : "Cloudinary 未設定"} />
          </section>
          <section className="panel mt-4">
            <h2 className="section-title">交換分類</h2>
            {(["全部", ...categories] as const).map((item) => (
              <button className={`filter-row ${category === item ? "filter-row-active" : ""}`} key={item} onClick={() => setCategory(item)} type="button">
                <ShoppingBag size={18} />
                {item}
              </button>
            ))}
          </section>
          <section className="panel mt-4">
            <h2 className="section-title">快速篩選</h2>
            <label className="mt-3 flex items-center gap-2 text-sm font-bold text-[#5f5750]">
              <input checked={onlyAvailable} onChange={(event) => setOnlyAvailable(event.target.checked)} type="checkbox" />
              只看可交換
            </label>
            <label className="mt-3 flex items-center gap-2 text-sm font-bold text-[#5f5750]">
              <input checked={followingOnly} onChange={(event) => setFollowingOnly(event.target.checked)} type="checkbox" />
              只看已追蹤帳號
            </label>
            <button className="filter-row" onClick={() => setQuery("saved:me")} type="button">
              <Bookmark size={18} />
              我的收藏
            </button>
          </section>
        </aside>

        <section className="min-w-0">
          {notice && <div className="mb-4 rounded-lg border border-[#d8ccc0] bg-[#fffaf4] px-4 py-3 text-sm text-[#5f5750]">{notice}</div>}

          {activeView === "feed" && (
            <>
              <Hero currentUser={currentUser} isAuthenticated={isAuthenticated} setActiveView={setActiveView} />
              <PostList
                addComment={addComment}
                commentDrafts={commentDrafts}
                currentUserId={currentUserId}
                currentUser={currentUser}
                deleteComment={deleteComment}
                deletePost={deletePost}
                editingPostId={editingPostId}
                editPostForm={editPostForm}
                members={members}
                reportComment={reportComment}
                reportPost={reportPost}
                posts={visiblePosts}
                followerCount={followerCount}
                isFollowing={isFollowing}
                openPublicProfile={openPublicProfile}
                savePostEdit={savePostEdit}
                setChatTarget={openChat}
                setCommentDrafts={setCommentDrafts}
                setEditingPostId={setEditingPostId}
                setEditPostForm={setEditPostForm}
                setActiveView={setActiveView}
                startEditPost={startEditPost}
                toggleFollow={toggleFollow}
                togglePostHidden={togglePostHidden}
                openImageViewer={setViewerImage}
                toggleLike={toggleLike}
                toggleSavePost={toggleSavePost}
                isSaved={isSaved}
                reviewsForUser={reviewsForUser}
                averageRating={averageRating}
                submitExchangeReview={submitExchangeReview}
              />
            </>
          )}

          {activeView === "search" && (
            <section className="panel">
              <h1 className="page-title">搜尋 TXT 周邊</h1>
              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_180px]">
                <label className="input-shell">
                  <Search size={18} />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋成員、標籤、商品狀態" />
                </label>
                <select className="select-shell" value={category} onChange={(event) => setCategory(event.target.value as "全部" | Category)}>
                  <option>全部</option>
                  {categories.map((item) => <option key={item}>{item}</option>)}
                </select>
                <select className="select-shell" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "全部" | Status)}>
                  <option>全部</option>
                  {postStatuses.map((item) => <option key={item}>{item}</option>)}
                </select>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-4">
                <input className="field" value={memberFilter} onChange={(event) => setMemberFilter(event.target.value)} placeholder="依成員帳號/暱稱" />
                <input className="field" value={idolFilter} onChange={(event) => setIdolFilter(event.target.value)} placeholder="依團員，例如 Soobin" />
                <input className="field" value={albumFilter} onChange={(event) => setAlbumFilter(event.target.value)} placeholder="依專輯，例如 Blue Hour" />
                <input className="field" value={regionFilter} onChange={(event) => setRegionFilter(event.target.value)} placeholder="依地區，例如 台北" />
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-sm font-bold text-[#5f5750]">
                <label className="inline-flex items-center gap-2">
                  <input checked={onlyAvailable} onChange={(event) => setOnlyAvailable(event.target.checked)} type="checkbox" />
                  只看可交換
                </label>
                <label className="inline-flex items-center gap-2">
                  <input checked={followingOnly} onChange={(event) => setFollowingOnly(event.target.checked)} type="checkbox" />
                  只看已追蹤帳號
                </label>
                <button className="mini-button" onClick={() => setQuery(query === "saved:me" ? "" : "saved:me")} type="button">
                  {query === "saved:me" ? "取消收藏篩選" : "只看我的收藏"}
                </button>
              </div>
              <PostList
                addComment={addComment}
                commentDrafts={commentDrafts}
                currentUserId={currentUserId}
                currentUser={currentUser}
                deleteComment={deleteComment}
                deletePost={deletePost}
                editingPostId={editingPostId}
                editPostForm={editPostForm}
                members={members}
                reportComment={reportComment}
                reportPost={reportPost}
                posts={visiblePosts}
                followerCount={followerCount}
                isFollowing={isFollowing}
                openPublicProfile={openPublicProfile}
                savePostEdit={savePostEdit}
                setChatTarget={openChat}
                setCommentDrafts={setCommentDrafts}
                setEditingPostId={setEditingPostId}
                setEditPostForm={setEditPostForm}
                setActiveView={setActiveView}
                startEditPost={startEditPost}
                toggleFollow={toggleFollow}
                togglePostHidden={togglePostHidden}
                openImageViewer={setViewerImage}
                toggleLike={toggleLike}
                toggleSavePost={toggleSavePost}
                isSaved={isSaved}
                reviewsForUser={reviewsForUser}
                averageRating={averageRating}
                submitExchangeReview={submitExchangeReview}
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
                      {categories.map((item) => <option key={item}>{item}</option>)}
                    </select>
                    <select className="field" value={postForm.status} onChange={(event) => setPostForm({ ...postForm, status: event.target.value as Status })}>
                      {postStatuses.map((item) => <option key={item}>{item}</option>)}
                    </select>
                    <input className="field" value={postForm.tags} onChange={(event) => setPostForm({ ...postForm, tags: event.target.value })} placeholder="標籤，以逗號分隔" />
                  </div>
                  <label className="upload-box">
                    <Camera size={24} />
                    <span>{uploading ? "圖片上傳中..." : postForm.image ? "已選擇照片，可重新上傳" : "上傳商品照片"}</span>
                    <input accept="image/*" className="hidden" type="file" onChange={handleImage} />
                  </label>
                  {postForm.image && (
                    <div className="image-frame rounded-lg">
                      <img alt="貼文預覽" src={postForm.image} />
                    </div>
                  )}
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
                  {chatMembers.map((member) => (
                    <button
                      className={`chat-user ${chatTarget === member.id ? "chat-user-active" : ""}`}
                      key={member.id}
                      onClick={() => {
                        setChatTarget(member.id);
                        setChatPostId(null);
                      }}
                      type="button"
                    >
                      <img alt={member.displayName} src={member.avatar} />
                      <span className="min-w-0 flex-1 truncate">{member.displayName}</span>
                      {unreadMessageCount(member.id) > 0 && <Badge>{unreadMessageCount(member.id)}</Badge>}
                    </button>
                  ))}
                </div>
                <div className="flex min-h-[480px] flex-col rounded-lg border border-[#e1d7cc] bg-[#fffdf8]">
                  {chatPost && (
                    <button className="m-3 flex items-center gap-3 rounded-lg border border-[#e1d7cc] bg-[#f3eee7] p-3 text-left" onClick={() => setActiveView("feed")} type="button">
                      <img alt={chatPost.title} className="h-14 w-14 rounded-lg object-cover" src={chatPost.image} />
                      <span className="min-w-0">
                        <span className="block text-xs font-bold text-[#7a7168]">對話商品</span>
                        <span className="block truncate font-black">{chatPost.title}</span>
                      </span>
                    </button>
                  )}
                  {isChatBlocked && (
                    <div className="mx-3 mt-3 rounded-lg bg-[#f3eee7] px-3 py-2 text-sm font-bold text-[#9a4e40]">
                      {currentUser.isBlocked
                        ? "你的帳號已被限制，不能傳送私訊。"
                        : chatPartner?.isBlocked
                          ? "對方帳號已被限制，暫時不能私訊。"
                          : isMutuallyBlocked(chatTarget)
                            ? "你或對方已將彼此加入黑名單。"
                            : "對方已限制陌生人私訊，請先追蹤或互追後再傳訊息。"}
                    </div>
                  )}
                  <div className="flex-1 space-y-3 overflow-y-auto p-4">
                    {conversationMessages
                      .map((message) => {
                        const linkedPost = message.postId ? posts.find((post) => post.id === message.postId) : null;
                        return (
                        <div className={`message ${message.from === currentUserId ? "message-me" : ""}`} key={message.id}>
                          {linkedPost && (
                            <button className="mb-2 block rounded-lg bg-white/20 p-2 text-left text-xs font-bold" onClick={() => setActiveView("feed")} type="button">
                              商品：{linkedPost.title}
                            </button>
                          )}
                          {message.text}
                          {message.from === currentUserId && (
                            <span className="mt-1 block text-right text-[0.68rem] opacity-70">{message.readAt ? "已讀" : "未讀"}</span>
                          )}
                        </div>
                      );})}
                  </div>
                  <form className="flex gap-2 border-t border-[#e1d7cc] p-3" onSubmit={sendMessage}>
                    <input className="field flex-1" disabled={isChatBlocked} value={chatText} onChange={(event) => setChatText(event.target.value)} placeholder="輸入訊息，約交換時間或照片細節" />
                    <button className="icon-button bg-[#222] text-white disabled:cursor-not-allowed disabled:opacity-50" disabled={isChatBlocked} type="submit">
                      <Send size={18} />
                    </button>
                  </form>
                </div>
              </div>
            </section>
          )}

          {activeView === "profile" && (
            <section className="panel">
              {!isAuthenticated ? (
                <div>
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
              ) : (
                <div>
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
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="secondary-button"
                        onClick={() => {
                          setProfileForm({
                            displayName: currentUser.displayName,
                            bio: currentUser.bio,
                            avatar: currentUser.avatar,
                            dmPolicy: currentUser.dmPolicy || "everyone",
                            hidePublicPosts: Boolean(currentUser.hidePublicPosts),
                            hidePublicComments: Boolean(currentUser.hidePublicComments),
                          });
                          setEditingProfile((value) => !value);
                        }}
                        type="button"
                      >
                        <Edit3 size={18} />
                        編輯資料
                      </button>
                      <button
                        className="secondary-button"
                        onClick={() => {
                          setPasswordForm({ password: "", confirmPassword: "" });
                          setEditingPassword((value) => !value);
                        }}
                        type="button"
                      >
                        <Lock size={18} />
                        修改密碼
                      </button>
                      <button className="secondary-button" onClick={signOut} type="button">
                        <LogOut size={18} />
                        登出
                      </button>
                    </div>
                  </div>
                  {editingProfile && (
                    <form className="mt-6 grid gap-3 rounded-lg bg-[#f3eee7] p-4" onSubmit={saveProfile}>
                      <div className="flex flex-col gap-4 rounded-lg border border-[#d8ccc0] bg-white p-4 sm:flex-row sm:items-center">
                        <img
                          alt="頭像預覽"
                          className="h-24 w-24 rounded-full object-cover ring-4 ring-[#c7ded2]"
                          src={profileForm.avatar || currentUser.avatar}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-black text-[#4c4640]">更換頭像</p>
                          <p className="mt-1 text-sm text-[#7a7168]">可直接上傳照片，或在下方貼上圖片 URL。</p>
                          <label className="secondary-button mt-3 w-fit">
                            <Camera size={18} />
                            {profileUploading ? "頭像上傳中..." : "上傳新頭像"}
                            <input accept="image/*" className="hidden" disabled={profileUploading} type="file" onChange={handleAvatarImage} />
                          </label>
                        </div>
                      </div>
                      <input className="field" value={profileForm.displayName} onChange={(event) => setProfileForm({ ...profileForm, displayName: event.target.value })} placeholder="暱稱" />
                      <textarea className="field min-h-24" value={profileForm.bio} onChange={(event) => setProfileForm({ ...profileForm, bio: event.target.value })} placeholder="簡介" />
                      <input className="field" value={profileForm.avatar} onChange={(event) => setProfileForm({ ...profileForm, avatar: event.target.value })} placeholder="頭像 URL" />
                      <div className="rounded-lg border border-[#d8ccc0] bg-white p-4">
                        <h2 className="section-title">隱私設定</h2>
                        <label className="mt-3 block text-sm font-bold text-[#5f5750]">
                          陌生人私訊限制
                          <select className="field mt-2" value={profileForm.dmPolicy} onChange={(event) => setProfileForm({ ...profileForm, dmPolicy: event.target.value as DmPolicy })}>
                            {(Object.keys(dmPolicyLabels) as DmPolicy[]).map((policy) => (
                              <option key={policy} value={policy}>{dmPolicyLabels[policy]}</option>
                            ))}
                          </select>
                        </label>
                        <label className="mt-3 flex items-center gap-2 text-sm font-bold text-[#5f5750]">
                          <input checked={profileForm.hidePublicPosts} onChange={(event) => setProfileForm({ ...profileForm, hidePublicPosts: event.target.checked })} type="checkbox" />
                          在公開個人頁隱藏我的貼文紀錄
                        </label>
                        <label className="mt-3 flex items-center gap-2 text-sm font-bold text-[#5f5750]">
                          <input checked={profileForm.hidePublicComments} onChange={(event) => setProfileForm({ ...profileForm, hidePublicComments: event.target.checked })} type="checkbox" />
                          在公開個人頁隱藏我的留言紀錄
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <button className="primary-button disabled:cursor-not-allowed disabled:opacity-60" disabled={profileUploading} type="submit">
                          {profileUploading ? "等待頭像上傳" : "儲存資料"}
                        </button>
                        <button className="secondary-button" onClick={() => setEditingProfile(false)} type="button">取消</button>
                      </div>
                    </form>
                  )}
                  {editingPassword && (
                    <form className="mt-6 grid gap-3 rounded-lg bg-[#f3eee7] p-4" onSubmit={changePassword}>
                      <div>
                        <h2 className="section-title">修改密碼</h2>
                        <p className="mt-1 text-sm text-[#7a7168]">新密碼至少 6 個字元，更新後請使用新密碼登入。</p>
                      </div>
                      <label className="input-shell">
                        <Lock size={18} />
                        <input
                          type="password"
                          value={passwordForm.password}
                          onChange={(event) => setPasswordForm({ ...passwordForm, password: event.target.value })}
                          placeholder="新密碼"
                          required
                        />
                      </label>
                      <label className="input-shell">
                        <Lock size={18} />
                        <input
                          type="password"
                          value={passwordForm.confirmPassword}
                          onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })}
                          placeholder="再次輸入新密碼"
                          required
                        />
                      </label>
                      <div className="flex gap-2">
                        <button className="primary-button disabled:cursor-not-allowed disabled:opacity-60" disabled={passwordUpdating} type="submit">
                          {passwordUpdating ? "更新中" : "更新密碼"}
                        </button>
                        <button className="secondary-button" onClick={() => setEditingPassword(false)} type="button">取消</button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </section>
          )}

          {activeView === "public-profile" && (
            <section className="panel">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <img alt={selectedProfile.displayName} className="h-24 w-24 rounded-full object-cover ring-4 ring-[#c7ded2]" src={selectedProfile.avatar} />
                <div className="flex-1">
                  <h1 className="page-title">{selectedProfile.displayName}</h1>
                  <p className="mt-1 text-sm text-[#7a7168]">@{selectedProfile.username}</p>
                  <p className="mt-3 text-[#5f5750]">{selectedProfile.bio}</p>
                  <p className="mt-2 text-xs font-bold text-[#7a7168]">私訊：{dmPolicyLabels[selectedProfile.dmPolicy || "everyone"]}</p>
                  <div className="mt-4 grid max-w-xl grid-cols-4 gap-2 text-center text-sm">
                    <Metric label="貼文" value={selectedProfilePosts.length} />
                    <Metric label="追蹤" value={followingCount(selectedProfile.id)} />
                    <Metric label="粉絲" value={followerCount(selectedProfile.id)} />
                    <Metric label="信用" value={`${averageRating(selectedProfile.id)} / ${reviewsForUser(selectedProfile.id).length}`} />
                  </div>
                  {isBlockedByMe(selectedProfile.id) && <p className="mt-3 rounded-lg bg-[#f3eee7] px-3 py-2 text-sm font-bold text-[#8a3f3f]">你已將此會員加入黑名單。</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="secondary-button" onClick={() => toggleFollow(selectedProfile)} type="button">
                    <User size={18} />
                    {isFollowing(selectedProfile.id) ? "追蹤中" : "追蹤"}
                  </button>
                  <button
                    className="secondary-button disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!canMessageMember(selectedProfile)}
                    onClick={() => {
                      openChat(selectedProfile.id);
                    }}
                    type="button"
                  >
                    <MessageCircle size={18} />
                    {canMessageMember(selectedProfile) ? "私訊" : "不可私訊"}
                  </button>
                  <button className="secondary-button" onClick={() => toggleUserBlock(selectedProfile)} type="button">
                    <AlertTriangle size={18} />
                    {isBlockedByMe(selectedProfile.id) ? "解除黑名單" : "加入黑名單"}
                  </button>
                </div>
              </div>
              {reviewsForUser(selectedProfile.id).length > 0 && (
                <div className="mt-6 rounded-lg border border-[#e1d7cc] bg-white p-4">
                  <h2 className="section-title">交換評價</h2>
                  <div className="mt-3 space-y-3">
                    {reviewsForUser(selectedProfile.id).slice(0, 5).map((review) => {
                      const reviewer = memberById(members, review.reviewerId);
                      const reviewPost = posts.find((post) => post.id === review.postId);
                      return (
                        <div className="rounded-lg bg-[#f3eee7] p-3 text-sm" key={review.id}>
                          <p className="font-bold">{review.rating} 星 · {reviewer.displayName}</p>
                          {reviewPost && <p className="mt-1 text-[#7a7168]">{reviewPost.title}</p>}
                          {review.comment && <p className="mt-1 text-[#4c4640]">{review.comment}</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <h2 className="section-title mt-8">公開貼文</h2>
              {canViewSelectedPosts ? (
                <PostList
                  addComment={addComment}
                  commentDrafts={commentDrafts}
                  currentUserId={currentUserId}
                  currentUser={currentUser}
                  deleteComment={deleteComment}
                  deletePost={deletePost}
                  editingPostId={editingPostId}
                  editPostForm={editPostForm}
                  members={members}
                  reportComment={reportComment}
                  reportPost={reportPost}
                  posts={selectedProfilePosts}
                  followerCount={followerCount}
                  isFollowing={isFollowing}
                  openPublicProfile={openPublicProfile}
                  savePostEdit={savePostEdit}
                  setChatTarget={openChat}
                  setCommentDrafts={setCommentDrafts}
                  setEditingPostId={setEditingPostId}
                  setEditPostForm={setEditPostForm}
                  setActiveView={setActiveView}
                  startEditPost={startEditPost}
                  toggleFollow={toggleFollow}
                  togglePostHidden={togglePostHidden}
                  openImageViewer={setViewerImage}
                  toggleLike={toggleLike}
                  toggleSavePost={toggleSavePost}
                  isSaved={isSaved}
                  reviewsForUser={reviewsForUser}
                  averageRating={averageRating}
                  submitExchangeReview={submitExchangeReview}
                />
              ) : (
                <div className="panel mt-4 text-center text-[#7a7168]">此會員已隱藏貼文紀錄。</div>
              )}
              <h2 className="section-title mt-8">留言紀錄</h2>
              {canViewSelectedComments ? (
                <div className="mt-4 space-y-3">
                  {selectedProfileComments.length ? selectedProfileComments.slice(0, 10).map((comment) => (
                    <div className="rounded-lg border border-[#e1d7cc] bg-white p-4 text-sm" key={comment.id}>
                      <p className="font-bold text-[#4c4640]">{comment.postTitle}</p>
                      <p className="mt-2 text-[#5f5750]">{comment.text}</p>
                      <p className="mt-2 text-xs text-[#7a7168]">{new Date(comment.createdAt).toLocaleString("zh-TW")}</p>
                    </div>
                  )) : <p className="mt-4 text-sm text-[#7a7168]">目前沒有公開留言紀錄。</p>}
                </div>
              ) : (
                <div className="panel mt-4 text-center text-[#7a7168]">此會員已隱藏留言紀錄。</div>
              )}
            </section>
          )}

          {activeView === "notifications" && (
            <section className="panel">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="page-title">通知中心</h1>
                  <p className="mt-2 text-sm text-[#7a7168]">{unreadNotifications} 則未讀通知</p>
                </div>
                <button className="secondary-button" onClick={markNotificationsRead} type="button">
                  <Bell size={18} />
                  全部標為已讀
                </button>
              </div>
              <div className="mt-5 space-y-3">
                {notifications.length ? notifications.map((notification) => {
                  const actor = notification.actorId ? memberById(members, notification.actorId) : null;
                  return (
                    <div className={`rounded-lg border border-[#e1d7cc] bg-white p-4 ${notification.isRead ? "opacity-70" : ""}`} key={notification.id}>
                      <div className="flex items-start gap-3">
                        {actor && <img alt={actor.displayName} className="h-10 w-10 rounded-full object-cover" src={actor.avatar} />}
                        <div className="min-w-0 flex-1">
                          <p className="font-bold">{notification.content}</p>
                          <p className="mt-1 text-xs text-[#7a7168]">{new Date(notification.createdAt).toLocaleString("zh-TW")}</p>
                        </div>
                        {!notification.isRead && <Badge>未讀</Badge>}
                      </div>
                    </div>
                  );
                }) : <p className="text-sm text-[#7a7168]">目前沒有通知。</p>}
              </div>
            </section>
          )}

          {activeView === "admin" && isAuthenticated && currentUser.isAdmin && (
            <section className="panel">
              <h1 className="page-title">管理後台</h1>
              <div className="mt-5 grid gap-3 md:grid-cols-4">
                <AdminCard label="待審核貼文" value="3" />
                <AdminCard label="待處理檢舉" value={reports.filter((report) => report.status === "open").length.toString()} />
                <AdminCard label="活躍會員" value={members.filter((member) => !member.isBlocked).length.toString()} />
                <AdminCard label="已封鎖會員" value={members.filter((member) => member.isBlocked).length.toString()} />
              </div>
              <div className="mt-6">
                <h2 className="section-title">會員權限</h2>
                <div className="mt-3 space-y-3">
                  {members.map((member) => (
                    <div className="flex items-center justify-between rounded-lg border border-[#e1d7cc] bg-white p-4" key={member.id}>
                      <div className="flex min-w-0 items-center gap-3">
                        <img alt={member.displayName} className="h-10 w-10 rounded-full object-cover" src={member.avatar} />
                        <div className="min-w-0">
                          <p className="truncate font-bold">{member.displayName}</p>
                          <p className="text-sm text-[#7a7168]">
                            @{member.username} · {member.isAdmin ? "管理員" : member.isBlocked ? "已封鎖" : "一般會員"}
                          </p>
                        </div>
                      </div>
                      <button
                        className="secondary-button disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={member.id === currentUserId || member.isAdmin}
                        onClick={() => toggleMemberBlocked(member)}
                        type="button"
                      >
                        <Lock size={18} />
                        {member.isBlocked ? "解除封鎖" : "禁止發言"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-6">
                <h2 className="section-title">檢舉列表</h2>
                <div className="mt-3 space-y-3">
                  {reports.length ? reports.map((report) => (
                    <div className="rounded-lg border border-[#e1d7cc] bg-white p-4" key={report.id}>
                      <p className="font-bold">{report.postId ? "貼文檢舉" : "留言檢舉"} · {report.category} · {report.status}</p>
                      <p className="mt-1 text-sm text-[#5f5750]">{report.reason}</p>
                      {report.resolution && <p className="mt-1 text-sm font-bold text-[#315c4b]">處理結果：{report.resolution}</p>}
                      <p className="mt-1 text-xs text-[#7a7168]">{new Date(report.createdAt).toLocaleString("zh-TW")}</p>
                      {report.status === "open" && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button className="secondary-button" onClick={() => resolveReport(report, "reviewed")} type="button">
                            <ShieldCheck size={18} />
                            標記已處理
                          </button>
                          <button className="secondary-button" onClick={() => resolveReport(report, "dismissed")} type="button">
                            <X size={18} />
                            駁回
                          </button>
                        </div>
                      )}
                    </div>
                  )) : <p className="text-sm text-[#7a7168]">目前沒有檢舉。</p>}
                </div>
              </div>
              <div className="mt-6 space-y-3">
                {posts.map((post) => (
                  <div className="flex items-center justify-between rounded-lg border border-[#e1d7cc] bg-white p-4" key={post.id}>
                    <div>
                      <p className="font-bold">{post.title}</p>
                      <p className="text-sm text-[#7a7168]">{post.status} · {post.category} · {post.isHidden ? "已隱藏" : "公開"}</p>
                    </div>
                    <button className="secondary-button" onClick={() => togglePostHidden(post)} type="button">
                      {post.isHidden ? <Eye size={18} /> : <EyeOff size={18} />}
                      {post.isHidden ? "解除隱藏" : "隱藏"}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </section>

        <aside className="hidden lg:block">
          <section className="panel">
            {isAuthenticated ? (
              <>
                <h2 className="section-title">目前帳號</h2>
                <div className="mt-4 flex items-center gap-3">
                  <img alt={currentUser.displayName} className="h-12 w-12 rounded-full object-cover" src={currentUser.avatar} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{currentUser.displayName}</p>
                    <p className="text-sm text-[#7a7168]">@{currentUser.username}</p>
                  </div>
                </div>
                <button className="secondary-button mt-4 w-full justify-center" onClick={signOut} type="button">
                  <LogOut size={18} />
                  登出
                </button>
              </>
            ) : (
              <>
                <h2 className="section-title">會員登入</h2>
                <AuthPanel
                  authForm={authForm}
                  authMode={authMode}
                  onAuth={handleAuth}
                  setAuthForm={setAuthForm}
                  setAuthMode={setAuthMode}
                />
              </>
            )}
          </section>
          <section className="panel mt-4">
            <h2 className="section-title">推薦 MOA</h2>
            <div className="mt-4 space-y-3">
              {members.filter((member) => member.id !== currentUserId).map((member) => (
                <div className="flex items-center gap-3" key={member.id}>
                  <button onClick={() => openPublicProfile(member.id)} type="button">
                    <img alt={member.displayName} className="h-10 w-10 rounded-full object-cover" src={member.avatar} />
                  </button>
                  <button className="min-w-0 flex-1 text-left" onClick={() => openPublicProfile(member.id)} type="button">
                    <p className="truncate font-bold">{member.displayName}</p>
                    <p className="text-xs text-[#7a7168]">@{member.username} · {followerCount(member.id)} 粉絲</p>
                  </button>
                  <button className="mini-button" onClick={() => toggleFollow(member)} type="button">
                    {isFollowing(member.id) ? "追蹤中" : "追蹤"}
                  </button>
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

      {viewerImage && <ImageViewer alt={viewerImage.alt} onClose={() => setViewerImage(null)} src={viewerImage.src} />}
    </main>
  );
}

function Hero({ currentUser, isAuthenticated, setActiveView }: { currentUser: Member; isAuthenticated: boolean; setActiveView: (view: View) => void }) {
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
            <p className="text-sm text-[#7a7168]">{isAuthenticated ? "目前登入" : "會員狀態"}</p>
            {isAuthenticated ? (
              <div className="mt-2 flex items-center gap-3">
                <img alt={currentUser.displayName} className="h-11 w-11 rounded-full object-cover" src={currentUser.avatar} />
                <p className="font-black">{currentUser.displayName}</p>
              </div>
            ) : (
              <button className="secondary-button mt-2" onClick={() => setActiveView("profile")} type="button">
                <User size={18} />
                尚未登入，前往登入
              </button>
            )}
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
  currentUser: Member;
  commentDrafts: Record<string, string>;
  editPostForm: { title: string; content: string; category: Category; status: Status; tags: string };
  editingPostId: string | null;
  setCommentDrafts: (value: Record<string, string>) => void;
  setEditPostForm: (value: { title: string; content: string; category: Category; status: Status; tags: string }) => void;
  setEditingPostId: (value: string | null) => void;
  toggleLike: (postId: string) => void;
  addComment: (postId: string) => void;
  deleteComment: (postId: string, commentId: string) => void;
  deletePost: (postId: string) => void;
  reportComment: (commentId: string) => void;
  reportPost: (postId: string) => void;
  savePostEdit: (postId: string) => void;
  setChatTarget: (id: string, postId?: string) => void;
  setActiveView: (view: View) => void;
  startEditPost: (post: Post) => void;
  openPublicProfile: (memberId: string) => void;
  toggleFollow: (member: Member) => void;
  isFollowing: (memberId: string) => boolean;
  followerCount: (memberId: string) => number;
  togglePostHidden: (post: Post) => void;
  openImageViewer: (image: { src: string; alt: string }) => void;
  toggleSavePost: (post: Post) => void;
  isSaved: (postId: string) => boolean;
  reviewsForUser: (memberId: string) => ExchangeReview[];
  averageRating: (memberId: string) => string;
  submitExchangeReview: (post: Post) => void;
}) {
  if (!props.posts.length) {
    return <div className="panel mt-4 text-center text-[#7a7168]">目前沒有符合條件的交換貼文。</div>;
  }

  return (
    <div className="mt-4 space-y-5">
      {props.posts.map((post) => {
        const author = memberById(props.members, post.userId);
        const isOwner = post.userId === props.currentUserId;
        const isEditing = props.editingPostId === post.id;
        return (
          <article className="post-card" key={post.id}>
            <div className="flex items-center gap-3 p-4">
              <button onClick={() => props.openPublicProfile(author.id)} type="button">
                <img alt={author.displayName} className="h-11 w-11 rounded-full object-cover" src={author.avatar} />
              </button>
              <button className="min-w-0 flex-1 text-left" onClick={() => props.openPublicProfile(author.id)} type="button">
                <p className="truncate font-black">{author.displayName}</p>
                <p className="text-xs text-[#7a7168]">
                  {post.category} · {post.status} · {props.followerCount(author.id)} 粉絲 · 信用 {props.averageRating(author.id)}
                </p>
              </button>
              {!isOwner && (
                <button className="mini-button" onClick={() => props.toggleFollow(author)} type="button">
                  {props.isFollowing(author.id) ? "追蹤中" : "追蹤"}
                </button>
              )}
              {post.isHidden && <Badge>已隱藏</Badge>}
              <Badge>{post.status}</Badge>
            </div>
            <button className="image-frame image-frame-button" onClick={() => props.openImageViewer({ src: post.image, alt: post.title })} type="button">
              <img alt={post.title} src={post.image} />
              <span className="image-frame-hint">
                <ZoomIn size={16} />
                放大
              </span>
            </button>
            <div className="space-y-4 p-4">
              {isEditing ? (
                <div className="grid gap-3 rounded-lg bg-[#f3eee7] p-3">
                  <input className="field" value={props.editPostForm.title} onChange={(event) => props.setEditPostForm({ ...props.editPostForm, title: event.target.value })} />
                  <textarea className="field min-h-24" value={props.editPostForm.content} onChange={(event) => props.setEditPostForm({ ...props.editPostForm, content: event.target.value })} />
                  <div className="grid gap-3 sm:grid-cols-3">
                    <select className="field" value={props.editPostForm.category} onChange={(event) => props.setEditPostForm({ ...props.editPostForm, category: event.target.value as Category })}>
                      {categories.map((item) => <option key={item}>{item}</option>)}
                    </select>
                    <select className="field" value={props.editPostForm.status} onChange={(event) => props.setEditPostForm({ ...props.editPostForm, status: event.target.value as Status })}>
                      {postStatuses.map((item) => <option key={item}>{item}</option>)}
                    </select>
                    <input className="field" value={props.editPostForm.tags} onChange={(event) => props.setEditPostForm({ ...props.editPostForm, tags: event.target.value })} />
                  </div>
                  <div className="flex gap-2">
                    <button className="secondary-button" onClick={() => props.savePostEdit(post.id)} type="button">
                      儲存
                    </button>
                    <button className="secondary-button" onClick={() => props.setEditingPostId(null)} type="button">
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <h2 className="text-xl font-black">{post.title}</h2>
                  <p className="mt-2 leading-7 text-[#4c4640]">{post.content}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => <Badge key={tag}>#{tag}</Badge>)}
                {["已完成", "已交換"].includes(post.status) && <Badge>可評價</Badge>}
              </div>
              <div className="flex flex-wrap gap-2">
                {isOwner && (
                  <>
                    <button className="action-button" onClick={() => props.startEditPost(post)} type="button">
                      <Edit3 size={17} />
                      編輯
                    </button>
                    <button className="action-button" onClick={() => props.deletePost(post.id)} type="button">
                      <Trash2 size={17} />
                      刪除
                    </button>
                  </>
                )}
                <button className="action-button" onClick={() => props.reportPost(post.id)} type="button">
                  <Flag size={17} />
                  檢舉
                </button>
                <button className="action-button" onClick={() => props.toggleSavePost(post)} type="button">
                  <Bookmark className={props.isSaved(post.id) ? "fill-[#315c4b] text-[#315c4b]" : ""} size={17} />
                  {props.isSaved(post.id) ? "已收藏" : "收藏"}
                </button>
                {!isOwner && ["已完成", "已交換"].includes(post.status) && (
                  <button className="action-button" onClick={() => props.submitExchangeReview(post)} type="button">
                    <Star size={17} />
                    交換評價
                  </button>
                )}
                {props.currentUser.isAdmin && (
                  <button className="action-button" onClick={() => props.togglePostHidden(post)} type="button">
                    {post.isHidden ? <Eye size={17} /> : <EyeOff size={17} />}
                    {post.isHidden ? "解除隱藏" : "隱藏"}
                  </button>
                )}
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
                    props.setChatTarget(author.id, post.id);
                    props.setActiveView("messages");
                  }}
                  type="button"
                >
                  <Send size={18} />
                  私訊
                </button>
              </div>
              <div className="space-y-2">
                {props.reviewsForUser(author.id).some((review) => review.postId === post.id) && (
                  <div className="rounded-lg border border-[#e1d7cc] bg-white p-3 text-sm">
                    <p className="font-bold text-[#315c4b]">此交換已有評價紀錄</p>
                    {props.reviewsForUser(author.id).filter((review) => review.postId === post.id).slice(0, 2).map((review) => {
                      const reviewer = memberById(props.members, review.reviewerId);
                      return (
                        <p className="mt-1 text-[#5f5750]" key={review.id}>
                          {review.rating} 星 · {reviewer.displayName}{review.comment ? `：${review.comment}` : ""}
                        </p>
                      );
                    })}
                  </div>
                )}
                {post.comments.map((comment) => {
                  const commenter = memberById(props.members, comment.userId);
                  return (
                    <div className="rounded-lg bg-[#f3eee7] px-3 py-2 text-sm" key={comment.id}>
                      <p>
                        <b>{commenter.displayName}</b> {comment.text}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(comment.userId === props.currentUserId || props.currentUser.isAdmin) && (
                          <button className="mini-button" onClick={() => props.deleteComment(post.id, comment.id)} type="button">
                            刪除留言
                          </button>
                        )}
                        <button className="mini-button" onClick={() => props.reportComment(comment.id)} type="button">
                          檢舉留言
                        </button>
                      </div>
                    </div>
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

function ImageViewer({ alt, onClose, src }: { alt: string; onClose: () => void; src: string }) {
  const [scale, setScale] = useState(1);

  function updateScale(nextScale: number) {
    setScale(Math.min(4, Math.max(0.5, Number(nextScale.toFixed(2)))));
  }

  return (
    <div className="viewer-backdrop" role="dialog" aria-modal="true" aria-label="圖片檢視器">
      <div className="viewer-toolbar">
        <button className="viewer-button" onClick={() => updateScale(scale - 0.25)} type="button" title="縮小">
          <ZoomOut size={18} />
        </button>
        <button className="viewer-button viewer-scale" onClick={() => updateScale(1)} type="button" title="重設縮放">
          {Math.round(scale * 100)}%
        </button>
        <button className="viewer-button" onClick={() => updateScale(scale + 0.25)} type="button" title="放大">
          <ZoomIn size={18} />
        </button>
        <button className="viewer-button" onClick={() => updateScale(1)} type="button" title="原始大小">
          <Minus size={18} />
        </button>
        <button className="viewer-button" onClick={onClose} type="button" title="關閉">
          <X size={18} />
        </button>
      </div>
      <button className="viewer-button viewer-mobile-close" onClick={onClose} type="button" title="關閉">
        <X size={18} />
      </button>
      <button className="viewer-close-layer" onClick={onClose} aria-label="關閉圖片檢視器" type="button" />
      <div
        className="viewer-stage"
        onWheel={(event) => {
          event.preventDefault();
          updateScale(scale + (event.deltaY < 0 ? 0.12 : -0.12));
        }}
      >
        <img alt={alt} className="viewer-image" draggable={false} src={src} style={{ transform: `scale(${scale})` }} />
      </div>
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
  authForm: { email: string; password: string; displayName: string };
  authMode: AuthMode;
  onAuth: (event: FormEvent<HTMLFormElement>) => void;
  setAuthForm: (value: { email: string; password: string; displayName: string }) => void;
  setAuthMode: (value: AuthMode) => void;
}) {
  const isForgot = authMode === "forgot";

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
        <input
          autoComplete="email"
          inputMode="email"
          type="email"
          value={authForm.email}
          onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })}
          placeholder="E-mail"
          required
        />
      </label>
      {authMode === "register" && (
        <label className="input-shell">
          <Sparkles size={18} />
          <input value={authForm.displayName} onChange={(event) => setAuthForm({ ...authForm, displayName: event.target.value })} placeholder="暱稱" />
        </label>
      )}
      {!isForgot && (
        <label className="input-shell">
          <Lock size={18} />
          <input type="password" value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} placeholder="密碼" required />
        </label>
      )}
      <button className="primary-button" type="submit">
        {authMode === "forgot" ? "寄送重設密碼信" : authMode === "login" ? "登入" : "建立帳號"}
      </button>
      {authMode === "login" && (
        <button className="text-sm font-bold text-[#315c4b]" onClick={() => setAuthMode("forgot")} type="button">
          忘記密碼？
        </button>
      )}
      {authMode === "forgot" && (
        <button className="text-sm font-bold text-[#315c4b]" onClick={() => setAuthMode("login")} type="button">
          返回登入
        </button>
      )}
    </form>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
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
