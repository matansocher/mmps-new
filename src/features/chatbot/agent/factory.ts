import { MemorySaver } from '@langchain/langgraph';
import { createAgent } from 'langchain';
import { ToolCallbackHandler } from '@shared/ai';
import { AgentDescriptor, CreateAgentOptions, OrchestratorDescriptor } from '../types';
import { AiService } from './service';

export function createAgent(descriptor: AgentDescriptor | OrchestratorDescriptor, opts: CreateAgentOptions): AiService {
  const { name, tools = [] } = descriptor;
  const { llm, checkpointSaver = new MemorySaver(), toolCallbackOptions } = opts;

  // Handle multi-agent orchestration
  if ('agents' in descriptor && Array.isArray(descriptor.agents)) {
    for (const agent of descriptor.agents) {
      // For now, we'll skip the orchestration and just use the tools directly
      // In a full implementation, you would convert agent to tools
      console.log(`Orchestrator would include agent: ${agent.name}`);
    }
  }

  // Create tool callback handler if options provided
  const callbacks = toolCallbackOptions ? [new ToolCallbackHandler(toolCallbackOptions)] : undefined;
  const reactAgent = createAgent({ llm, tools, checkpointSaver });
  return new AiService(reactAgent, { name, callbacks });
}
