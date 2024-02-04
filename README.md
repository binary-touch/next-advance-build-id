# next-advance-build-id

> Use a consistent, git-based build id for your Next.js app

Small package to generate a consistent, git-based build id for your Next.js app when running `next build` on each server in a multi-server deployment.

This module exports a function that you can use as your [generateBuildId](https://nextjs.org/docs/pages/api-reference/next-config-js/generateBuildId) config option in next.config.js.

By default, it will use the latest git commit hash from the local git repository (equivalent of `git rev-parse HEAD`):

```js
// next.config.js
const nextBuildId = require('next-advance-build-id')
module.exports = {
  generateBuildId: () => nextBuildId({ dir: __dirname })
}
// => 'f9fc968afa249d162c924a8d5b4ce6562c164c2e'
```

If you'd rather use a build id relative to the most recent tag in your git repo, pass `describe: true` as an option and the output of `git describe --tags` will be used instead:

```js
// next.config.js
const nextBuildId = require('next-advance-build-id')
module.exports = {
  generateBuildId: () => nextBuildId({ dir: __dirname, describeFlags: ['--tags', '--always', '--first-parent'] })
}
// => 'v1.0.0' (no changes since v1.0.0 tag)
// => 'v1.0.0-19-ga8f7eee' (19 changes since v1.0.0 tag)
```

This module also exposes a synchronous version for custom needs, e.g. passing the build id directly to a Sentry configuration. Just call `nextBuildId.sync({ dir: __dirname })` instead.

## Why?

If you're running multiple instances of your app sitting behind a load balancer without session affinity (and you're building your app directly on each production server instead of pre-packaging it), a tool like this is necessary to avoid Next.js errors like ["invalid build file hash"](https://github.com/zeit/next.js/blob/52ccc14059673508803f96ef1c74eecdf27fe096/server/index.js#L444), which happens when the same client (browser code) talks to multiple server backends (Node server) that have different build ids.

The build id used by your app is stored on the file system in a `BUILD_ID` text file in your build directory, which is `.next` by default.

## Install

```console
$ npm i next-advance-build-id
```

## API

This module exports two functions, one that is asynchronous (`nextBuildId()` primary export) and one that is synchronous (`nextBuildId.sync()`). Both functions accept a single options object, supporting the same options listed below. Both functions return (or resolve to) a string, representing the git-based build id.

The options supported are:

- `dir` (string, default `process.cwd()`): a directory within the local git repository

    Using `__dirname` from your next.config.js module is generally safe. The default value is assumed to be the directory from which you are running the `next build` command, but this may not be correct based on how you build your Next.js app.

- `describeFlags` (string[], default `undefined`): use git tag description instead of latest commit sha

    Specify this as `['--tags', '--first-parent']` to use `git describe --tags --first-parent` instead of `git rev-parse HEAD` for generating the build id. If there are no tags in your local git repository, the latest commit sha will be used instead, unless you also specify `fallbackToSha: false`.

- `fallbackToSha` (boolean, default `true`): fallback to latest commit sha when `describeFlags: ['--tags']` and no tags exist

    Only applies when using `describeFlags: ['--tags']`. If you want to be strict about requiring the use (and presence) of tags, then disable this with `fallbackToSha: false`, in which case an error will be thrown if no tags exist.

Note that this module really provides a generic way to get an id or status string for any local git repository, meaning it is not directly tied to Next.js in any way - it just depends on how you use it.

## Reviving and Enhancing a Legacy: Introduction to the Forked Project

In older version of package [nexdrew/next-build-id](https://github.com/nexdrew/next-build-id) a single boolean flag was expected and there was no flexiblity to customize to build version. Also the repository seems too old and not active as last commit was 5 years ago and a simple readme url change PR is pending since two years. So it made more sense to make separate package. I am not taking any credit on what [Andrew Goode](https://github.com/nexdrew) has build, no doubt it is fabulous work

I am excited to announce the release of a new JavaScript package, which is a fork of the previously developed [nexdrew/next-build-id](https://github.com/nexdrew/next-build-id). The original package, created by Andrew Goode ([nexdrew](https://github.com/nexdrew)), was a remarkable piece of work that served many developers well. However, it has not seen updates in recent years – the last commit was over five years ago, and even minor updates, such as a README URL change, have been pending for two years.

Recognizing the need for an updated and more flexible version, I have decided to fork the repository and develop a new package. The original version was limited to a single boolean flag, offering little flexibility for customizing the build version. My iteration aims to address these limitations and introduce additional features to meet current development standards.

I want to make it clear that this new package is a continuation and expansion of Andrew Goode's excellent foundational work. My intention is not to take credit for his original creation but to build upon it and keep it relevant for today's development needs. I am grateful for his contributions to the open-source community and hope that this new package honors his efforts by bringing his initial concept to new heights.

Stay tuned for more updates and feel free to contribute to the new repository!

## Reference

- [nexdrew/next-build-id](https://github.com/nexdrew/next-build-id)
- [zeit/next.js#2978 (comment)](https://github.com/zeit/next.js/issues/2978#issuecomment-334849384)
- [zeit/next.js#3299 (comment)](https://github.com/zeit/next.js/issues/3299#issuecomment-344973091)
- ["Handle BUILD_ID Mismatch Error" on Next.js wiki](https://github.com/zeit/next.js/wiki/Handle-BUILD_ID-Mismatch-Error)

## License

ISC © Omkar Todkar
