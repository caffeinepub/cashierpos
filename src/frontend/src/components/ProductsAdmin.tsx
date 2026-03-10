import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Package, Pencil, Plus, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { Product } from "../backend.d";
import {
  useCreateProduct,
  useDeleteProduct,
  useListProducts,
  useUpdateProduct,
} from "../hooks/useQueries";

function formatCents(cents: bigint): string {
  return `$${(Number(cents) / 100).toFixed(2)}`;
}

interface ProductFormData {
  name: string;
  priceStr: string;
  category: string;
  stockQtyStr: string;
}

const defaultForm: ProductFormData = {
  name: "",
  priceStr: "",
  category: "",
  stockQtyStr: "",
};

const SKELETON_KEYS = Array.from({ length: 5 }, (_, i) => `skel-${i}`);

export default function ProductsAdmin() {
  const { data: products, isLoading } = useListProducts();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormData>(defaultForm);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const openCreate = () => {
    setEditingProduct(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      priceStr: (Number(product.priceCents) / 100).toFixed(2),
      category: product.category,
      stockQtyStr: product.stockQty.toString(),
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceCents = BigInt(
      Math.round(Number.parseFloat(form.priceStr) * 100),
    );
    const stockQty = BigInt(Number.parseInt(form.stockQtyStr, 10));

    try {
      if (editingProduct) {
        await updateMutation.mutateAsync({
          id: editingProduct.id,
          name: form.name,
          priceCents,
          category: form.category,
          stockQty,
        });
        toast.success("Product updated");
      } else {
        await createMutation.mutateAsync({
          name: form.name,
          priceCents,
          category: form.category,
          stockQty,
        });
        toast.success("Product created");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Failed to save product");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync({ id: deleteTarget.id });
      toast.success("Product deleted");
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete product");
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Package className="w-5 h-5 text-primary" />
          <h1 className="font-display font-bold text-xl">Products</h1>
          {products && (
            <Badge variant="secondary" className="text-xs">
              {products.length}
            </Badge>
          )}
        </div>
        <Button
          data-ocid="products.open_modal_button"
          onClick={openCreate}
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </Button>
      </div>

      {isLoading ? (
        <div data-ocid="products.loading_state" className="space-y-2">
          {SKELETON_KEYS.map((k) => (
            <Skeleton key={k} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : !products || products.length === 0 ? (
        <div
          data-ocid="products.empty_state"
          className="flex flex-col items-center justify-center h-64 text-muted-foreground"
        >
          <Package className="w-12 h-12 mb-3 opacity-30" />
          <p className="font-display font-semibold">No products yet</p>
          <p className="text-sm opacity-60 mt-1">
            Add your first product to get started
          </p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-lg border border-border overflow-hidden"
        >
          <Table data-ocid="products.table">
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="font-display font-semibold text-foreground">
                  Name
                </TableHead>
                <TableHead className="font-display font-semibold text-foreground">
                  Category
                </TableHead>
                <TableHead className="font-display font-semibold text-foreground text-right">
                  Price
                </TableHead>
                <TableHead className="font-display font-semibold text-foreground text-center">
                  Stock
                </TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product, idx) => (
                <TableRow
                  key={product.id.toString()}
                  data-ocid={`products.row.${idx + 1}`}
                  className="hover:bg-accent/20 transition-colors"
                >
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {product.category || "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-display font-bold text-primary">
                    {formatCents(product.priceCents)}
                  </TableCell>
                  <TableCell className="text-center">
                    <span
                      className={`text-sm font-medium ${
                        product.stockQty === 0n
                          ? "text-destructive"
                          : "text-foreground"
                      }`}
                    >
                      {product.stockQty.toString()}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        data-ocid={`products.edit_button.${idx + 1}`}
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(product)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        data-ocid={`products.delete_button.${idx + 1}`}
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(product)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </motion.div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-ocid="products.dialog" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingProduct ? "Edit Product" : "Add Product"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm">
                Product Name
              </Label>
              <Input
                id="name"
                data-ocid="products.input"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. Espresso Shot"
                required
                className="bg-input border-border"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="price" className="text-sm">
                  Price ($)
                </Label>
                <Input
                  id="price"
                  data-ocid="products.input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.priceStr}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, priceStr: e.target.value }))
                  }
                  placeholder="0.00"
                  required
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stock" className="text-sm">
                  Stock Qty
                </Label>
                <Input
                  id="stock"
                  data-ocid="products.input"
                  type="number"
                  min="0"
                  step="1"
                  value={form.stockQtyStr}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, stockQtyStr: e.target.value }))
                  }
                  placeholder="0"
                  required
                  className="bg-input border-border"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category" className="text-sm">
                Category
              </Label>
              <Input
                id="category"
                data-ocid="products.input"
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value }))
                }
                placeholder="e.g. Drinks"
                className="bg-input border-border"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button
                data-ocid="products.cancel_button"
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="border-border"
              >
                Cancel
              </Button>
              <Button
                data-ocid="products.submit_button"
                type="submit"
                disabled={isSaving}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                  </>
                ) : editingProduct ? (
                  "Save Changes"
                ) : (
                  "Create Product"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent data-ocid="products.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              Delete Product?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deleteTarget?.name}</strong>? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="products.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              data-ocid="products.confirm_button"
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
