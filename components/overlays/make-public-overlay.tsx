"use client";

import { Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import { Overlay } from "./overlay";
import { useOverlay } from "./overlay-provider";
import type { OverlayComponentProps } from "./types";

type MakePublicOverlayProps = OverlayComponentProps<{
  onConfirm: () => void;
}>;

export function MakePublicOverlay({
  overlayId,
  onConfirm,
}: MakePublicOverlayProps) {
  const t = useTranslations("MakePublicOverlay");
  const { closeAll } = useOverlay();

  const handleConfirm = () => {
    closeAll();
    onConfirm();
  };

  return (
    <Overlay
      actions={[
        { label: t("cancel"), variant: "outline", onClick: closeAll },
        { label: t("makePublic"), onClick: handleConfirm },
      ]}
      overlayId={overlayId}
      title={t("title")}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <Globe className="size-5 shrink-0" />
        <p className="text-sm">{t("description")}</p>
      </div>

      <ul className="mt-3 list-inside list-disc space-y-1 text-muted-foreground text-sm">
        <li>{t("canView")}</li>
        <li>{t("canSeeActions")}</li>
        <li>{t("canDuplicate")}</li>
      </ul>

      <p className="mt-4 font-medium text-foreground text-sm">
        {t("remainsPrivate")}
      </p>
      <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground text-sm">
        <li>{t("credentialsPrivate")}</li>
        <li>{t("historyPrivate")}</li>
      </ul>
    </Overlay>
  );
}
