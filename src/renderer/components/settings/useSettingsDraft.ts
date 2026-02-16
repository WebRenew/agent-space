import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import type { AppSettings } from '../../types'

export function useSettingsDraft(
  isOpen: boolean,
  currentSettings: AppSettings
): [AppSettings, Dispatch<SetStateAction<AppSettings>>] {
  const [draft, setDraft] = useState<AppSettings>(currentSettings)

  useEffect(() => {
    if (isOpen) setDraft(currentSettings)
    // Sync draft only when modal opens; preserve in-progress edits while open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  return [draft, setDraft]
}
