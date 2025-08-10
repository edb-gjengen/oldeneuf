import { NextRequest, NextResponse } from "next/server";

type MerchantUserResponse = {
  firstName: string;
  lastName: string;
  documentPhoto: string;
  age: number;
};

type ProblemDetails = {
  type: string;
  title: string;
  detail: string;
  status: number;
};

async function fetchOidcToken(): Promise<string> {
  const configUrl = process.env.BANKID_OIDC_CONFIG;
  if (!configUrl) throw new Error("BANKID_OIDC_CONFIG not set");

  // fetch OIDC config
  const configRes = await fetch(configUrl);
  if (!configRes.ok) throw new Error("Failed to fetch OIDC config");
  const config = await configRes.json();
  const tokenEndpoint = config.token_endpoint;
  if (!tokenEndpoint) throw new Error("No token_endpoint in OIDC config");

  // prepare client credentials
  const clientId = process.env.BANKID_CLIENT_ID;
  const clientSecret = process.env.BANKID_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Client credentials not set");

  const params = new URLSearchParams();
  params.append("grant_type", "client_credentials");
  // there are other scopes, but we don't seem to have access to more than the age + picture
  params.append("scope", "vis-leg/identity_picture_age");
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);

  // request token
  const tokenRes = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  if (!tokenRes.ok) {
    const errorText = await tokenRes.text();
    console.error("Failed to fetch OIDC token. Response:", errorText);
    throw new Error("Failed to fetch OIDC token");
  }
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token)
    throw new Error("No access_token in token response");
  console.log("Got a token from", tokenEndpoint);
  return tokenData.access_token;
}

export async function POST(req: NextRequest) {
  try {
    const token = await fetchOidcToken();

    const apiBase = process.env.ID_CARD_API_BASE_URL;
    if (!apiBase) throw new Error("ID_CARD_API_BASE_URL not set");
    const sessionUrl = apiBase + "/api/merchant/session";

    // parse sessionId from request body, handle missing/invalid JSON
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "missing or invalid JSON body" },
        { status: 400 }
      );
    }

    const { sessionId } = body || {};
    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json(
        { error: "missing or invalid sessionId" },
        { status: 400 }
      );
    }

    const payload = { sessionId };
    console.log("sending payload:", payload);
    const sessionRes = await fetch(sessionUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const status = sessionRes.status;
    const sessionData = await sessionRes.json();
    console.log("session response:", sessionData);

    if (status === 200) {
      return NextResponse.json(sessionData as MerchantUserResponse, { status });
    } else if ([400, 401, 410, 500].includes(status)) {
      return NextResponse.json(sessionData as ProblemDetails, { status });
    } else {
      return NextResponse.json(
        { error: "Unexpected response from merchant session endpoint" },
        { status: 500 }
      );
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
