export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }
  const { registerNativeAuthenticationProvider } = await import(
    "./lib/auth/native-auth-runtime"
  );
  registerNativeAuthenticationProvider();
}
