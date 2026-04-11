"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { AddConnectionOverlay } from "@/components/overlays/add-connection-overlay";
import { useOverlay } from "@/components/overlays/overlay-provider";
import { IntegrationsManager } from "@/components/settings/integrations-manager";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function AdminPageClient() {
  const t = useTranslations("AdminPage");
  const [filter, setFilter] = useState("");
  const { push } = useOverlay();

  const handleAddConnection = () => {
    push(AddConnectionOverlay, {
      onSuccess: () => {
        toast.success(t("connectionAdded"));
      },
    });
  };

  return (
    <div className="container mx-auto max-w-5xl p-6">
      <div className="mb-8">
        <h1 className="font-bold text-3xl text-foreground">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("description")}</p>
      </div>

      <Tabs defaultValue="connections">
        <TabsList className="mb-6">
          <TabsTrigger value="connections">{t("connections")}</TabsTrigger>
          <TabsTrigger value="design">{t("design")}</TabsTrigger>
          <TabsTrigger value="content">{t("content")}</TabsTrigger>
        </TabsList>

        <TabsContent value="connections">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t("connectionManagement")}</CardTitle>
                  <CardDescription>
                    {t("connectionManagementDesc")}
                  </CardDescription>
                </div>
                <Button onClick={handleAddConnection}>
                  <Plus className="mr-2 size-4" />
                  {t("newConnection")}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Input
                  className="max-w-sm"
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder={t("filterConnections")}
                  value={filter}
                />
              </div>
              <Separator className="mb-4" />
              <IntegrationsManager filter={filter} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="design">
          <Card>
            <CardHeader>
              <CardTitle>{t("designSettings")}</CardTitle>
              <CardDescription>{t("designSettingsDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>{t("currentTheme")}</Label>
                <p className="text-muted-foreground text-sm">
                  {t("themeDescription")}
                </p>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-medium">{t("colorPalette")}</h3>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <ColorSwatch
                    label="Primary (gold)"
                    value="oklch(0.78 0.12 80)"
                  />
                  <ColorSwatch
                    label="Background"
                    value="oklch(0.12 0.04 250)"
                  />
                  <ColorSwatch
                    label="Card"
                    value="oklch(0.18 0.05 250 / 0.7)"
                  />
                  <ColorSwatch label="Text" value="oklch(0.95 0.02 250)" />
                  <ColorSwatch
                    label="Border"
                    value="oklch(0.95 0.02 250 / 0.15)"
                  />
                  <ColorSwatch
                    label="Destructive"
                    value="oklch(0.577 0.245 27.325)"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h3 className="font-medium">{t("glassmorphism")}</h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="glass rounded-lg p-4 text-center text-sm">
                    .glass
                  </div>
                  <div className="glass-strong rounded-lg p-4 text-center text-sm">
                    .glass-strong
                  </div>
                  <div className="glass-subtle rounded-lg p-4 text-center text-sm">
                    .glass-subtle
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content">
          <Card>
            <CardHeader>
              <CardTitle>{t("contentSettings")}</CardTitle>
              <CardDescription>{t("contentSettingsDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="app-name">{t("appName")}</Label>
                  <Input
                    className="max-w-sm"
                    defaultValue="Alecia Flows"
                    id="app-name"
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="app-desc">{t("description2")}</Label>
                  <Input
                    className="max-w-sm"
                    defaultValue="M&A process automation"
                    id="app-desc"
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">{t("company")}</Label>
                  <Input
                    className="max-w-sm"
                    defaultValue="Alecia"
                    id="company"
                    readOnly
                  />
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-muted-foreground text-sm">
                  {t("contentNote")}
                </p>
                <Button className="mt-3" variant="outline">
                  {t("requestUpdate")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ColorSwatch({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-2">
      <div
        className="h-16 rounded-md border"
        style={{ backgroundColor: value }}
      />
      <div className="space-y-0.5">
        <p className="font-medium text-sm">{label}</p>
        <p className="text-muted-foreground text-xs">{value}</p>
      </div>
    </div>
  );
}
