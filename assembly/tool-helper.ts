import {
  OpenAIChatModel,
  Tool,
  ToolCall,
  SystemMessage,
  AssistantMessage,
  UserMessage,
  ToolMessage,
  ResponseFormat,
  CompletionMessage,
  Message,
} from "@hypermode/modus-sdk-as/models/openai/chat";


@json
export class ResponseWithLogs {
  response: string;
  logs: string[];

  constructor() {
    this.response = "";
    this.logs = [];
  }
}

export function llmWithTools(
  model: OpenAIChatModel,
  tools: Tool[],
  systemPrompt: string,
  question: string,
  toolCallback: (toolCall: ToolCall) => string,
  limit: u8 = 3,
  previousMessages: Message[] = [],
): ResponseWithLogs {
  const result = new ResponseWithLogs();
  let lastMessage: CompletionMessage | null = null;
  let toolMessages: ToolMessage[] = [];
  let loops: u8 = 0;

  do {
    const message = getLLMResponse(
      model,
      tools,
      systemPrompt,
      question,
      lastMessage,
      toolMessages,
      previousMessages,
    );
    lastMessage = message;

    if (message.toolCalls.length > 0) {
      result.logs.push(`Iteration ${loops + 1}:`);

      const currentToolMessages: ToolMessage[] = [];
      for (let i = 0; i < message.toolCalls.length; i++) {
        const toolCall = message.toolCalls[i];
        result.logs.push(
          `Calling tool: ${toolCall.function.name} with args: ${toolCall.function.arguments}`,
        );

        const toolResponse = toolCallback(toolCall);
        const toolMessage = new ToolMessage(toolResponse, toolCall.id);
        currentToolMessages.push(toolMessage);

        result.logs.push(`Tool response: ${toolResponse}`);
      }

      toolMessages = currentToolMessages;
    } else {
      result.response = message.content;
      break;
    }

    loops++;
  } while (loops < limit);

  if (loops >= limit && result.response == "") {
    result.response = "Unable to generate response within iteration limit.";
    result.logs.push("Hit iteration limit without final response.");
  }

  return result;
}

function getLLMResponse(
  model: OpenAIChatModel,
  tools: Tool[],
  systemPrompt: string,
  question: string,
  lastMessage: CompletionMessage | null = null,
  toolMessages: ToolMessage[] = [],
  previousMessages: Message[] = [],
): CompletionMessage {
  const messages: Message[] = [];

  // Add system message
  messages.push(new SystemMessage(systemPrompt));

  // Add previous conversation messages
  for (let i = 0; i < previousMessages.length; i++) {
    messages.push(previousMessages[i]);
  }

  // Add current question
  messages.push(new UserMessage(question));

  // Add last message if exists
  if (lastMessage !== null) {
    messages.push(lastMessage);
  }

  // Add tool messages
  for (let i = 0; i < toolMessages.length; i++) {
    messages.push(toolMessages[i]);
  }

  const input = model.createInput(messages);
  input.responseFormat = ResponseFormat.Text;
  input.tools = tools;
  input.toolChoice = "auto";

  const response = model.invoke(input);
  return response.choices[0].message;
}
