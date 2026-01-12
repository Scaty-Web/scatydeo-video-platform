import VideoCard from "./VideoCard";

const videos = [
  {
    title: "Scatydeo Tanıtım Videosu - Yeni Başlayanlar İçin",
    thumbnail: "https://images.unsplash.com/photo-1536240478700-b869070f9279?w=800&q=80",
    duration: "12:34",
    views: "1.2M",
    author: "Scaty Official",
  },
  {
    title: "Gece Şehir Manzaraları - 4K Sinematik",
    thumbnail: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=800&q=80",
    duration: "8:45",
    views: "856K",
    author: "Urban Views",
  },
  {
    title: "Doğa Belgeseli - Yağmur Ormanları",
    thumbnail: "https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=800&q=80",
    duration: "24:12",
    views: "2.1M",
    author: "Nature Channel",
  },
  {
    title: "Teknoloji Trendleri 2026 - Gelecek Burada",
    thumbnail: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&q=80",
    duration: "18:30",
    views: "654K",
    author: "Tech Reviews",
  },
  {
    title: "Uzay Keşfi - Mars Yolculuğu",
    thumbnail: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800&q=80",
    duration: "32:18",
    views: "3.4M",
    author: "Space Explorers",
  },
  {
    title: "Müzik Prodüksiyon Dersleri - Başlangıç",
    thumbnail: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&q=80",
    duration: "15:42",
    views: "432K",
    author: "Beat Makers",
  },
  {
    title: "Sanat ve Yaratıcılık - Digital Art",
    thumbnail: "https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?w=800&q=80",
    duration: "21:05",
    views: "789K",
    author: "Art Studio",
  },
  {
    title: "Spor Highlights - En İyi Anlar",
    thumbnail: "https://images.unsplash.com/photo-1461896836934- voices-of-sport?w=800&q=80",
    duration: "10:28",
    views: "1.8M",
    author: "Sports Zone",
  },
];

const VideoGrid = () => {
  return (
    <section id="videos" className="py-20 relative">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-bold">
              <span className="glow-text">Popüler</span> Videolar
            </h2>
            <p className="text-muted-foreground mt-2">En çok izlenen içerikler</p>
          </div>
          <a 
            href="#" 
            className="text-primary hover:text-accent transition-colors font-medium"
          >
            Tümünü Gör →
          </a>
        </div>

        {/* Video Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {videos.map((video, index) => (
            <VideoCard 
              key={index} 
              {...video} 
              delay={index * 0.1}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default VideoGrid;
