import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type Time = bigint;
export interface CartItem {
    productId: bigint;
    quantity: bigint;
    unitPrice: bigint;
}
export interface Order {
    id: bigint;
    tax: bigint;
    status: OrderStatus;
    total: bigint;
    timestamp: Time;
    items: Array<CartItem>;
    subtotal: bigint;
}
export interface UserProfile {
    name: string;
}
export interface Product {
    id: bigint;
    stockQty: bigint;
    name: string;
    category: string;
    priceCents: bigint;
}
export enum OrderStatus {
    open = "open",
    completed = "completed",
    voided = "voided"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addItemToCart(productId: bigint, quantity: bigint): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    checkoutCart(): Promise<bigint>;
    createProduct(name: string, priceCents: bigint, category: string, stockQty: bigint): Promise<bigint>;
    deleteProduct(id: bigint): Promise<void>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getOrder(orderId: bigint): Promise<Order>;
    getProduct(id: bigint): Promise<Product>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    listCompletedOrders(page: bigint, pageSize: bigint): Promise<Array<Order>>;
    listProducts(): Promise<Array<Product>>;
    removeItemFromCart(productId: bigint): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateCartItemQuantity(productId: bigint, newQuantity: bigint): Promise<void>;
    updateProduct(id: bigint, name: string, priceCents: bigint, category: string, stockQty: bigint): Promise<void>;
}
