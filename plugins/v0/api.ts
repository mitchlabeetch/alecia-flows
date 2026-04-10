const V0_API_URL = "https://api.v0.dev/v1";

type V0ChatResponse = {
  id: string;
  webUrl: string;
  latestVersion?: {
    demoUrl?: string;
  };
};

type V0UserResponse = {
  id: string;
};

type RequestOptions = {
  apiKey: string;
  path: string;
  method?: "GET" | "POST";
  body?: unknown;
};

async function v0Request<T>({
  apiKey,
  path,
  method = "GET",
  body,
}: RequestOptions): Promise<T> {
  const response = await fetch(`${V0_API_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "Alecia Flows/v0-plugin",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `HTTP ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function createV0Chat(input: {
  apiKey: string;
  message: string;
  system?: string;
}) {
  return v0Request<V0ChatResponse>({
    apiKey: input.apiKey,
    path: "/chats",
    method: "POST",
    body: {
      message: input.message,
      system: input.system,
    },
  });
}

export async function sendV0Message(input: {
  apiKey: string;
  chatId: string;
  message: string;
}) {
  return v0Request<V0ChatResponse>({
    apiKey: input.apiKey,
    path: `/chats/${input.chatId}/messages`,
    method: "POST",
    body: {
      message: input.message,
    },
  });
}

export async function getV0User(apiKey: string) {
  return v0Request<V0UserResponse>({
    apiKey,
    path: "/user",
  });
}
