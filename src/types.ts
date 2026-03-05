export interface Persona {
  id: string;
  name: string;
  instructions: string;
  prompt?: string;
  prompts?: string[];
  avatarUrl?: string;
  patSuffix?: string;
  isSegmentResponse?: boolean;
  allowActiveMessaging?: boolean;
  isBlocked?: boolean;
}

export interface Transaction {
  id: string;
  type: 'top_up' | 'payment' | 'transfer' | 'red_packet';
  amount: number;
  description: string;
  timestamp: number;
}

export interface Sticker {
  id: string;
  name: string;
  url: string;
}

export interface TheaterScript {
  title: string;
  desc: string;
}

export interface UserProfile {
  name: string;
  avatarUrl?: string;
  anniversaryDate?: string;
  patSuffix?: string;
  persona?: string;
  balance?: number;
  transactions?: Transaction[];
  stickers?: Sticker[];
  theaterScripts?: TheaterScript[];
  personaSpecificSettings?: Record<string, { userPersona?: string }>;
}

export interface ApiSettings {
  apiUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  proactiveDelay?: number;
}

export interface ThemeSettings {
  wallpaper: string;
  lockScreenWallpaper: string;
  momentsBg: string;
  chatBg?: string;
  chatBubbleUser?: string;
  chatBubbleAi?: string;
  chatBubbleUserCss?: string;
  chatBubbleAiCss?: string;
  iconBgColor: string;
  fontUrl: string;
  timeColor?: string;
  statusColor?: string;
  showStatusBar?: boolean;
  immersiveMode?: boolean;
  customIcons: Record<string, string>;
  weatherWidgetBg?: string;
  weatherLocation?: string;
  userBubbleColor?: string;
  aiBubbleColor?: string;
  userTextColor?: string;
  aiTextColor?: string;
  widgetImages?: {
    topRight?: string;
    bottomLeft?: string;
  };
  notificationSound?: string;
  innerVoiceCss?: string;
  innerVoiceBgColor?: string;
  innerVoiceTextColor?: string;
}

export interface WorldbookSettings {
  jailbreakPrompt: string;
  globalPrompt: string;
  jailbreakPrompts?: string[];
  globalPrompts?: string[];
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  cover: string;
  lyrics: string;
  url?: string;
  duration?: number;
  source?: 'netease' | 'qq' | 'local';
}

export interface Message {
  id: string;
  personaId: string;
  role: 'user' | 'model' | 'system';
  text: string;
  msgType?: 'text' | 'transfer' | 'music' | 'system' | 'xhsPost' | 'taobaoProduct' | 'relativeCard' | 'sticker' | 'thought' | 'listenTogether';
  amount?: number;
  transferNote?: string;
  sticker?: string;
  relativeCard?: {
    limit: number;
    status: 'active' | 'cancelled';
  };
  song?: Song;
  xhsPost?: XHSPost;
  taobaoProduct?: {
    id: string;
    name: string;
    price: number | string;
    image: string;
    sales?: string;
    shop?: string;
  };
  timestamp?: string;
  isRead?: boolean;
  status?: 'sent' | 'delivered' | 'read';
  createdAt?: number;
  isRecalled?: boolean;
  quotedMessageId?: string;
  isRequest?: boolean;
  isRefund?: boolean;
  isReceived?: boolean;
  isInnerVoice?: boolean;
  innerVoice?: string;
  innerVoiceMood?: string;
  showInnerVoice?: boolean;
  theaterId?: string;
}

export interface Comment {
  id: string;
  authorId: string;
  text: string;
  timestamp: string;
  replyToId?: string;
  createdAt?: number;
}

export interface Moment {
  id: string;
  authorId: string;
  text: string;
  timestamp: string;
  likedByIds: string[];
  comments: Comment[];
  song?: Song;
  xhsPost?: XHSPost;
  createdAt?: number;
}

export interface XHSComment {
  id: string;
  authorName: string;
  authorAvatar: string;
  text: string;
  createdAt: number;
}

export interface XHSPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  title: string;
  content: string;
  images: string[];
  likes: number;
  comments: number;
  commentsList?: XHSComment[];
  isLiked?: boolean;
  isBookmarked?: boolean;
  createdAt: number;
}

export interface TreeHoleComment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  text: string;
  likes: number;
  isLiked?: boolean;
  replyToName?: string;
  createdAt: number;
}

export interface TreeHolePost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorPersona?: string; // e.g. "INFP 天蝎座"
  content: string;
  likes: number;
  isLiked?: boolean;
  comments: TreeHoleComment[];
  createdAt: number;
}

export interface TreeHoleMessage {
  id: string;
  text: string;
  isMe: boolean;
  time: number;
  type?: 'text' | 'contact';
  contactInfo?: {
    id: string;
    name: string;
    avatar: string;
    intro: string;
  };
  replyTo?: {
    id: string;
    text: string;
    name: string;
  };
  isRecalled?: boolean;
}

export interface TreeHoleNotification {
  id: string;
  type: 'like' | 'comment';
  postId: string;
  authorName: string;
  authorAvatar: string;
  text?: string;
  createdAt: number;
  isRead: boolean;
}

export interface Order {
  id: string;
  restaurantName: string;
  restaurantImage: string;
  items: string[];
  totalPrice: number;
  status: 'preparing' | 'delivering' | 'arrived' | 'completed';
  orderTime: number;
  deliveryTime?: string;
  isAiOrder?: boolean;
  orderFor?: string; // 'me' or personaId
}

export type Screen = 'home' | 'chat' | 'persona' | 'api' | 'theme' | 'music' | 'xhs' | 'wallet' | 'treehole' | 'taobao' | 'fooddelivery';




