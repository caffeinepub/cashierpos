import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Order, Product } from "../backend.d";
import { useActor } from "./useActor";

export function useListProducts() {
  const { actor, isFetching } = useActor();
  return useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listProducts();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useListCompletedOrders(page: number, pageSize = 20) {
  const { actor, isFetching } = useActor();
  return useQuery<Order[]>({
    queryKey: ["orders", page, pageSize],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listCompletedOrders(BigInt(page), BigInt(pageSize));
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetOrder(orderId: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<Order | null>({
    queryKey: ["order", orderId?.toString()],
    queryFn: async () => {
      if (!actor || orderId === null) return null;
      return actor.getOrder(orderId);
    },
    enabled: !!actor && !isFetching && orderId !== null,
  });
}

export function useIsCallerAdmin() {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ["isAdmin"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCheckoutCart() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation<bigint, Error>({
    mutationFn: async () => {
      if (!actor) throw new Error("No actor");
      return actor.checkoutCart();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useAddItemToCart() {
  const { actor } = useActor();
  return useMutation<void, Error, { productId: bigint; quantity: bigint }>({
    mutationFn: async ({ productId, quantity }) => {
      if (!actor) throw new Error("No actor");
      return actor.addItemToCart(productId, quantity);
    },
  });
}

export function useRemoveItemFromCart() {
  const { actor } = useActor();
  return useMutation<void, Error, { productId: bigint }>({
    mutationFn: async ({ productId }) => {
      if (!actor) throw new Error("No actor");
      return actor.removeItemFromCart(productId);
    },
  });
}

export function useUpdateCartItemQuantity() {
  const { actor } = useActor();
  return useMutation<void, Error, { productId: bigint; newQuantity: bigint }>({
    mutationFn: async ({ productId, newQuantity }) => {
      if (!actor) throw new Error("No actor");
      return actor.updateCartItemQuantity(productId, newQuantity);
    },
  });
}

export function useCreateProduct() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation<
    bigint,
    Error,
    { name: string; priceCents: bigint; category: string; stockQty: bigint }
  >({
    mutationFn: async ({ name, priceCents, category, stockQty }) => {
      if (!actor) throw new Error("No actor");
      return actor.createProduct(name, priceCents, category, stockQty);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useUpdateProduct() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation<
    void,
    Error,
    {
      id: bigint;
      name: string;
      priceCents: bigint;
      category: string;
      stockQty: bigint;
    }
  >({
    mutationFn: async ({ id, name, priceCents, category, stockQty }) => {
      if (!actor) throw new Error("No actor");
      return actor.updateProduct(id, name, priceCents, category, stockQty);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useDeleteProduct() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation<void, Error, { id: bigint }>({
    mutationFn: async ({ id }) => {
      if (!actor) throw new Error("No actor");
      return actor.deleteProduct(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
