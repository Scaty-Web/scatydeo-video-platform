export const translations = {
  tr: {
    // Navbar
    nav: {
      home: "Ana Sayfa",
      videos: "Videolar",
      rules: "Kurallar",
      searchPlaceholder: "Video ara...",
      login: "Giriş Yap",
      uploadVideo: "Video Yükle",
      myProfile: "Profilim",
      settings: "Ayarlar",
      moderatorPanel: "Moderatör Paneli",
      logout: "Çıkış Yap",
      notifications: "Bildirimler",
    },
    // Hero
    hero: {
      badge: "Yeni nesil video platformu",
      subtitle: "Scaty Web ORG tarafından geliştirilen yeni nesil video platformu. Sınırsız içerik, benzersiz deneyim.",
      exploreBtn: "Keşfetmeye Başla",
      moreInfoBtn: "Daha Fazla Bilgi",
      statsVideos: "Video",
      statsUsers: "Kullanıcı",
      statsQuality: "Kalite",
    },
    // Video Grid
    videoGrid: {
      title: "Popüler",
      titleHighlight: "Videolar",
      subtitle: "En çok izlenen içerikler",
      warningTitle: "Bu bir deneme sürümüdür",
      warningDesc: "Scatydeo şu anda geliştirme aşamasındadır. Videolar yakında eklenecektir.",
      emptyTitle: "Henüz video bulunmuyor",
      emptyDesc: "İçerikler hazırlanıyor. Çok yakında harika videolarla karşınızda olacağız!",
      anonymous: "Anonim",
    },
    // About Section
    about: {
      title: "Nedir?",
      description: "Scatydeo, Scaty Web ORG'un yaptığı resmi bir scaty video platformudur. Lovable'yi kullanmaktadır ve 2026'da kurulmuştur.",
      features: {
        fast: {
          title: "Ultra Hızlı",
          description: "Anında yüklenen videolar ile kesintisiz izleme deneyimi",
        },
        secure: {
          title: "Güvenli",
          description: "Verileriniz en üst düzey güvenlik protokolleri ile korunur",
        },
        global: {
          title: "Küresel",
          description: "Dünyanın her yerinden erişilebilir içerik ağı",
        },
        innovative: {
          title: "Yenilikçi",
          description: "En son teknolojiler ile benzersiz deneyim",
        },
      },
      ourApp: "Uygulamamız",
      downloadApp: "Scatydeo'nun uygulamasını indirin",
      mission: "Misyonumuz",
      missionDesc: "Kullanıcılarımıza en iyi video izleme deneyimini sunmak, içerik üreticilerine güçlü araçlar sağlamak ve dijital içerik dünyasında yenilikçi çözümler üretmek.",
    },
    // Footer
    footer: {
      description: "Scaty Web ORG tarafından geliştirilen yeni nesil video platformu. Sınırsız içerik, benzersiz deneyim.",
      platform: "Platform",
      home: "Ana Sayfa",
      videos: "Videolar",
      about: "Hakkında",
      contact: "İletişim",
      legal: "Yasal",
      terms: "Kullanım Şartları",
      privacy: "Gizlilik Politikası",
      cookies: "Çerez Politikası",
      kvkk: "KVKK",
      copyright: "Tüm hakları saklıdır.",
      madeWith: "ile yapılmıştır",
    },
    // Common
    common: {
      views: "görüntülenme",
      subscribers: "abone",
      comments: "Yorum",
      like: "Beğen",
      share: "Paylaş",
      subscribe: "Abone Ol",
      subscribed: "Abone",
      loading: "Yükleniyor...",
    },
    // Language
    language: {
      label: "Dil",
      tr: "Türkçe",
      en: "English",
    },
  },
  en: {
    // Navbar
    nav: {
      home: "Home",
      videos: "Videos",
      rules: "Rules",
      searchPlaceholder: "Search videos...",
      login: "Sign In",
      uploadVideo: "Upload Video",
      myProfile: "My Profile",
      settings: "Settings",
      moderatorPanel: "Moderator Panel",
      logout: "Sign Out",
      notifications: "Notifications",
    },
    // Hero
    hero: {
      badge: "Next generation video platform",
      subtitle: "Next generation video platform developed by Scaty Web ORG. Unlimited content, unique experience.",
      exploreBtn: "Start Exploring",
      moreInfoBtn: "Learn More",
      statsVideos: "Videos",
      statsUsers: "Users",
      statsQuality: "Quality",
    },
    // Video Grid
    videoGrid: {
      title: "Popular",
      titleHighlight: "Videos",
      subtitle: "Most watched content",
      warningTitle: "This is a beta version",
      warningDesc: "Scatydeo is currently under development. Videos will be added soon.",
      emptyTitle: "No videos yet",
      emptyDesc: "Content is being prepared. We'll be here with great videos very soon!",
      anonymous: "Anonymous",
    },
    // About Section
    about: {
      title: "What is",
      description: "Scatydeo is an official scaty video platform made by Scaty Web ORG. It uses Lovable and was founded in 2026.",
      features: {
        fast: {
          title: "Ultra Fast",
          description: "Seamless viewing experience with instantly loading videos",
        },
        secure: {
          title: "Secure",
          description: "Your data is protected with top-level security protocols",
        },
        global: {
          title: "Global",
          description: "Content network accessible from anywhere in the world",
        },
        innovative: {
          title: "Innovative",
          description: "Unique experience with the latest technologies",
        },
      },
      ourApp: "Our App",
      downloadApp: "Download Scatydeo app",
      mission: "Our Mission",
      missionDesc: "To provide our users with the best video viewing experience, to provide content creators with powerful tools, and to produce innovative solutions in the digital content world.",
    },
    // Footer
    footer: {
      description: "Next generation video platform developed by Scaty Web ORG. Unlimited content, unique experience.",
      platform: "Platform",
      home: "Home",
      videos: "Videos",
      about: "About",
      contact: "Contact",
      legal: "Legal",
      terms: "Terms of Service",
      privacy: "Privacy Policy",
      cookies: "Cookie Policy",
      kvkk: "GDPR",
      copyright: "All rights reserved.",
      madeWith: "Made with",
    },
    // Common
    common: {
      views: "views",
      subscribers: "subscribers",
      comments: "Comments",
      like: "Like",
      share: "Share",
      subscribe: "Subscribe",
      subscribed: "Subscribed",
      loading: "Loading...",
    },
    // Language
    language: {
      label: "Language",
      tr: "Türkçe",
      en: "English",
    },
  },
} as const;

export type Language = keyof typeof translations;
export type TranslationKeys = typeof translations[Language];
