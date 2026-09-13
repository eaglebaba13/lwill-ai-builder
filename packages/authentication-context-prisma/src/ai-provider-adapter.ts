export interface AiMessage {
  readonly role: "system" | "user" | "assistant";
  readonly content: string;
}

export interface AiCompletionRequest {
  readonly model: string;
  readonly messages: ReadonlyArray<AiMessage>;
  readonly maxTokens?: number;
  readonly temperature?: number;
}

export interface AiCompletionResponse {
  readonly content: string;
  readonly model: string;
  readonly provider: string;
  readonly usage: {
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly totalTokens: number;
  };
  readonly finishReason: string | null;
}

export interface AiProviderAdapter {
  readonly name: string;
  complete(request: AiCompletionRequest): Promise<AiCompletionResponse>;
  isAvailable(): boolean;
}
