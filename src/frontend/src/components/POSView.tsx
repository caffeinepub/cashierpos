import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle,
  Loader2,
  Minus,
  Package,
  Plus,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { Product } from "../backend.d";
import {
  useAddItemToCart,
  useCheckoutCart,
  useListProducts,
  useRemoveItemFromCart,
  useUpdateCartItemQuantity,
} from "../hooks/useQueries";

interface LocalCartItem {
  productId: bigint;
  name: string;
  quantity: number;
  unitPrice: bigint;
}

const TAX_RATE = 0.08;

function formatCents(cents: bigint | number): string {
  const num = typeof cents === "bigint" ? Number(cents) : cents;
  return `$${(num / 100).toFixed(2)}`;
}

const SKELETON_KEYS = Array.from({ length: 10 }, (_, i) => `skel-${i}`);

export default function POSView() {
  const { data: products, isLoading: productsLoading } = useListProducts();
  const [cart, setCart] = useState<LocalCartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState<{
    id: bigint;
    total: number;
  } | null>(null);

  const checkoutMutation = useCheckoutCart();
  const addItemMutation = useAddItemToCart();
  const removeItemMutation = useRemoveItemFromCart();
  const updateQtyMutation = useUpdateCartItemQuantity();

  const categories = [
    "All",
    ...Array.from(
      new Set((products || []).map((p) => p.category).filter(Boolean)),
    ),
  ].filter((c, i, arr) => arr.indexOf(c) === i);

  const filteredProducts = (products || []).filter(
    (p) => activeCategory === "All" || p.category === activeCategory,
  );

  const handleAddToCart = useCallback(
    async (product: Product) => {
      const existing = cart.find((i) => i.productId === product.id);
      if (existing) {
        const newQty = existing.quantity + 1;
        try {
          await updateQtyMutation.mutateAsync({
            productId: product.id,
            newQuantity: BigInt(newQty),
          });
          setCart((prev) =>
            prev.map((i) =>
              i.productId === product.id ? { ...i, quantity: newQty } : i,
            ),
          );
        } catch {
          toast.error("Failed to update cart");
        }
      } else {
        try {
          await addItemMutation.mutateAsync({
            productId: product.id,
            quantity: 1n,
          });
          setCart((prev) => [
            ...prev,
            {
              productId: product.id,
              name: product.name,
              quantity: 1,
              unitPrice: product.priceCents,
            },
          ]);
        } catch {
          toast.error("Failed to add item");
        }
      }
    },
    [cart, addItemMutation, updateQtyMutation],
  );

  const handleQtyChange = useCallback(
    async (productId: bigint, delta: number) => {
      const item = cart.find((i) => i.productId === productId);
      if (!item) return;
      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        try {
          await removeItemMutation.mutateAsync({ productId });
          setCart((prev) => prev.filter((i) => i.productId !== productId));
        } catch {
          toast.error("Failed to remove item");
        }
      } else {
        try {
          await updateQtyMutation.mutateAsync({
            productId,
            newQuantity: BigInt(newQty),
          });
          setCart((prev) =>
            prev.map((i) =>
              i.productId === productId ? { ...i, quantity: newQty } : i,
            ),
          );
        } catch {
          toast.error("Failed to update quantity");
        }
      }
    },
    [cart, removeItemMutation, updateQtyMutation],
  );

  const handleRemoveItem = useCallback(
    async (productId: bigint) => {
      try {
        await removeItemMutation.mutateAsync({ productId });
        setCart((prev) => prev.filter((i) => i.productId !== productId));
      } catch {
        toast.error("Failed to remove item");
      }
    },
    [removeItemMutation],
  );

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    try {
      const orderId = await checkoutMutation.mutateAsync();
      const totalCents = subtotal + tax;
      setReceiptOrder({ id: orderId, total: totalCents });
      setCart([]);
      setReceiptOpen(true);
    } catch {
      toast.error("Checkout failed. Please try again.");
    }
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + Number(item.unitPrice) * item.quantity,
    0,
  );
  const tax = Math.round(subtotal * TAX_RATE);
  const total = subtotal + tax;

  return (
    <div className="flex h-[calc(100vh-7.5rem)] overflow-hidden">
      {/* Left: Product grid */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-border">
        {/* Category filter */}
        <div className="px-4 py-3 border-b border-border flex gap-2 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              data-ocid="pos.category.tab"
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Products */}
        <ScrollArea className="flex-1">
          <div className="p-4">
            {productsLoading ? (
              <div
                data-ocid="products.loading_state"
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3"
              >
                {SKELETON_KEYS.map((k) => (
                  <Skeleton key={k} className="h-28 rounded-lg" />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div
                data-ocid="products.empty_state"
                className="flex flex-col items-center justify-center h-48 text-muted-foreground"
              >
                <Package className="w-10 h-10 mb-2 opacity-40" />
                <p className="text-sm">No products in this category</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {filteredProducts.map((product, idx) => {
                  const inCart = cart.find((i) => i.productId === product.id);
                  return (
                    <motion.div
                      key={product.id.toString()}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.03, duration: 0.2 }}
                    >
                      <button
                        type="button"
                        data-ocid={`product.item.${idx + 1}`}
                        onClick={() => handleAddToCart(product)}
                        disabled={product.stockQty === 0n}
                        className={`w-full text-left rounded-lg border p-3 flex flex-col gap-2 transition-all hover:border-primary/50 hover:bg-accent/50 active:scale-95 ${
                          inCart
                            ? "border-primary/40 bg-primary/5"
                            : "border-border bg-card"
                        } ${
                          product.stockQty === 0n
                            ? "opacity-40 cursor-not-allowed"
                            : "cursor-pointer"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <span className="text-xs text-muted-foreground font-body">
                            {product.category}
                          </span>
                          {inCart && (
                            <Badge className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground">
                              {inCart.quantity}
                            </Badge>
                          )}
                        </div>
                        <div>
                          <p className="font-display font-semibold text-sm text-foreground leading-tight line-clamp-2">
                            {product.name}
                          </p>
                        </div>
                        <div className="flex items-center justify-between mt-auto">
                          <span className="font-display font-bold text-primary text-sm">
                            {formatCents(product.priceCents)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {product.stockQty === 0n
                              ? "Out"
                              : `${product.stockQty} left`}
                          </span>
                        </div>
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right: Cart */}
      <div className="w-80 xl:w-96 flex flex-col bg-card/50">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-primary" />
          <h2 className="font-display font-semibold text-sm">Current Order</h2>
          {cart.length > 0 && (
            <Badge className="ml-auto bg-primary/20 text-primary border-0 text-xs">
              {cart.length}
            </Badge>
          )}
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-1">
            <AnimatePresence>
              {cart.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  data-ocid="cart.empty_state"
                  className="flex flex-col items-center justify-center h-48 text-muted-foreground"
                >
                  <ShoppingCart className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-sm">Cart is empty</p>
                  <p className="text-xs opacity-60 mt-1">Tap products to add</p>
                </motion.div>
              ) : (
                cart.map((item, idx) => (
                  <motion.div
                    key={item.productId.toString()}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20, height: 0 }}
                    data-ocid={`cart.item.${idx + 1}`}
                    className="flex items-center gap-2 bg-accent/30 rounded-lg px-3 py-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatCents(item.unitPrice)} each
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        onClick={() => handleQtyChange(item.productId, -1)}
                        className="w-6 h-6 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-foreground">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        onClick={() => handleQtyChange(item.productId, 1)}
                        className="w-6 h-6 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-xs font-bold text-primary w-14 text-right">
                      {formatCents(Number(item.unitPrice) * item.quantity)}
                    </span>
                    <button
                      type="button"
                      data-ocid={`cart.delete_button.${idx + 1}`}
                      aria-label="Remove item"
                      onClick={() => handleRemoveItem(item.productId)}
                      className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>

        {/* Totals + Checkout */}
        <div className="border-t border-border p-4 space-y-3">
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatCents(subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Tax (8%)</span>
              <span>{formatCents(tax)}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between font-display font-bold text-base">
              <span>Total</span>
              <span className="text-primary">{formatCents(total)}</span>
            </div>
          </div>
          <Button
            data-ocid="checkout.primary_button"
            onClick={handleCheckout}
            disabled={cart.length === 0 || checkoutMutation.isPending}
            className="w-full h-12 font-display font-bold text-base glow-amber bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {checkoutMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...
              </>
            ) : (
              <>Checkout — {formatCents(total)}</>
            )}
          </Button>
        </div>
      </div>

      {/* Receipt Modal */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent data-ocid="receipt.dialog" className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="flex flex-col items-center gap-3"
              >
                <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-primary" />
                </div>
                <span className="text-xl">Payment Complete!</span>
              </motion.div>
            </DialogTitle>
          </DialogHeader>
          {receiptOrder && (
            <div className="text-center space-y-2 py-2">
              <p className="text-muted-foreground text-sm">
                Order #{receiptOrder.id.toString()}
              </p>
              <p className="font-display font-bold text-3xl text-primary">
                {formatCents(receiptOrder.total)}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date().toLocaleString()}
              </p>
            </div>
          )}
          <Button
            data-ocid="receipt.close_button"
            onClick={() => setReceiptOpen(false)}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            New Order
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
