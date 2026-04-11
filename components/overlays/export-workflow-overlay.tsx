"use client";

import { Download, FlaskConical } from "lucide-react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Overlay } from "./overlay";
import { useOverlay } from "./overlay-provider";
import type { OverlayComponentProps } from "./types";

type ExportWorkflowOverlayProps = OverlayComponentProps<{
  onExport: () => void;
  isDownloading?: boolean;
}>;

export function ExportWorkflowOverlay({
  overlayId,
  onExport,
  isDownloading,
}: ExportWorkflowOverlayProps) {
  const t = useTranslations("ExportWorkflowOverlay");
  const { closeAll } = useOverlay();

  const handleExport = () => {
    closeAll();
    onExport();
  };

  return (
    <Overlay
      actions={[
        { label: t("cancel"), variant: "outline", onClick: closeAll },
        {
          label: isDownloading ? t("exporting") : t("exportProject"),
          onClick: handleExport,
          loading: isDownloading,
        },
      ]}
      overlayId={overlayId}
      title={t("title")}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <Download className="size-5" />
        <p className="text-sm">{t("description")}</p>
      </div>

      <p className="mt-4 text-muted-foreground text-sm">
        {t("additionalInfo")}
      </p>

      <Alert className="mt-4">
        <FlaskConical className="size-4" />
        <AlertTitle>{t("experimentalTitle")}</AlertTitle>
        <AlertDescription className="block">
          {t("experimentalDescription")}{" "}
          <a
            className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
            href="https://github.com/vercel-labs/workflow-builder-template/issues"
            rel="noopener noreferrer"
            target="_blank"
          >
            {t("reportOnGitHub")}
          </a>
          .
        </AlertDescription>
      </Alert>
    </Overlay>
  );
}
