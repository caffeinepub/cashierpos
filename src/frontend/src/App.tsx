import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  History,
  Loader2,
  LogIn,
  LogOut,
  Package,
  ShoppingCart,
  Zap,
} from "lucide-react";
import { useState } from "react";
import POSView from "./components/POSView";
import ProductsAdmin from "./components/ProductsAdmin";
import SalesHistory from "./components/SalesHistory";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { useIsCallerAdmin } from "./hooks/useQueries";

const queryClient = new QueryClient();

function AppContent() {
  const { data: isAdmin } = useIsCallerAdmin();
  const [activeTab, setActiveTab] = useState("pos");
  const { identity, login, clear, isLoggingIn } = useInternetIdentity();

  const principal = identity?.getPrincipal().toString();
  const shortPrincipal = principal ? `${principal.slice(0, 5)}...` : null;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center justify-between px-6 h-14">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight text-foreground">
              CashierPOS
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs text-muted-foreground font-body hidden sm:block">
              {new Date().toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </div>

            {identity ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-mono hidden sm:block">
                  {shortPrincipal}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clear}
                  data-ocid="header.secondary_button"
                  className="gap-1.5 text-xs h-8"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Logout
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={login}
                disabled={isLoggingIn}
                data-ocid="header.login_button"
                className="gap-1.5 text-xs h-8"
              >
                {isLoggingIn ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <LogIn className="w-3.5 h-3.5" />
                )}
                {isLoggingIn ? "Connecting..." : "Login"}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col"
        >
          {/* Tab bar */}
          <div className="border-b border-border bg-card/50 px-6">
            <TabsList className="bg-transparent h-11 gap-1 p-0">
              <TabsTrigger
                value="pos"
                data-ocid="nav.pos.tab"
                className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-4 gap-2 font-body text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <ShoppingCart className="w-4 h-4" />
                POS
              </TabsTrigger>
              <TabsTrigger
                value="history"
                data-ocid="nav.history.tab"
                className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-4 gap-2 font-body text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <History className="w-4 h-4" />
                Sales History
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger
                  value="products"
                  data-ocid="nav.products.tab"
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-4 gap-2 font-body text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Package className="w-4 h-4" />
                  Products
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <TabsContent
            value="pos"
            className="flex-1 m-0 data-[state=inactive]:hidden"
          >
            <POSView />
          </TabsContent>
          <TabsContent
            value="history"
            className="flex-1 m-0 data-[state=inactive]:hidden"
          >
            <SalesHistory />
          </TabsContent>
          {isAdmin && (
            <TabsContent
              value="products"
              className="flex-1 m-0 data-[state=inactive]:hidden"
            >
              <ProductsAdmin />
            </TabsContent>
          )}
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-3 px-6 text-center">
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()}. Built with ❤️ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            caffeine.ai
          </a>
        </p>
      </footer>

      <Toaster richColors position="top-right" />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
