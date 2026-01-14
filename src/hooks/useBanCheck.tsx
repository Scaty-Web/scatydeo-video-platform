import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useBanCheck = () => {
  const { user } = useAuth();
  const [isBanned, setIsBanned] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkBanStatus();
    } else {
      setIsBanned(false);
      setLoading(false);
    }
  }, [user]);

  const checkBanStatus = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .rpc('is_user_banned', { _user_id: user.id });

    setIsBanned(!!data);
    setLoading(false);
  };

  return { isBanned, loading };
};
