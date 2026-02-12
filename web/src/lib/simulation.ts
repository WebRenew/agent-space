import type { Agent, AgentStatus } from '@/types'

const TASK_NAMES = [
  'Refactoring auth middleware',
  'Adding API rate limiting',
  'Fixing login redirect bug',
  'Writing unit tests for utils',
  'Updating database schema',
  'Implementing search endpoint',
  'Optimizing image pipeline',
  'Adding WebSocket handlers',
  'Reviewing pull request #42',
  'Setting up CI/CD pipeline',
  'Migrating to TypeScript strict',
  'Adding dark mode support',
  'Fixing memory leak in worker',
  'Implementing caching layer',
]

const STATUS_FLOW: AgentStatus[] = ['thinking', 'streaming', 'tool_calling', 'streaming', 'streaming', 'done']

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export interface SimulationUpdate {
  agentUpdates: Array<{ id: string; changes: Partial<Agent> }>
  toasts: Array<{ message: string; type: 'info' | 'error' | 'success' }>
}

export function simulateStep(agents: Agent[]): SimulationUpdate {
  const updates: SimulationUpdate = { agentUpdates: [], toasts: [] }
  if (agents.length === 0) return updates

  for (const agent of agents) {
    // Increment tokens on streaming agents
    if (agent.status === 'streaming') {
      updates.agentUpdates.push({
        id: agent.id,
        changes: {
          tokens_input: agent.tokens_input + 50 + Math.floor(Math.random() * 150),
          tokens_output: agent.tokens_output + 100 + Math.floor(Math.random() * 400),
        }
      })
    }

    // Increment files on tool_calling agents (30% chance)
    if (agent.status === 'tool_calling' && Math.random() < 0.3) {
      updates.agentUpdates.push({
        id: agent.id,
        changes: { files_modified: agent.files_modified + 1 }
      })
    }
  }

  // Pick a random agent to advance its status (40% chance per tick)
  if (Math.random() < 0.4) {
    const agent = pick(agents)
    const currentIdx = STATUS_FLOW.indexOf(agent.status)

    if (agent.status === 'done' || agent.status === 'idle') {
      // Restart with new task
      const task = pick(TASK_NAMES)
      updates.agentUpdates.push({
        id: agent.id,
        changes: {
          status: 'thinking',
          currentTask: task,
        }
      })
      updates.toasts.push({ message: `${agent.name} started: ${task}`, type: 'info' })
    } else if (agent.status === 'error') {
      // Recover from error
      updates.agentUpdates.push({
        id: agent.id,
        changes: { status: 'thinking' }
      })
    } else if (currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1) {
      const nextStatus = STATUS_FLOW[currentIdx + 1]

      // 5% chance of error instead of advancing
      if (Math.random() < 0.05) {
        updates.agentUpdates.push({
          id: agent.id,
          changes: {
            status: 'error',
            activeCelebration: 'explosion',
            celebrationStartedAt: Date.now(),
          }
        })
        updates.toasts.push({ message: `${agent.name} encountered a build error`, type: 'error' })
      } else {
        const changes: Partial<Agent> = { status: nextStatus }

        // Commit on reaching done
        if (nextStatus === 'done') {
          changes.commitCount = agent.commitCount + 1
          changes.activeCelebration = 'confetti'
          changes.celebrationStartedAt = Date.now()
          updates.toasts.push({ message: `${agent.name} committed!`, type: 'success' })
        }

        updates.agentUpdates.push({ id: agent.id, changes })
      }
    }
  }

  return updates
}
