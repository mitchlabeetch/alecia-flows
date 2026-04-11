"use client";

import { Copy, Key, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api-client";
import { ConfirmOverlay } from "./confirm-overlay";
import { Overlay } from "./overlay";
import { useOverlay } from "./overlay-provider";

type ApiKey = {
  id: string;
  name: string | null;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  key?: string;
};

type ApiKeysOverlayProps = {
  overlayId: string;
};

/**
 * Overlay for creating a new API key.
 * Pushed onto the stack from ApiKeysOverlay.
 */
function CreateApiKeyOverlay({
  overlayId,
  onCreated,
}: {
  overlayId: string;
  onCreated: (key: ApiKey) => void;
}) {
  const t = useTranslations("ApiKeysOverlay");
  const { pop } = useOverlay();
  const [keyName, setKeyName] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const newKey = await api.apiKeys.create({ name: keyName || null });
      onCreated(newKey);
      toast.success(t("apiKeyCreated"));
      pop();
    } catch (error) {
      console.error("Failed to create API key:", error);
      toast.error(
        error instanceof Error ? error.message : t("apiKeyCreateFailed")
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <Overlay
      actions={[
        { label: t("create"), onClick: handleCreate, loading: creating },
      ]}
      overlayId={overlayId}
      title={t("createApiKey")}
    >
      <p className="mb-4 text-muted-foreground text-sm">
        {t("createDescription")}
      </p>
      <div className="space-y-2">
        <Label htmlFor="key-name">{t("labelOptional")}</Label>
        <Input
          id="key-name"
          onChange={(e) => setKeyName(e.target.value)}
          placeholder={t("labelPlaceholder")}
          value={keyName}
        />
      </div>
    </Overlay>
  );
}

/**
 * Main API Keys management overlay.
 */
export function ApiKeysOverlay({ overlayId }: ApiKeysOverlayProps) {
  const t = useTranslations("ApiKeysOverlay");
  const { push, closeAll } = useOverlay();
  const [loading, setLoading] = useState(true);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadApiKeys = useCallback(async () => {
    setLoading(true);
    try {
      const keys = await api.apiKeys.getAll();
      setApiKeys(keys);
    } catch (error) {
      console.error("Failed to load API keys:", error);
      toast.error(t("loadApiKeysFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadApiKeys();
  }, [loadApiKeys]);

  const handleKeyCreated = (newKey: ApiKey) => {
    setNewlyCreatedKey(newKey.key ?? null);
    setApiKeys((prev) => [newKey, ...prev]);
  };

  const handleDelete = async (keyId: string) => {
    setDeleting(keyId);
    try {
      await api.apiKeys.delete(keyId);
      setApiKeys((prev) => prev.filter((k) => k.id !== keyId));
      toast.success(t("apiKeyDeleted"));
    } catch (error) {
      console.error("Failed to delete API key:", error);
      toast.error(t("apiKeyDeleteFailed"));
    } finally {
      setDeleting(null);
    }
  };

  const openDeleteConfirm = (keyId: string) => {
    push(ConfirmOverlay, {
      title: t("deleteApiKey"),
      message: t("deleteApiKeyConfirm"),
      confirmLabel: t("delete"),
      confirmVariant: "destructive" as const,
      destructive: true,
      onConfirm: () => handleDelete(keyId),
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t("copiedToClipboard"));
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <Overlay
      actions={[
        {
          label: t("newApiKey"),
          variant: "outline",
          onClick: () =>
            push(CreateApiKeyOverlay, { onCreated: handleKeyCreated }),
        },
        { label: t("done"), onClick: closeAll },
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
        <div className="space-y-4">
          {/* Newly created key warning */}
          {newlyCreatedKey && (
            <div className="rounded-md border border-yellow-500/50 bg-yellow-500/10 p-3">
              <p className="mb-2 font-medium text-sm text-yellow-600 dark:text-yellow-400">
                {t("copyNow")}
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-muted px-2 py-1 font-mono text-xs">
                  {newlyCreatedKey}
                </code>
                <Button
                  onClick={() => copyToClipboard(newlyCreatedKey)}
                  size="sm"
                  variant="outline"
                >
                  <Copy className="size-4" />
                </Button>
              </div>
              <Button
                className="mt-2"
                onClick={() => setNewlyCreatedKey(null)}
                size="sm"
                variant="ghost"
              >
                {t("dismiss")}
              </Button>
            </div>
          )}

          {/* API Keys list */}
          {apiKeys.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              <Key className="mx-auto mb-2 size-8 opacity-50" />
              <p>{t("noApiKeys")}</p>
              <p className="text-xs">{t("noApiKeysHint")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {apiKeys.map((apiKey) => (
                <div
                  className="flex items-center justify-between rounded-md border p-3"
                  key={apiKey.id}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                        {apiKey.keyPrefix}...
                      </code>
                      {apiKey.name && (
                        <span className="truncate text-sm">{apiKey.name}</span>
                      )}
                    </div>
                    <p className="mt-1 text-muted-foreground text-xs">
                      {t("created")} {formatDate(apiKey.createdAt)}
                      {apiKey.lastUsedAt &&
                        ` · ${t("lastUsed")} ${formatDate(apiKey.lastUsedAt)}`}
                      {apiKey.expiresAt &&
                        ` · ${t("expires")} ${formatDate(apiKey.expiresAt)}`}
                    </p>
                  </div>
                  <Button
                    disabled={deleting === apiKey.id}
                    onClick={() => openDeleteConfirm(apiKey.id)}
                    size="sm"
                    variant="ghost"
                  >
                    {deleting === apiKey.id ? (
                      <Spinner className="size-4" />
                    ) : (
                      <Trash2 className="size-4 text-destructive" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Overlay>
  );
}
