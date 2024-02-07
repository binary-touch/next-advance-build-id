'use strict'

// eagerly load libs that are always used
const fs = require('fs')
const path = require('path')

// lazily load libs that might not be used (depending on async/sync and opts.describe)
let _cp, _util
function cp () {
  if (!_cp) _cp = require('child_process')
  return _cp
}
function util () {
  if (!_util) _util = require('util')
  return _util
}
function isArrayNotEmptyAndHasString(arr) {
  return Array.isArray(arr) && arr.some(element => typeof element === 'string' && element.trim().length > 0);
}

// lazily load promisified functions that might not be used
let _access, _execFile, _readFile
function access () {
  if (!_access) _access = util().promisify(fs.access)
  return _access
}
function execFile () {
  if (!_execFile) _execFile = util().promisify(cp().execFile)
  return _execFile
}
function readFile () {
  if (!_readFile) _readFile = util().promisify(fs.readFile)
  return _readFile
}

// functions to execute a git command
function gitArgs (dir, args) {
  return [`--git-dir=${path.join(dir, '.git')}`, `--work-tree=${dir}`].concat(args)
}
async function git (dir, args) {
  const { stdout, stderr } = await execFile()('git', gitArgs(dir, args))
  if (stderr) throw new Error(String(stderr).trim())
  return String(stdout).trim()
}
function gitSync (dir, args) {
  const stdout = cp().execFileSync('git', gitArgs(dir, args))
  return String(stdout).trim()
}

// functions to read a file
function pathToGitFile (dir, filename) {
  return path.join(dir, '.git', filename)
}
async function readGitFile (dir, filename) {
  const data = await readFile()(pathToGitFile(dir, filename), 'utf8')
  return String(data).trim()
}
function readGitFileSync (dir, filename) {
  const data = fs.readFileSync(pathToGitFile(dir, filename), 'utf8')
  return String(data).trim()
}

function getOpts (opts) {
  return { fallbackToSha: true, ...opts }
}

// valid opts:
// - dir (string): in case `process.cwd()` isn't suitable
// - semvar (boolean): create only major.minor tags like v1.0 rest patch will be added by using `$(git describe --tags --abbrev=0).$(git rev-list --count --first-parent $(git describe --tags --abbrev=0)..HEAD)-g$(git rev-parse --short=8 HEAD)`
// - describeFlags (string[]): use `git describe --tags --always --first-parent` instead of `git rev-parse HEAD`
// - fallbackToSha (boolean): if opts.describe and no tags found, fallback to latest commit sha
const nextBuildId = async opts => {
  opts = getOpts(opts)

  const inputDir = path.resolve(process.cwd(), opts.dir || '.')
  let dir = inputDir

  // dir may not be the project root so look for .git dir in parent dirs too
  const root = path.parse(dir).root
  let attempts = 0 // protect against infinite tight loop if libs misbehave
  while (dir !== root && attempts < 999) {
    attempts++
    try {
      await access()(path.join(dir, '.git'), fs.constants.R_OK)
      break
    } catch (_) {
      dir = path.dirname(dir)
    }
  }
  if (dir === root || attempts >= 999) dir = inputDir

  let id
  if (opts.semvar) {
    try {
      const tag = await git(dir, ['describe', '--tags', '--abbrev=0'])
      if (!tag) throw new Error('Output of `git describe --tags --abbrev=0` was empty!')
      const patch = await git(dir, ['rev-list', '--count', '--first-parent', `${tag}..HEAD`])
      const hash = await git(dir, ['rev-parse', '--short=8', 'HEAD'])
      id = `${tag}.${patch}-g${hash}`
      return id
    } catch (err) {
      if (!opts.fallbackToSha) throw err
    }
  } else if (isArrayNotEmptyAndHasString(opts.describeFlags)) {
    // if opts.describeFlags, use `git describe` with provided flags.
    try {
      id = await git(dir, ['describe', ...opts.describeFlags])
      if (!id) throw new Error('Output of `git describe --tags` was empty!')
      return id
    } catch (err) {
      if (!opts.fallbackToSha) throw err
    }
  }

  // try file system, suggestion by @sheerun here: https://github.com/nexdrew/next-build-id/issues/17#issuecomment-482799872
  // 1. read .git/HEAD to find out ref, the result is something like `ref: refs/heads/master`
  // 2. read this file to find our current commit (e.g. .git/refs/heads/master)
  try {
    const head = await readGitFile(dir, 'HEAD')
    let refi = head.indexOf('ref:')
    if (refi === -1) refi = 0
    const endi = head.indexOf('\n', refi + 4) + 1
    const ref = head.slice(refi + 4, endi || undefined).trim()
    if (ref) {
      id = await readGitFile(dir, ref)
      if (id) return id
    }
  } catch (_) {}

  // fallback to `git rev-parse HEAD`
  id = await git(dir, ['rev-parse', 'HEAD'])
  if (!id) throw new Error('Output of `git rev-parse HEAD` was empty!')

  return id
}

nextBuildId.sync = opts => {
  opts = getOpts(opts)

  const inputDir = path.resolve(process.cwd(), opts.dir || '.')
  let dir = inputDir

  // dir may not be the project root so look for .git dir in parent dirs too
  const root = path.parse(dir).root
  let attempts = 0 // protect against infinite tight loop if libs misbehave
  while (dir !== root && attempts < 999) {
    attempts++
    try {
      fs.accessSync(path.join(dir, '.git'), fs.constants.R_OK)
      break
    } catch (_) {
      dir = path.dirname(dir)
    }
  }
  if (dir === root || attempts >= 999) dir = inputDir

  // if opts.describe, use `git describe --tags`
  let id
  if (opts.semvar) {
    try {
      const tag = gitSync(dir, ['describe', '--tags', '--abbrev=0'])
      if (!tag) throw new Error('Output of `git describe --tags --abbrev=0` was empty!')
      const patch = gitSync(dir, ['rev-list', '--count', '--first-parent', `${tag}..HEAD`])
      const hash = gitSync(dir, ['rev-parse', '--short=8', 'HEAD'])
      id = `${tag}.${patch}-g${hash}`
      return id
    } catch (err) {
      if (!opts.fallbackToSha) throw err
    }
  } else if (isArrayNotEmptyAndHasString(opts.describeFlags)) {
    try {
      id = gitSync(dir, ['describe', ...opts.describeFlags])
      if (!id) throw new Error('Output of `git describe --tags` was empty!')
      return id
    } catch (err) {
      if (!opts.fallbackToSha) throw err
    }
  }

  // try file system, suggestion by @sheerun here: https://github.com/nexdrew/next-build-id/issues/17#issuecomment-482799872
  // 1. read .git/HEAD to find out ref, the result is something like `ref: refs/heads/master`
  // 2. read this file to find our current commit (e.g. .git/refs/heads/master)
  try {
    const head = readGitFileSync(dir, 'HEAD')
    let refi = head.indexOf('ref:')
    if (refi === -1) refi = 0
    const endi = head.indexOf('\n', refi + 4) + 1
    const ref = head.slice(refi + 4, endi || undefined).trim()
    if (ref) {
      id = readGitFileSync(dir, ref)
      if (id) return id
    }
  } catch (_) {}

  // fallback to `git rev-parse HEAD`
  id = gitSync(dir, ['rev-parse', 'HEAD'])
  if (!id) throw new Error('Output of `git rev-parse HEAD` was empty!')

  return id
}

module.exports = nextBuildId
