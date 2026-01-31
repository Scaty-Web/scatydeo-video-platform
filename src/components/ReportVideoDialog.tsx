import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
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

const ReportVideoDialog = ({ videoId, videoTitle }: ReportVideoDialogProps) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const REPORT_REASONS = [
    { value: "spam", label: t.report.reasons.spam },
    { value: "violence", label: t.report.reasons.violence },
    { value: "hate", label: t.report.reasons.hate },
    { value: "sexual", label: t.report.reasons.sexual },
    { value: "harmful", label: t.report.reasons.harmful },
    { value: "child", label: t.report.reasons.child },
    { value: "copyright", label: t.report.reasons.copyright },
    { value: "other", label: t.report.reasons.other },
  ];

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: t.common.signIn,
        description: t.report.signInRequired,
        variant: "destructive",
      });
      return;
    }

    if (!reason) {
      toast({
        title: t.common.error,
        description: t.report.selectReason,
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
          title: t.report.alreadyReported,
          description: t.report.alreadyReportedDesc,
          variant: "destructive",
        });
      } else {
        toast({
          title: t.common.error,
          description: t.report.reportError,
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: t.report.reportSent,
        description: t.report.reportSentDesc,
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
          {t.report.reportBtn}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.report.title}</DialogTitle>
          <DialogDescription>
            "{videoTitle}" {t.report.description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t.report.reasonLabel}</label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder={t.report.reasonPlaceholder} />
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
            <label className="text-sm font-medium">{t.report.detailsLabel}</label>
            <Textarea
              placeholder={t.report.detailsPlaceholder}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="min-h-[100px]"
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t.common.cancel}
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleSubmit}
            disabled={!reason || submitting}
          >
            {submitting ? t.report.submitting : t.report.reportBtn}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportVideoDialog;
