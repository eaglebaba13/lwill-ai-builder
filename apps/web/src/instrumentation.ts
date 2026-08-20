export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }
  try {
    const { registerNativeAuthenticationProvider } = await import(
      "./lib/auth/native-auth-runtime"
    );
    registerNativeAuthenticationProvider();
    console.log("[auth] Native authentication provider registered");
  } catch (error) {
    console.error("[auth] Failed to register native authentication provider:", error);
    throw error;
  }
}
