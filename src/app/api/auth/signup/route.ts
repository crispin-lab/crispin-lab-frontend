import { proxyAndIssueSession } from "@/lib/auth/sessionIssuingProxy";

export async function POST(request: Request): Promise<Response> {
  return proxyAndIssueSession(request, {
    upstreamPath: "/v1/users",
    logTag: "auth/signup",
  });
}
