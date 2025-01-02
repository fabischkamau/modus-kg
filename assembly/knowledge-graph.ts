import {
  AssistantMessage,
  Message,
  OpenAIChatModel,
  Tool,
  ToolCall,
  UserMessage,
} from "@hypermode/modus-sdk-as/models/openai/chat";
import { StringParam, ObjectParam } from "./params";
import { neo4j, models } from "@hypermode/modus-sdk-as";
import { llmWithTools, ResponseWithLogs } from "./tool-helper";
import { JSON } from "json-as";
import { Record } from "@hypermode/modus-sdk-as/assembly/neo4j";

const MODEL_NAME: string = "llm";
const HOST_NAME: string = "neo4jsandbox";

const DEFAULT_PROMPT = `
You are a Neo4j query expert that helps users interact with the database.
First, use the schema inspection tool to understand the available nodes and relationships.
Then, generate an appropriate Cypher query based on the user's question.
Finally, execute the query and provide a natural language response based on the results.
Always validate the schema before generating queries to ensure accuracy.
Treat the data from noe4j as your Knowledge Graph.
Do not use line breaks when constructing your queries.
Always Limit query results to avoid long responses.
`;


@json
class ThreadResponse extends ResponseWithLogs {
  thread_id: string;
  constructor() {
    super();
    this.thread_id = "";
  }
}

export function askNeo4jQuestion(
  question: string,
  thread_id: string | null = null,
): ThreadResponse {
  const model = models.getModel<OpenAIChatModel>(MODEL_NAME);
  const loop_limit: u8 = 10;
  const result = new ThreadResponse();

  // Get or create thread
  if (thread_id === null) {
    result.thread_id = createThread();
  } else {
    result.thread_id = thread_id;
  }

  // Get previous messages
  const previousMessages = getThreadMessages(result.thread_id);

  const response = llmWithTools(
    model,
    [tool_get_schema(), tool_execute_query()],
    DEFAULT_PROMPT,
    question,
    executeToolCall,
    loop_limit,
    previousMessages,
  );

  // Save messages
  saveMessages(result.thread_id, question, response.response);

  result.response = response.response;
  result.logs = response.logs;
  return result;
}

function createThread(): string {
  const query = `
    CREATE (t:Thread  {created: datetime(), id: randomUuid()})
    RETURN t.id as thread_id
  `;
  const response = neo4j.executeQuery(HOST_NAME, query, new neo4j.Variables());
  return response.Records[0].Values[0].toString();
}

function getThreadMessages(thread_id: string): Message[] {
  const query = `
    MATCH (t:Thread)-[:HAS_MESSAGE]->(m)
    WHERE t.id = $thread_id
    RETURN m.role as role, m.content as content, m.datetime as datetime
    ORDER BY m.datetime
  `;
  const vars = new neo4j.Variables();
  vars.set("thread_id", thread_id);

  const response = neo4j.executeQuery(HOST_NAME, query, vars);
  const messages: Message[] = [];

  for (let i = 0; i < response.Records.length; i++) {
    const role = response.Records[i].Values[0].toString();
    const content = response.Records[i].Values[1].toString();

    if (role === "assistant") {
      messages.push(new AssistantMessage(content));
    } else {
      messages.push(new UserMessage(content));
    }
  }

  return messages;
}

function saveMessages(
  thread_id: string,
  question: string,
  answer: string,
): void {
  const query = `
    MATCH (t:Thread)
    WHERE t.id = $thread_id
    CREATE (t)-[:HAS_MESSAGE]->(um:Message {role: 'user', content: $question, datetime: datetime()}),
           (t)-[:HAS_MESSAGE]->(am:Message {role: 'assistant', content: $answer, datetime: datetime()})
  `;
  const vars = new neo4j.Variables();
  vars.set("thread_id", thread_id);
  vars.set("question", question);
  vars.set("answer", answer);

  neo4j.executeQuery(HOST_NAME, query, vars);
}
function executeToolCall(toolCall: ToolCall): string {
  if (toolCall.function.name == "get_schema") {
    return getDbSchema();
  } else if (toolCall.function.name == "execute_query") {
    return executeCustomQuery(toolCall.function.arguments);
  } else {
    return "";
  }
}

function tool_get_schema(): Tool {
  const get_schema = new Tool();
  get_schema.function = {
    name: "get_schema",
    description: `Retrieve the database schema including node labels, relationship types, and properties.`,
    parameters: null,
    strict: false,
  };
  return get_schema;
}

function getDbSchema(): string {
  const schemaQuery = `
    // Get node labels and their properties
CALL apoc.meta.data()
YIELD label, elementType, type, property
WHERE elementType = 'node'
WITH collect({
    label: label,
    property: property,
    propertyType: type
}) as nodes

// Get relationship types, their properties, and connected nodes
CALL apoc.meta.data()
YIELD label, other, elementType, type, property
WHERE elementType = 'relationship'
WITH nodes, label as relType, other as endNodeLabel, collect({
    property: property,
    propertyType: type
}) as relProperties
WITH nodes, collect({
    relationshipType: relType,
    endNodeLabel: endNodeLabel,
    properties: relProperties
}) as relationships

// Return complete schema
RETURN {
    nodes: nodes,
    relationships: relationships
} as schema
  `;
  const reponse = neo4j.executeQuery(
    HOST_NAME,
    schemaQuery,
    new neo4j.Variables(),
  );

  if (!reponse) {
    return "Error getting schema.";
  }

  let result: string = "";
  for (let i = 0; i < reponse.Records.length; i++) {
    result += recordToString(reponse.Records[i]) + "\n";
  }
  return result;
}

function tool_execute_query(): Tool {
  const execute_query = new Tool();
  const param = new ObjectParam();
  param.addRequiredProperty(
    "query",
    new StringParam("The Cypher query to execute"),
  );
  execute_query.function = {
    name: "execute_query",
    description: `Execute a Cypher query against the Neo4j database and return the results.`,
    parameters: param.toString(),
    strict: true,
  };
  return execute_query;
}


@json
class QueryArguments {
  query: string = "";
}

function executeCustomQuery(string_args: string): string {
  const args = JSON.parse<QueryArguments>(string_args);
  const response = neo4j.executeQuery(
    HOST_NAME,
    args.query,
    new neo4j.Variables(),
  );

  if (!response) {
    return "Error executing query.";
  }

  let result: string = "";
  for (let i = 0; i < response.Records.length; i++) {
    const current = recordToString(response.Records[i]);
    if (current) {
      result += current + "\n";
    }
  }
  return result || "Query returned no results.";
}

function recordToString(record: Record): string {
  if (!record || !record.Keys || !record.Values) {
    return "";
  }

  const result: string[] = [];
  for (let i = 0; i < record.Keys.length; i++) {
    if (record.Values[i] !== null) {
      result.push(`${record.Keys[i]}: ${record.Values[i]}`);
    }
  }
  return result.join(", ");
}
