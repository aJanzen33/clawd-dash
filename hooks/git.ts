// Branch, ahead/behind and dirty count from one `git status --porcelain --branch`.
import type { Git } from '../types'

export function parseStatus(out: string): Git {
  const [head = '', ...rest] = out.split('\n')
  const line = head.replace(/^## /, '')
  const branch = line.match(/^(?:No commits yet|Initial commit) on (.+)$/)?.[1]
    ?? (line.startsWith('HEAD (no branch)') ? 'detached' : line.split('...')[0]!.split(' ')[0]!)
  return {
    branch,
    ahead: Number(line.match(/ahead (\d+)/)?.[1] ?? 0),
    behind: Number(line.match(/behind (\d+)/)?.[1] ?? 0),
    dirty: rest.filter(l => l.trim()).length,
  }
}

type Run = (argv: string[]) => Promise<{ exitCode: number | null; stdout: string }>

// null outside a repository, or when git can't run here.
export async function readGit(run: Run): Promise<Git | null> {
  try {
    const r = await run(['git', 'status', '--porcelain=v1', '--branch'])
    return r.exitCode === 0 ? parseStatus(r.stdout) : null
  } catch {
    return null
  }
}
