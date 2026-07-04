const supabase: any = {
  auth: {
    getSession: async () => ({
      data: { session: null },
    }),
    onAuthStateChange: () => ({
      data: {
        subscription: {
          unsubscribe: () => {},
        },
      },
    }),
    signInWithPassword: async () => ({ error: null }),
    signUp: async () => ({ error: null }),
    signOut: async () => ({ error: null }),
  },
};

export default supabase;
