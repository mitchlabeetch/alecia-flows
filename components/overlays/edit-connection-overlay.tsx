"use client";

import { Check, Pencil, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/use-mobile";
import { api, type Integration } from "@/lib/api-client";
import { getIntegration, getIntegrationLabels } from "@/plugins";
import { ConfirmOverlay } from "./confirm-overlay";
import { Overlay } from "./overlay";
import { useOverlay } from "./overlay-provider";

const SYSTEM_INTEGRATION_LABELS: Record<string, string> = {
  database: "Database",
};

const getLabel = (type: string): string => {
  const labels = getIntegrationLabels() as Record<string, string>;
  return labels[type] || SYSTEM_INTEGRATION_LABELS[type] || type;
};

type EditConnectionOverlayProps = {
  overlayId: string;
  integration: Integration;
  onSuccess?: () => void;
  onDelete?: () => void;
};

/**
 * Secret field with "Configured" state for edit mode
 */
function SecretField({
  fieldId,
  label,
  configKey,
  placeholder,
  helpText,
  helpLink,
  value,
  onChange,
}: {
  fieldId: string;
  label: string;
  configKey: string;
  placeholder?: string;
  helpText?: string;
  helpLink?: { url: string; text: string };
  value: string;
  onChange: (key: string, value: string) => void;
}) {
  const t = useTranslations("EditConnectionOverlay");
  const [isEditing, setIsEditing] = useState(false);
  const isMobile = useIsMobile();
  const hasNewValue = value.length > 0;

  // Show "Configured" state until user clicks Change
  if (!(isEditing || hasNewValue)) {
    return (
      <div className="space-y-2">
        <Label htmlFor={fieldId}>{label}</Label>
        <div className="flex items-center gap-2">
          <div className="flex h-9 flex-1 items-center gap-2 rounded-md border bg-muted/30 px-3">
            <Check className="size-4 text-green-600" />
            <span className="text-muted-foreground text-sm">
              {t("configured")}
            </span>
          </div>
          <Button
            onClick={() => setIsEditing(true)}
            type="button"
            variant="outline"
          >
            <Pencil className="mr-1.5 size-3" />
            {t("change")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId}>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          autoFocus={isEditing && !isMobile}
          className="flex-1"
          id={fieldId}
          onChange={(e) => onChange(configKey, e.target.value)}
          placeholder={placeholder}
          type="password"
          value={value}
        />
        {(isEditing || hasNewValue) && (
          <Button
            onClick={() => {
              onChange(configKey, "");
              setIsEditing(false);
            }}
            size="icon"
            type="button"
            variant="ghost"
          >
            <X className="size-4" />
          </Button>
        )}
      </div>
      {(helpText || helpLink) && (
        <p className="text-muted-foreground text-xs">
          {helpText}
          {helpLink && (
            <a
              className="underline hover:text-foreground"
              href={helpLink.url}
              rel="noopener noreferrer"
              target="_blank"
            >
              {helpLink.text}
            </a>
          )}
        </p>
      )}
    </div>
  );
}

/**
 * Overlay for editing an existing connection
 */
export function EditConnectionOverlay({
  overlayId,
  integration,
  onSuccess,
  onDelete,
}: EditConnectionOverlayProps) {
  const t = useTranslations("EditConnectionOverlay");
  const { push, closeAll } = useOverlay();
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [_testResult, setTestResult] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);
  const [name, setName] = useState(integration.name);
  const [config, setConfig] = useState<Record<string, string>>({});

  const updateConfig = (key: string, value: string) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const doSave = async () => {
    try {
      setSaving(true);
      const hasNewConfig = Object.values(config).some((v) => v && v.length > 0);
      await api.integration.update(integration.id, {
        name: name.trim(),
        ...(hasNewConfig ? { config } : {}),
      });
      toast.success(t("connectionUpdated"));
      onSuccess?.();
      closeAll();
    } catch (error) {
      console.error("Failed to update integration:", error);
      toast.error(t("connectionUpdateFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    const hasNewConfig = Object.values(config).some((v) => v && v.length > 0);

    // If no new config, just save the name
    if (!hasNewConfig) {
      await doSave();
      return;
    }

    // Test before saving
    try {
      setSaving(true);
      setTestResult(null);

      const result = await api.integration.testCredentials({
        type: integration.type,
        config,
      });

      if (result.status === "error") {
        push(ConfirmOverlay, {
          title: t("connectionTestFailed"),
          message: t("testFailedSaveAnyway", { message: result.message }),
          confirmLabel: t("saveAnyway"),
          onConfirm: async () => {
            await doSave();
          },
        });
        setSaving(false);
        return;
      }

      await doSave();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("connectionUpdateFailed");
      push(ConfirmOverlay, {
        title: t("connectionTestFailed"),
        message: t("testFailedSaveAnyway", { message }),
        confirmLabel: t("saveAnyway"),
        onConfirm: async () => {
          await doSave();
        },
      });
      setSaving(false);
    }
  };

  const handleTest = async () => {
    const hasNewConfig = Object.values(config).some((v) => v && v.length > 0);

    try {
      setTesting(true);
      setTestResult(null);

      let result: { status: "success" | "error"; message: string };

      if (hasNewConfig) {
        // Test new credentials
        result = await api.integration.testCredentials({
          type: integration.type,
          config,
        });
      } else {
        // Test existing credentials
        result = await api.integration.testConnection(integration.id);
      }

      setTestResult(result);
      if (result.status === "success") {
        toast.success(result.message || "Connection successful");
      } else {
        toast.error(result.message || "Connection failed");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Connection test failed";
      setTestResult({ status: "error", message });
      toast.error(message);
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = () => {
    push(DeleteConnectionOverlay, {
      integration,
      onSuccess: () => {
        onDelete?.();
        closeAll();
      },
    });
  };

  // Get plugin form fields
  const plugin = getIntegration(integration.type);
  const formFields = plugin?.formFields;

  // Render config fields
  const renderConfigFields = () => {
    if (integration.type === "database") {
      return (
        <SecretField
          configKey="url"
          fieldId="url"
          helpText="Connection string in the format: postgresql://user:password@host:port/database"
          label="Database URL"
          onChange={updateConfig}
          placeholder="postgresql://user:password@host:port/database"
          value={config.url || ""}
        />
      );
    }

    if (!formFields) return null;

    return formFields.map((field) => {
      if (field.type === "password") {
        return (
          <SecretField
            configKey={field.configKey}
            fieldId={field.id}
            helpLink={field.helpLink}
            helpText={field.helpText}
            key={field.id}
            label={field.label}
            onChange={updateConfig}
            placeholder={field.placeholder}
            value={config[field.configKey] || ""}
          />
        );
      }

      return (
        <div className="space-y-2" key={field.id}>
          <Label htmlFor={field.id}>{field.label}</Label>
          <Input
            id={field.id}
            onChange={(e) => updateConfig(field.configKey, e.target.value)}
            placeholder={field.placeholder}
            type={field.type}
            value={config[field.configKey] || ""}
          />
          {(field.helpText || field.helpLink) && (
            <p className="text-muted-foreground text-xs">
              {field.helpText}
              {field.helpLink && (
                <a
                  className="underline hover:text-foreground"
                  href={field.helpLink.url}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {field.helpLink.text}
                </a>
              )}
            </p>
          )}
        </div>
      );
    });
  };

  return (
    <Overlay
      actions={[
        {
          label: t("delete"),
          variant: "ghost",
          onClick: handleDelete,
          disabled: saving || testing,
        },
        {
          label: t("test"),
          variant: "outline",
          onClick: handleTest,
          loading: testing,
          disabled: saving,
        },
        { label: t("update"), onClick: handleSave, loading: saving },
      ]}
      overlayId={overlayId}
      title={t("title", { label: getLabel(integration.type) })}
    >
      <p className="-mt-2 mb-4 text-muted-foreground text-sm">
        {t("updateCredentials")}
      </p>

      <div className="space-y-4">
        {renderConfigFields()}

        <div className="space-y-2">
          <Label htmlFor="name">{t("labelOptional")}</Label>
          <Input
            id="name"
            onChange={(e) => setName(e.target.value)}
            placeholder={t("labelPlaceholder")}
            value={name}
          />
        </div>
      </div>
    </Overlay>
  );
}

type DeleteConnectionOverlayProps = {
  overlayId: string;
  integration: Integration;
  onSuccess?: () => void;
};

/**
 * Overlay for deleting a connection with optional key revocation
 */
export function DeleteConnectionOverlay({
  overlayId,
  integration,
  onSuccess,
}: DeleteConnectionOverlayProps) {
  const t = useTranslations("EditConnectionOverlay");
  const { pop } = useOverlay();
  const [deleting, setDeleting] = useState(false);
  const [revokeKey, setRevokeKey] = useState(true);

  const handleDelete = async () => {
    try {
      setDeleting(true);

      if (integration.isManaged && revokeKey) {
        await api.aiGateway.revokeConsent();
      } else {
        await api.integration.delete(integration.id);
      }

      toast.success(t("connectionDeleted"));
      onSuccess?.();
    } catch (error) {
      console.error("Failed to delete integration:", error);
      toast.error(t("connectionDeleteFailed"));
      setDeleting(false);
    }
  };

  return (
    <Overlay
      actions={[
        { label: t("cancel"), variant: "outline", onClick: pop },
        {
          label: t("delete"),
          variant: "destructive",
          onClick: handleDelete,
          loading: deleting,
        },
      ]}
      overlayId={overlayId}
      title={t("deleteConnection")}
    >
      <p className="text-muted-foreground text-sm">
        {t("deleteConnectionConfirm")}
      </p>

      {integration.isManaged && (
        <div className="mt-4 flex items-center gap-2">
          <Checkbox
            checked={revokeKey}
            id="revoke-key"
            onCheckedChange={(checked: boolean) => setRevokeKey(checked)}
          />
          <Label className="cursor-pointer font-normal" htmlFor="revoke-key">
            {t("revokeKey")}
          </Label>
        </div>
      )}
    </Overlay>
  );
}
