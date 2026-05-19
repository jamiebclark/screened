import { signOut } from "@/lib/auth";
import { safeCallbackPath } from "@/lib/safe-callback-path";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const callbackUrl = safeCallbackPath(searchParams.get("callbackUrl"));
  await signOut({
    redirectTo: `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`,
  });
}
