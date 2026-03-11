import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";

module {
  public type UserRole = {
    #admin;
    #user;
    #guest;
  };

  public type AccessControlState = {
    var adminAssigned : Bool;
    userRoles : Map.Map<Principal, UserRole>;
  };

  public func initState() : AccessControlState {
    {
      var adminAssigned = false;
      userRoles = Map.empty<Principal, UserRole>();
    };
  };

  // If the correct admin token is provided, the caller always becomes admin
  // (removes admin from any previous holder). Without the token, first-time
  // callers are registered as regular users.
  public func initialize(state : AccessControlState, caller : Principal, adminToken : Text, userProvidedToken : Text) {
    if (caller.isAnonymous()) { return };
    let tokenMatches = userProvidedToken != "" and userProvidedToken == adminToken;
    if (tokenMatches) {
      // Remove admin from previous holder if any
      if (state.adminAssigned) {
        state.userRoles.keys().forEach(func(p) {
          switch (state.userRoles.get(p)) {
            case (?#admin) { state.userRoles.add(p, #user) };
            case _ {};
          };
        });
      };
      state.userRoles.add(caller, #admin);
      state.adminAssigned := true;
    } else {
      // Register as user only if not already registered
      switch (state.userRoles.get(caller)) {
        case (?_) {}; // already has a role
        case (null) { state.userRoles.add(caller, #user) };
      };
    };
  };

  public func getUserRole(state : AccessControlState, caller : Principal) : UserRole {
    if (caller.isAnonymous()) { return #guest };
    switch (state.userRoles.get(caller)) {
      case (?role) { role };
      case (null) {
        Runtime.trap("User is not registered");
      };
    };
  };

  public func assignRole(state : AccessControlState, caller : Principal, user : Principal, role : UserRole) {
    if (not (isAdmin(state, caller))) {
      Runtime.trap("Unauthorized: Only admins can assign user roles");
    };
    state.userRoles.add(user, role);
  };

  public func hasPermission(state : AccessControlState, caller : Principal, requiredRole : UserRole) : Bool {
    let userRole = getUserRole(state, caller);
    if (userRole == #admin or requiredRole == #guest) { true } else {
      userRole == requiredRole;
    };
  };

  public func isAdmin(state : AccessControlState, caller : Principal) : Bool {
    getUserRole(state, caller) == #admin;
  };
};
