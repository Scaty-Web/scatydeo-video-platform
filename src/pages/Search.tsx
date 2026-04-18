import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search as SearchIcon, Loader2, Video } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import VideoCard from "@/components/VideoCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const Search = () => {
  const { t, language } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get("q") || "";
  const [searchQuery, setSearchQuery] = useState(queryParam);

  useEffect(() => {
    setSearchQuery(queryParam);
  }, [queryParam]);

  const { data: videos, isLoading } = useQuery({
    queryKey: ['search-videos', queryParam],
    queryFn: async () => {
      if (!queryParam.trim()) return [];
      
      const { data, error } = await supabase
        .from('videos')
        .select(`
          id,
          title,
          thumbnail_url,
          duration,
          views_count,
          user_id,
          created_at,
          profiles:user_id (
            username,
            display_name
          )
        `)
        .eq('is_public', true)
        .ilike('title', `%${queryParam}%`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: queryParam.trim().length > 0
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchParams({ q: searchQuery.trim() });
    }
  };

  const formatViews = (count: number | null) => {
    if (!count) return "0";
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Search Header */}
          <div className="max-w-2xl mx-auto mb-10">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-center mb-6">
              <span className="glow-text">{t.search.title}</span>
            </h1>
            
            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={t.search.placeholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-12 text-base"
                />
              </div>
              <Button type="submit" variant="hero" size="lg" className="h-12 px-6">
                {t.search.searchBtn}
              </Button>
            </form>
          </div>

          {/* Results */}
          {queryParam && (
            <div className="mb-6">
              <p className="text-muted-foreground">
                {t.search.resultsFor} "<span className="text-foreground font-medium">{queryParam}</span>"
                {videos && videos.length > 0 && (
                  <span className="ml-2">({videos.length} {t.search.results})</span>
                )}
              </p>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          {/* Results Grid */}
          {!isLoading && videos && videos.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {videos.map((video, index) => (
                <VideoCard
                  key={video.id}
                  videoId={video.id}
                  title={video.title}
                  thumbnail={video.thumbnail_url || ''}
                  duration={video.duration || '0:00'}
                  views={formatViews(video.views_count)}
                  author={video.profiles?.display_name || video.profiles?.username || t.videoGrid.anonymous}
                  delay={index * 0.05}
                />
              ))}
            </div>
          )}

          {/* No Results */}
          {!isLoading && queryParam && (!videos || videos.length === 0) && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center mb-6">
                <Video className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="font-display text-xl font-semibold text-muted-foreground mb-2">
                {t.search.noResults}
              </h3>
              <p className="text-muted-foreground/70 max-w-md">
                {t.search.noResultsDesc}
              </p>
            </div>
          )}

          {/* Initial State */}
          {!queryParam && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center mb-6">
                <SearchIcon className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="font-display text-xl font-semibold text-muted-foreground mb-2">
                {t.search.startSearch}
              </h3>
              <p className="text-muted-foreground/70 max-w-md">
                {t.search.startSearchDesc}
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Search;
