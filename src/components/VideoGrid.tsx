import { AlertTriangle, Video } from "lucide-react";

const VideoGrid = () => {
  return (
    <section id="videos" className="py-20 relative">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-10">
          <h2 className="font-display text-3xl md:text-4xl font-bold">
            <span className="glow-text">Popüler</span> Videolar
          </h2>
          <p className="text-muted-foreground mt-2">En çok izlenen içerikler</p>
        </div>

        {/* Warning Banner */}
        <div className="max-w-2xl mx-auto mb-12 animate-fade-in">
          <div className="relative p-6 rounded-2xl border-2 border-primary/50 bg-primary/10 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/10 to-primary/20 rounded-2xl" />
            <div className="relative flex items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-primary">
                  Bu bir deneme sürümüdür
                </h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Scatydeo şu anda geliştirme aşamasındadır. Videolar yakında eklenecektir.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center mb-6">
            <Video className="w-12 h-12 text-muted-foreground" />
          </div>
          <h3 className="font-display text-xl font-semibold text-muted-foreground mb-2">
            Henüz video bulunmuyor
          </h3>
          <p className="text-muted-foreground/70 max-w-md">
            İçerikler hazırlanıyor. Çok yakında harika videolarla karşınızda olacağız!
          </p>
        </div>
      </div>
    </section>
  );
};

export default VideoGrid;
