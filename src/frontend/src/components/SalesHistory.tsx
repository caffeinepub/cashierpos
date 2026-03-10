import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronRight, History } from "lucide-react";
import { motion } from "motion/react";
import { Fragment, useState } from "react";
import type { Order } from "../backend.d";
import { useListCompletedOrders } from "../hooks/useQueries";

function formatCents(cents: bigint | number): string {
  const num = typeof cents === "bigint" ? Number(cents) : cents;
  return `$${(num / 100).toFixed(2)}`;
}

function formatTimestamp(ts: bigint): string {
  const ms = Number(ts / 1_000_000n);
  return new Date(ms).toLocaleString();
}

const PAGE_SIZE = 20;
const SKELETON_KEYS = Array.from({ length: 6 }, (_, i) => `skel-${i}`);

export default function SalesHistory() {
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<bigint | null>(null);
  const { data: orders, isLoading } = useListCompletedOrders(page, PAGE_SIZE);

  const toggleExpand = (id: bigint) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <History className="w-5 h-5 text-primary" />
        <h1 className="font-display font-bold text-xl">Sales History</h1>
      </div>

      {isLoading ? (
        <div data-ocid="history.loading_state" className="space-y-2">
          {SKELETON_KEYS.map((k) => (
            <Skeleton key={k} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : !orders || orders.length === 0 ? (
        <div
          data-ocid="history.empty_state"
          className="flex flex-col items-center justify-center h-64 text-muted-foreground"
        >
          <History className="w-12 h-12 mb-3 opacity-30" />
          <p className="font-display font-semibold">No completed orders</p>
          <p className="text-sm opacity-60 mt-1">
            Complete a sale on the POS tab to see it here
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-border overflow-hidden">
            <Table data-ocid="history.table">
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="w-8" />
                  <TableHead className="font-display font-semibold text-foreground">
                    Order ID
                  </TableHead>
                  <TableHead className="font-display font-semibold text-foreground">
                    Date &amp; Time
                  </TableHead>
                  <TableHead className="font-display font-semibold text-foreground text-center">
                    Items
                  </TableHead>
                  <TableHead className="font-display font-semibold text-foreground text-right">
                    Total
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order: Order, idx: number) => (
                  <Fragment key={order.id.toString()}>
                    <TableRow
                      data-ocid={`history.row.${idx + 1}`}
                      className="cursor-pointer hover:bg-accent/30 transition-colors"
                      onClick={() => toggleExpand(order.id)}
                    >
                      <TableCell className="w-8">
                        <motion.div
                          animate={{ rotate: expandedId === order.id ? 90 : 0 }}
                          transition={{ duration: 0.15 }}
                        >
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </motion.div>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        #{order.id.toString()}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatTimestamp(order.timestamp)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="text-xs">
                          {order.items.length}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-display font-bold text-primary">
                        {formatCents(order.total)}
                      </TableCell>
                    </TableRow>
                    {expandedId === order.id && (
                      <TableRow className="bg-muted/10">
                        <TableCell colSpan={5} className="p-0">
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.2 }}
                            className="px-8 py-4"
                          >
                            <div className="space-y-2">
                              <h4 className="font-display font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-3">
                                Order Details
                              </h4>
                              {order.items.map((item) => (
                                <div
                                  key={item.productId.toString()}
                                  className="flex justify-between text-sm"
                                >
                                  <span className="text-foreground">
                                    {item.quantity}x — Product #
                                    {item.productId.toString()}
                                  </span>
                                  <span className="text-muted-foreground">
                                    {formatCents(
                                      Number(item.unitPrice) *
                                        Number(item.quantity),
                                    )}
                                  </span>
                                </div>
                              ))}
                              <div className="border-t border-border pt-2 mt-2 space-y-1 text-xs text-muted-foreground">
                                <div className="flex justify-between">
                                  <span>Subtotal</span>
                                  <span>{formatCents(order.subtotal)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Tax</span>
                                  <span>{formatCents(order.tax)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-sm text-foreground pt-1">
                                  <span>Total</span>
                                  <span className="text-primary">
                                    {formatCents(order.total)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-muted-foreground">
              Page {page + 1}
            </span>
            <div className="flex gap-2">
              <Button
                data-ocid="history.pagination_prev"
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="border-border"
              >
                Previous
              </Button>
              <Button
                data-ocid="history.pagination_next"
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={!orders || orders.length < PAGE_SIZE}
                className="border-border"
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
