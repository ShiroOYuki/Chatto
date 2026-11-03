// Builds the OBS plugin (obs-plugin/) and installs it into obs-plugin/release/obs-chatto,
// which the desktop app ships and installs into OBS. Windows only.
//
// Needs Visual Studio 2022 (or its Build Tools) with the C++ workload and a Windows SDK.
// CMake is taken from PATH, or from the Visual Studio installation when it is not on PATH.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const pluginDir = join(root, 'obs-plugin');

if (process.platform !== 'win32') {
  console.error('The OBS plugin is built on Windows only.');
  process.exit(1);
}

function findCmake() {
  if (spawnSync('cmake', ['--version'], { stdio: 'ignore' }).status === 0) return 'cmake';
  const programFiles = process.env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)';
  const vswhere = join(programFiles, 'Microsoft Visual Studio', 'Installer', 'vswhere.exe');
  if (existsSync(vswhere)) {
    const found = execFileSync(
      vswhere,
      ['-latest', '-products', '*', '-find', 'Common7\\IDE\\CommonExtensions\\Microsoft\\CMake\\CMake\\bin\\cmake.exe'],
      { encoding: 'utf8' },
    )
      .split(/\r?\n/)
      .find(Boolean);
    if (found) return found;
  }
  console.error(
    'CMake was not found. Install Visual Studio 2022 Build Tools with the C++ workload, or put cmake on PATH.',
  );
  process.exit(1);
}

const cmake = findCmake();
const preset = process.env.CI ? 'windows-ci-x64' : 'windows-x64';
const run = (...args) => {
  const result = spawnSync(cmake, args, { cwd: pluginDir, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
};

// Configuring downloads the OBS sources and dependencies once; later runs reuse build_x64.
if (!existsSync(join(pluginDir, 'build_x64', 'CMakeCache.txt'))) run('--preset', preset);
run('--build', '--preset', preset);
run('--install', 'build_x64', '--config', 'RelWithDebInfo', '--prefix', 'release');
console.log(`OBS plugin ready in ${join(pluginDir, 'release', 'obs-chatto')}`);
