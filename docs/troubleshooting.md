# Troubleshooting

## Native dependencies without build tools

Alexandria depends on two native packages: `better-sqlite3` (Node addon) and `sqlite-vec` (SQLite loadable extension). Both ship prebuilt binaries, so **C/C++ build tools are not normally required**.

**sqlite-vec** distributes precompiled binaries via platform-specific npm packages (e.g., `sqlite-vec-darwin-arm64`). npm installs the correct one automatically. No build fallback exists — if your platform isn't supported, it won't compile from source.

**better-sqlite3** uses [`prebuild-install`](https://github.com/prebuild/prebuild-install) to download prebuilt binaries from [GitHub Releases](https://github.com/WiseLibs/better-sqlite3/releases). If the download fails (network restrictions, unsupported Node version), it falls back to `node-gyp rebuild`, which requires a C/C++ compiler. If you don't have build tools and the prebuild download fails:

1. **Determine your platform details:**

   ```bash
   node -e "console.log(process.platform, process.arch, 'abi=' + process.versions.modules)"
   # Example output: darwin arm64 abi=127
   ```

2. **Download the matching prebuilt binary** from GitHub Releases:

   ```
   https://github.com/WiseLibs/better-sqlite3/releases/download/v<VERSION>/better-sqlite3-v<VERSION>-node-v<ABI>-<PLATFORM>-<ARCH>.tar.gz
   ```

   Replace `<VERSION>` with the version in `package-lock.json`, `<ABI>` with the abi number from step 1, `<PLATFORM>` with `darwin`/`linux`/`win32`, and `<ARCH>` with `arm64`/`x64`.

3. **Install without running build scripts, then extract the binary:**

   ```bash
   npm install --ignore-scripts
   tar -xzf better-sqlite3-v<VERSION>-node-v<ABI>-<PLATFORM>-<ARCH>.tar.gz \
     -C node_modules/better-sqlite3/
   ```

   This places `build/Release/better_sqlite3.node` where the `bindings` package expects it.

Alternatively, set `npm_config_better_sqlite3_binary_host` to an internal mirror hosting the same tarball structure.
