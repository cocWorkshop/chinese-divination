/**
 * Back-compat re-export. The master chat state now lives in
 * `src/components/master/MasterChatContext.tsx` as a global provider.
 * This file exists so legacy import paths keep working during migration.
 */

export { useMasterChat } from '@/components/master/MasterChatContext'
