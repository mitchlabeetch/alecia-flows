"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AccountSettings } from "@/components/settings/account-settings";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api-client";
import { Overlay } from "./overlay";
import { useOverlay } from "./overlay-provider";

type SettingsOverlayProps = {
  overlayId: string;
};

export function SettingsOverlay({ overlayId }: SettingsOverlayProps) {
  const t = useTranslations("SettingsOverlay");
  const { closeAll } = useOverlay();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Account state
  const [accountName, setAccountName] = useState("");
  const [accountEmail, setAccountEmail] = useState("");

  const loadAccount = useCallback(async () => {
    try {
      const data = await api.user.get();
      setAccountName(data.name || "");
      setAccountEmail(data.email || "");
    } catch (error) {
      console.error("Failed to load account:", error);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      await loadAccount();
    } finally {
      setLoading(false);
    }
  }, [loadAccount]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const saveAccount = async () => {
    try {
      setSaving(true);
      await api.user.update({ name: accountName, email: accountEmail });
      await loadAccount();
      toast.success(t("settingsSaved"));
      closeAll();
    } catch (error) {
      console.error("Failed to save account:", error);
      toast.error(t("settingsSaveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Overlay
      actions={[
        { label: t("cancel"), variant: "outline", onClick: closeAll },
        {
          label: t("save"),
          onClick: saveAccount,
          loading: saving,
          disabled: loading,
        },
      ]}
      overlayId={overlayId}
      title={t("title")}
    >
      <p className="-mt-2 mb-4 text-muted-foreground text-sm">
        {t("description")}
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      ) : (
        <AccountSettings
          accountEmail={accountEmail}
          accountName={accountName}
          onEmailChange={setAccountEmail}
          onNameChange={setAccountName}
        />
      )}
    </Overlay>
  );
}
