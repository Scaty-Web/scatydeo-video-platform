import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Flag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ReportVideoDialogProps {
  videoId: string;
  videoTitle: string;
}

const REPORT_REASONS = [
  { value: "spam", label: "Spam veya yanıltıcı içerik" },
  { value: "violence", label: "Şiddet veya tehlikeli içerik" },
  { value: "hate", label: "Nefret söylemi veya taciz" },
  { value: "sexual", label: "Cinsel içerik" },
  { value: "harmful", label: "Zararlı veya tehlikeli eylemler" },
  { value: "child", label: "Çocuk istismarı" },
  { value: "copyright", label: "Telif hakkı ihlali" },
  { value: "other", label: "Diğer" },
];

const ReportVideoDialog = ({ videoId, videoTitle }: ReportVideoDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Giriş Yapın",
        description: "Video bildirmek için giriş yapmalısınız.",
        variant: "destructive",
      });
      return;
    }

    if (!reason) {
      toast({
        title: "Neden Seçin",
        description: "Lütfen bir bildirim nedeni seçin.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    const reasonLabel = REPORT_REASONS.find(r => r.value === reason)?.label || reason;
    const fullReason = details.trim() 
      ? `${reasonLabel}: ${details.trim()}`
      : reasonLabel;

    const { error } = await supabase
      .from("video_reports")
      .insert({
        video_id: videoId,
        reporter_id: user.id,
        reason: fullReason,
        status: "pending"
      });

    if (error) {
      if (error.code === '23505') {
        toast({
          title: "Zaten Bildirildi",
          description: "Bu videoyu daha önce bildirdiniz.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Hata",
          description: "Bildirim gönderilirken bir hata oluştu.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Bildirim Gönderildi",
        description: "Raporunuz moderatörlere iletildi. Teşekkürler!",
      });
      setOpen(false);
      setReason("");
      setDetails("");
    }

    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
          <Flag className="w-4 h-4" />
          Bildir
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Video Bildir</DialogTitle>
          <DialogDescription>
            "{videoTitle}" videosunu bildirmek üzeresiniz.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Bildirim Nedeni</label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Bir neden seçin" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Ek Detaylar (Opsiyonel)</label>
            <Textarea
              placeholder="Daha fazla bilgi verin..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="min-h-[100px]"
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            İptal
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleSubmit}
            disabled={!reason || submitting}
          >
            {submitting ? "Gönderiliyor..." : "Bildir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportVideoDialog;
