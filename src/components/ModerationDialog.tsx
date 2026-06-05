import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Ban, Shield, Send, Loader2 } from "lucide-react";
import { getAvatarUrl } from "@/lib/defaults";

interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

const ModerationDialog = ({ open, onOpenChange }: Props) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const isTr = language === "tr";

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [action, setAction] = useState<"ban" | "promote" | "message" | null>(null);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setQuery(""); setResults([]); setSelected(null);
    setAction(null); setReason(""); setMessage("");
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .or(`username.ilike.%${query.trim()}%,display_name.ilike.%${query.trim()}%`)
      .limit(10);
    setResults((data ?? []) as Profile[]);
    setSearching(false);
  };

  const runBan = async () => {
    if (!selected || !user) return;
    if (!reason.trim()) {
      toast({ title: isTr ? "Sebep gerekli" : "Reason required", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("banned_users").insert({
      user_id: selected.id,
      reason: reason.trim(),
      banned_by: user.id,
    });
    setBusy(false);
    if (error) {
      toast({ title: isTr ? "Hata" : "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: isTr ? "Kullanıcı banlandı" : "User banned" });
    reset(); onOpenChange(false);
  };

  const runPromote = async () => {
    if (!selected) return;
    setBusy(true);
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: selected.id, role: "moderator" });
    setBusy(false);
    if (error && !error.message.includes("duplicate")) {
      toast({ title: isTr ? "Hata" : "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: isTr ? "Moderatör yapıldı" : "Promoted to moderator" });
    reset(); onOpenChange(false);
  };

  const runMessage = async () => {
    if (!selected) return;
    if (!message.trim()) {
      toast({ title: isTr ? "Mesaj gerekli" : "Message required", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("notifications").insert({
      user_id: selected.id,
      type: "moderation",
      title: isTr ? "Moderasyon Mesajı" : "Moderation Message",
      message: message.trim(),
    });
    setBusy(false);
    if (error) {
      toast({ title: isTr ? "Hata" : "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: isTr ? "Mesaj gönderildi" : "Message sent" });
    reset(); onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="m3-surface-high max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            {isTr ? "Moderasyon Paneli" : "Moderation Panel"}
          </DialogTitle>
          <DialogDescription>
            {isTr
              ? "Kullanıcı ara, sonra işlem seç: banla, moderatör yap veya mesaj gönder."
              : "Search a user, then ban, promote or send a moderation message."}
          </DialogDescription>
        </DialogHeader>

        {!selected ? (
          <>
            <div className="flex gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder={isTr ? "Kullanıcı adı ara..." : "Search username..."}
              />
              <Button onClick={handleSearch} disabled={searching}>
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {results.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className="m3-state-layer w-full flex items-center gap-3 p-2 rounded-lg text-left"
                >
                  <Avatar className="w-9 h-9">
                    <AvatarImage src={getAvatarUrl(p.avatar_url)} />
                    <AvatarFallback>{(p.username || "?").charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{p.display_name || p.username}</p>
                    <p className="text-xs text-muted-foreground">@{p.username}</p>
                  </div>
                </button>
              ))}
              {!searching && results.length === 0 && query && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {isTr ? "Sonuç yok" : "No results"}
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <Avatar className="w-10 h-10">
                <AvatarImage src={getAvatarUrl(selected.avatar_url)} />
                <AvatarFallback>{(selected.username || "?").charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-semibold">{selected.display_name || selected.username}</p>
                <p className="text-xs text-muted-foreground">@{selected.username}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setSelected(null); setAction(null); }}>
                {isTr ? "Değiştir" : "Change"}
              </Button>
            </div>

            {!action ? (
              <div className="grid grid-cols-3 gap-2">
                <Button variant="destructive" onClick={() => setAction("ban")} className="flex-col h-20 gap-1">
                  <Ban className="w-5 h-5" />
                  <span className="text-xs">{isTr ? "Banla" : "Ban"}</span>
                </Button>
                <Button variant="secondary" onClick={() => setAction("promote")} className="flex-col h-20 gap-1">
                  <Shield className="w-5 h-5" />
                  <span className="text-xs">{isTr ? "Mod Yap" : "Promote"}</span>
                </Button>
                <Button variant="default" onClick={() => setAction("message")} className="flex-col h-20 gap-1">
                  <Send className="w-5 h-5" />
                  <span className="text-xs">{isTr ? "Mesaj" : "Message"}</span>
                </Button>
              </div>
            ) : action === "ban" ? (
              <div className="space-y-2">
                <Textarea
                  placeholder={isTr ? "Ban sebebi..." : "Ban reason..."}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" onClick={() => setAction(null)}>{isTr ? "İptal" : "Cancel"}</Button>
                  <Button variant="destructive" onClick={runBan} disabled={busy}>
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : (isTr ? "Banla" : "Ban")}
                  </Button>
                </div>
              </div>
            ) : action === "promote" ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {isTr
                    ? "Bu kullanıcıya moderatör rolü verilecek. Onaylıyor musun?"
                    : "This user will be promoted to moderator. Confirm?"}
                </p>
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" onClick={() => setAction(null)}>{isTr ? "İptal" : "Cancel"}</Button>
                  <Button onClick={runPromote} disabled={busy}>
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : (isTr ? "Onayla" : "Confirm")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Textarea
                  placeholder={isTr ? "Moderasyon mesajı..." : "Moderation message..."}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" onClick={() => setAction(null)}>{isTr ? "İptal" : "Cancel"}</Button>
                  <Button onClick={runMessage} disabled={busy}>
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : (isTr ? "Gönder" : "Send")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ModerationDialog;