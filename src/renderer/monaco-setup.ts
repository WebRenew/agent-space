/**
 * Monaco Editor setup — configure to use locally bundled monaco-editor.
 *
 * Must be imported before any Monaco component renders.
 */

import { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'

// Tell @monaco-editor/react to use our bundled monaco-editor
// instead of loading from CDN
loader.config({ monaco })
