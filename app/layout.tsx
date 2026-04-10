import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ReactFlowProvider } from "@xyflow/react";
import { Provider } from "jotai";
import { type ReactNode, Suspense } from "react";
import { AuthProvider } from "@/components/auth/provider";
import { GitHubStarsLoader } from "@/components/github-stars-loader";
import { GitHubStarsProvider } from "@/components/github-stars-provider";
import { GlobalModals } from "@/components/global-modals";
import { OverlayProvider } from "@/components/overlays/overlay-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { PersistentCanvas } from "@/components/workflow/persistent-canvas";
import { mono, sans } from "@/lib/fonts";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Alecia Flows - Automatisation des processus",
  description:
    "Automatisez vos processus M&A avec une plateforme visuelle basée sur des nœuds. Gérez vos workflows d'automatisation de manière efficace.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

type RootLayoutProps = {
  children: ReactNode;
};

// Inner content wrapped by GitHubStarsProvider (used for both loading and loaded states)
function LayoutContent({ children }: { children: ReactNode }) {
  return (
    <ReactFlowProvider>
      <PersistentCanvas />
      <div className="pointer-events-none relative z-10">{children}</div>
    </ReactFlowProvider>
  );
}

const RootLayout = ({ children }: RootLayoutProps) => (
  <html lang="fr" suppressHydrationWarning>
    <body className={cn(sans.variable, mono.variable, "antialiased")}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        disableTransitionOnChange
        enableSystem
      >
        <Provider>
          <AuthProvider>
            <OverlayProvider>
              <Suspense
                fallback={
                  <GitHubStarsProvider stars={null}>
                    <LayoutContent>{children}</LayoutContent>
                  </GitHubStarsProvider>
                }
              >
                <GitHubStarsLoader>
                  <LayoutContent>{children}</LayoutContent>
                </GitHubStarsLoader>
              </Suspense>
              <Toaster />
              <GlobalModals />
            </OverlayProvider>
          </AuthProvider>
        </Provider>
      </ThemeProvider>
      <Analytics />
      <SpeedInsights />
    </body>
  </html>
);

export default RootLayout;
