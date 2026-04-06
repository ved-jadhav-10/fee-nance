export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/dashboard/:path*", "/finance/:path*", "/groups/:path*", "/api/private/:path*"],
};
