import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import GifPicker, { GIF_PREFIX } from "@/components/GifPicker";
import { useLanguage } from "@/hooks/useLanguage";
import { Loader2, Send } from "lucide-react";

interface ReplyComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (content: string) => void;
  busy?: boolean;
}

export default function ReplyComposer({ value, onChange, onSend, busy = false }: ReplyComposerProps) {
  const { language } = useLanguage();
  return (
    <div className="flex min-w-0 flex-wrap items-start gap-2">
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={language === "tr" ? "Yanıt yaz..." : "Write a reply..."}
        aria-label={language === "tr" ? "Yanıt yaz" : "Write a reply"}
        disabled={busy}
        className="min-h-[40px] max-h-32 min-w-0 flex-1 basis-32 bg-muted/30 border-primary/30"
      />
      <GifPicker disabled={busy} onSelect={(url) => onSend(GIF_PREFIX + url)} />
      <Button
        type="button"
        onClick={() => onSend(value)}
        disabled={busy || !value.trim()}
        size="icon"
        aria-label={language === "tr" ? "Yanıtı gönder" : "Send reply"}
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
      </Button>
    </div>
  );
}