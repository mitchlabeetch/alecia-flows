"use client";

import { useState } from "react";
import { toast } from "sonner";
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

export default function AdminPage() {
  const [filter, setFilter] = useState("");

  return (
    <div className="container mx-auto max-w-5xl p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">
          Administration Alecia Flows
        </h1>
        <p className="mt-2 text-muted-foreground">
          Gérez les paramètres, connexions et intégrations de votre plateforme.
        </p>
      </div>

      <Tabs defaultValue="connections">
        <TabsList className="mb-6">
          <TabsTrigger value="connections">Connexions</TabsTrigger>
          <TabsTrigger value="design">Design</TabsTrigger>
          <TabsTrigger value="content">Contenu</TabsTrigger>
        </TabsList>

        <TabsContent value="connections">
          <Card>
            <CardHeader>
              <CardTitle>Gestion des connexions</CardTitle>
              <CardDescription>
                Configurez et testez les connexions aux services externes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Input
                  placeholder="Filtrer les connexions..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="max-w-sm"
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
              <CardTitle>Paramètres de design</CardTitle>
              <CardDescription>
                Personnalisez l'apparence visuelle de la plateforme.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Thème actuel</Label>
                <p className="text-sm text-muted-foreground">
                  Thème navy glassmorphique Alecia — couleur d'accent or/ambre
                  (#c9a84c), fond navy profond (#0a1628).
                </p>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-medium">Palette de couleurs</h3>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <ColorSwatch label="Primaire (or)" value="oklch(0.78 0.12 80)" />
                  <ColorSwatch
                    label="Fond"
                    value="oklch(0.12 0.04 250)"
                  />
                  <ColorSwatch
                    label="Carte"
                    value="oklch(0.18 0.05 250 / 0.7)"
                  />
                  <ColorSwatch
                    label="Texte"
                    value="oklch(0.95 0.02 250)"
                  />
                  <ColorSwatch
                    label="Bordure"
                    value="oklch(0.95 0.02 250 / 0.15)"
                  />
                  <ColorSwatch
                    label="Destructif"
                    value="oklch(0.577 0.245 27.325)"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h3 className="font-medium">Effets glassmorphiques</h3>
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
              <CardTitle>Paramètres de contenu</CardTitle>
              <CardDescription>
                Configurez les libellés et textes de l'interface.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="app-name">Nom de l'application</Label>
                  <Input
                    id="app-name"
                    defaultValue="Alecia Flows"
                    readOnly
                    className="max-w-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="app-desc">Description</Label>
                  <Input
                    id="app-desc"
                    defaultValue="Automatisation des processus M&A"
                    readOnly
                    className="max-w-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Entreprise</Label>
                  <Input
                    id="company"
                    defaultValue="Alecia"
                    readOnly
                    className="max-w-sm"
                  />
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm text-muted-foreground">
                  Les paramètres de contenu sont définis dans le code source.
                  Contactez votre équipe technique pour les modifier.
                </p>
                <Button
                  variant="outline"
                  className="mt-3"
                  onClick={() =>
                    toast.info(
                      "Modification du contenu via le code source requis."
                    )
                  }
                >
                  En savoir plus
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ColorSwatch({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-3">
      <div
        className="h-8 w-8 shrink-0 rounded"
        style={{ background: value }}
      />
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="font-mono text-xs text-muted-foreground">{value}</p>
      </div>
    </div>
  );
}
