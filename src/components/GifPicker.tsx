import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export const GIF_PREFIX = "[gif]";
export const isGifComment = (c: string) => c.startsWith(GIF_PREFIX);
export const gifUrl = (c: string) => c.slice(GIF_PREFIX.length).trim();

export const CommentContent = ({ content }: { content: string }) =>
  isGifComment(content) ? (
    <img src={gifUrl(content)} alt="GIF" loading="lazy" className="mt-1 max-w-[220px] rounded-lg" />
  ) : (
    <p className="text-sm">{content}</p>
  );

const GifPicker = ({ onSelect, disabled = false }: { onSelect: (url: string) => void; disabled?: boolean }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [gifs, setGifs] = useState<{ id: number; url: string; title: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      setLoading(true);
      const { data } = await supabase.functions.invoke("gif-search", { body: { q } });
      setGifs(data?.gifs ?? []);
      setLoading(false);
    }, 400);
    return () => clearTimeout(t);
  }, [q, open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="icon" disabled={disabled} aria-label="GIF" className="font-bold text-xs">GIF</Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="end">
        <Input placeholder="GIF ara..." value={q} onChange={(e) => setQ(e.target.value)} className="mb-2" />
        <div className="grid grid-cols-3 gap-1 max-h-64 overflow-y-auto">
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin col-span-3 mx-auto my-6 text-primary" />
          ) : (
            gifs.map((g) => (
              <Button type="button" variant="ghost" className="h-20 p-0" disabled={disabled} key={g.id} onClick={() => { onSelect(g.url); setOpen(false); }}>
                <img src={g.url} alt={g.title} loading="lazy" className="w-full h-20 object-cover rounded" />
              </Button>
            ))
          )}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1 text-right">Powered by KLIPY</p>
      </PopoverContent>
    </Popover>
  );
};

export default GifPicker;
