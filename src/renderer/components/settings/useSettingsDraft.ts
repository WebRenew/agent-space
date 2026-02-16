import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import type { AppSettings } from '../../types'

export function useSettingsDraft(
  isOpen: boolean,
  currentSettings: AppSettings
): [AppSettings, Dispatch<SetStateAction<AppSettings>>] {
  const [draft, setDraft] = useState<AppSettings>(currentSettings)

  useEffect(() => {
    if (isOpen) setDraft(currentSettings)
  }, [isOpen, currentSettings])

  return [draft, setDraft]
}
