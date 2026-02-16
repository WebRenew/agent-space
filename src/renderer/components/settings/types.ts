import type { SchedulerTask, TodoRunnerJob } from '../../types'

export type SchedulerTaskDraft = SchedulerTask & { isDraft?: boolean }
export type TodoRunnerJobDraft = TodoRunnerJob & { isDraft?: boolean; todoItemsText: string }
