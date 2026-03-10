import Text "mo:core/Text";
import Map "mo:core/Map";
import List "mo:core/List";
import Nat "mo:core/Nat";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import Order "mo:core/Order";
import Iter "mo:core/Iter";
import Principal "mo:core/Principal";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";

actor {
  // Product Types and Logic
  public type Product = {
    id : Nat;
    name : Text;
    priceCents : Nat;
    category : Text;
    stockQty : Nat;
  };

  module Product {
    public func compareById(product1 : Product, product2 : Product) : Order.Order {
      Nat.compare(product1.id, product2.id);
    };
  };

  // Order Types and Logic
  public type CartItem = {
    productId : Nat;
    quantity : Nat;
    unitPrice : Nat;
  };

  public type OrderStatus = {
    #open;
    #completed;
    #voided;
  };

  public type Order = {
    id : Nat;
    timestamp : Time.Time;
    items : [CartItem];
    subtotal : Nat;
    tax : Nat;
    total : Nat;
    status : OrderStatus;
  };

  module OrderType {
    public func compareById(order1 : Order, order2 : Order) : Order.Order {
      Nat.compare(order1.id, order2.id);
    };
  };

  var nextProductId = 1;
  var nextOrderId = 1;

  // Persistent storage
  let products = Map.empty<Nat, Product>();
  let orders = Map.empty<Nat, Order>();

  // Authorization system
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // User Profile Management (required by frontend)
  public type UserProfile = {
    name : Text;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Product Management - Admin Only
  public shared ({ caller }) func createProduct(name : Text, priceCents : Nat, category : Text, stockQty : Nat) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can create products");
    };

    let product : Product = {
      id = nextProductId;
      name;
      priceCents;
      category;
      stockQty;
    };

    products.add(nextProductId, product);
    nextProductId += 1;
    product.id;
  };

  public shared ({ caller }) func updateProduct(id : Nat, name : Text, priceCents : Nat, category : Text, stockQty : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update products");
    };

    switch (products.get(id)) {
      case (null) { Runtime.trap("Product not found") };
      case (?_existing) {
        let updated : Product = {
          id;
          name;
          priceCents;
          category;
          stockQty;
        };
        products.add(id, updated);
      };
    };
  };

  public shared ({ caller }) func deleteProduct(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete products");
    };

    if (products.get(id) == null) { Runtime.trap("Product not found") };
    products.remove(id);
  };

  public query ({ caller }) func getProduct(id : Nat) : async Product {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only cashiers or admins can view products");
    };

    switch (products.get(id)) {
      case (null) { Runtime.trap("Product not found") };
      case (?product) { product };
    };
  };

  public query ({ caller }) func listProducts() : async [Product] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only cashiers or admins can list products");
    };

    products.values().toArray();
  };

  // Cart Management (in memory) - Cashiers and Admins
  let carts = Map.empty<Principal, [CartItem]>();

  public shared ({ caller }) func addItemToCart(productId : Nat, quantity : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only cashiers or admins can add to cart");
    };

    if (quantity <= 0) { Runtime.trap("Quantity must be greater than 0") };

    let product = switch (products.get(productId)) {
      case (null) { Runtime.trap("Product not found") };
      case (?product) { product };
    };

    if (product.stockQty < quantity) {
      Runtime.trap("Insufficient stock for product: " # product.name);
    };

    let cart = switch (carts.get(caller)) {
      case (null) { [] };
      case (?existing) { existing };
    };

    let newItem : CartItem = {
      productId;
      quantity;
      unitPrice = product.priceCents;
    };

    let newItems = List.fromArray<CartItem>([newItem]);
    let existingItems = List.fromArray<CartItem>(cart);
    existingItems.addAll(newItems.values());
    let updatedCart = existingItems.toArray();
    carts.add(caller, updatedCart);
  };

  public shared ({ caller }) func updateCartItemQuantity(productId : Nat, newQuantity : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only cashiers or admins can update cart items");
    };

    if (newQuantity <= 0) { Runtime.trap("Quantity must be greater than 0") };

    let product = switch (products.get(productId)) {
      case (null) { Runtime.trap("Product not found") };
      case (?product) { product };
    };

    if (product.stockQty < newQuantity) {
      Runtime.trap("Insufficient stock for product: " # product.name);
    };

    let cart = switch (carts.get(caller)) {
      case (null) { [] };
      case (?existing) { existing };
    };

    let updatedCartList = List.empty<CartItem>();
    List.fromArray<CartItem>(cart).values().forEach(
      func(item) {
        if (item.productId == productId) {
          let updatedItem : CartItem = {
            productId = item.productId;
            quantity = newQuantity;
            unitPrice = item.unitPrice;
          };
          updatedCartList.add(updatedItem);
        } else { updatedCartList.add(item) };
      }
    );

    let updatedCart = updatedCartList.toArray();
    carts.add(caller, updatedCart);
  };

  public shared ({ caller }) func removeItemFromCart(productId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only cashiers or admins can remove cart items");
    };

    let cart = switch (carts.get(caller)) {
      case (null) { [] };
      case (?existing) { existing };
    };

    let filteredCartList = List.empty<CartItem>();
    List.fromArray<CartItem>(cart).values().forEach(
      func(item) {
        if (item.productId != productId) { filteredCartList.add(item) };
      }
    );

    let updatedCart = filteredCartList.toArray();
    carts.add(caller, updatedCart);
  };

  public shared ({ caller }) func checkoutCart() : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only cashiers or admins can checkout carts");
    };

    let cart = switch (carts.get(caller)) {
      case (null) { [] };
      case (?existing) { existing };
    };

    if (cart.size() == 0) { Runtime.trap("Cart is empty") };

    // Calculate totals
    var subtotal = 0;
    List.fromArray<CartItem>(cart).values().forEach(
      func(item) { subtotal += item.unitPrice * item.quantity }
    );

    let tax = (subtotal * 5) / 100;
    let total = subtotal + tax;

    // Update stock quantities
    List.fromArray<CartItem>(cart).values().forEach(
      func(item) {
        switch (products.get(item.productId)) {
          case (null) {
            Runtime.trap(
              "Product not found for cart item: " # debug_show item.productId
            );
          };
          case (?product) {
            if (product.stockQty >= item.quantity) {
              let updatedProduct : Product = {
                id = product.id;
                name = product.name;
                priceCents = product.priceCents;
                category = product.category;
                stockQty = product.stockQty - item.quantity;
              };
              products.add(product.id, updatedProduct);
            };
          };
        };
      }
    );

    // Create order
    let order : Order = {
      id = nextOrderId;
      timestamp = Time.now();
      items = cart;
      subtotal;
      tax;
      total;
      status = #completed;
    };

    orders.add(nextOrderId, order);
    nextOrderId += 1;

    // Clear cart
    carts.remove(caller);

    order.id;
  };

  // Sales History - Cashiers and Admins
  public query ({ caller }) func listCompletedOrders(page : Nat, pageSize : Nat) : async [Order] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only cashiers or admins can view sales history");
    };

    let completed = List.empty<Order>();
    orders.values().forEach(
      func(order) {
        if (order.status == #completed) { completed.add(order) };
      }
    );

    let completedArray = completed.toArray();

    if (completedArray.size() == 0) { return [] };

    let start = page * pageSize;
    if (start >= completedArray.size()) { return [] };

    let end = if ((start + pageSize) > completedArray.size()) {
      completedArray.size();
    } else { start + pageSize };

    completedArray.sliceToArray(start, end);
  };

  public query ({ caller }) func getOrder(orderId : Nat) : async Order {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only cashiers or admins can view order details");
    };

    switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order not found") };
      case (?order) { order };
    };
  };
};
