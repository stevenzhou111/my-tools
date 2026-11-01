/**
 * .gitignore 生成器:常用语言/框架/IDE/系统的忽略规则模板。
 * 勾选若干组后按顺序合并、去重,输出可直接使用的 .gitignore。
 */

export const GITIGNORE_GROUPS = [
  {
    id: 'node', label: 'Node.js', note: 'npm / pnpm / yarn 项目',
    lines: ['node_modules/', 'npm-debug.log*', 'yarn-debug.log*', 'yarn-error.log*', 'pnpm-debug.log*', '.npm', '.pnpm-store/'],
  },
  {
    id: 'frontend', label: '前端构建产物', note: 'Vite / webpack 打包输出',
    lines: ['dist/', 'dist-ssr/', 'build/', '.vite/', '*.local', '.eslintcache'],
  },
  {
    id: 'python', label: 'Python', note: '虚拟环境与缓存',
    lines: ['__pycache__/', '*.py[cod]', '.venv/', 'venv/', 'env/', '.Python', 'build/', 'dist/', '*.egg-info/', '.pytest_cache/', '.mypy_cache/', '.ruff_cache/', 'poetry.lock'],
  },
  {
    id: 'java', label: 'Java / JVM', note: 'Maven / Gradle',
    lines: ['*.class', '*.jar', 'target/', 'build/', 'out/', '.gradle/', 'gradle-app.setting', '*.hprof'],
  },
  {
    id: 'go', label: 'Go', note: '编译产物与 vendor',
    lines: ['*.exe', '*.exe~', '*.test', '*.out', 'vendor/', 'go.sum'],
  },
  {
    id: 'rust', label: 'Rust', note: 'Cargo',
    lines: ['/target', 'Cargo.lock'],
  },
  {
    id: 'cpp', label: 'C / C++', note: 'CMake 与目标文件',
    lines: ['*.o', '*.obj', '*.so', '*.dylib', '*.dll', '*.exe', 'build/', 'cmake-build-*/', 'CMakeLists.txt.user', 'compile_commands.json'],
  },
  {
    id: 'csharp', label: 'C# / .NET', note: 'Visual Studio 工程',
    lines: ['bin/', 'obj/', '*.user', '*.suo', '.vs/', 'packages/', 'TestResults/'],
  },
  {
    id: 'android', label: 'Android', note: 'Gradle 工程',
    lines: ['*.apk', '*.aab', '.gradle/', 'local.properties', '.idea/', 'captures/', '.cxx/'],
  },
  {
    id: 'ios', label: 'iOS / macOS 开发', note: 'Xcode',
    lines: ['xcuserdata/', '*.xcscmblueprint', '*.xccheckout', 'DerivedData/', 'build/', '*.ipa', '*.dSYM.zip', '*.dSYM'],
  },
  {
    id: 'env', label: '环境变量与密钥', note: '.env、证书,强烈建议忽略',
    lines: ['.env', '.env.*', '!.env.example', '*.pem', '*.key', '*.cert', 'secrets.json'],
  },
  {
    id: 'logs', label: '日志与临时文件', note: '通用',
    lines: ['logs/', '*.log', 'tmp/', '*.tmp', '*.swp', '*.bak', '*.pid'],
  },
  {
    id: 'coverage', label: '测试覆盖率', note: '通用',
    lines: ['coverage/', '.nyc_output/', '*.lcov', 'htmlcov/'],
  },
  {
    id: 'ide-idea', label: 'JetBrains IDE', note: 'IDEA / WebStorm / PyCharm',
    lines: ['.idea/', '*.iml', '*.ipr', '*.iws', 'cmake-build-*/', 'out/'],
  },
  {
    id: 'ide-vscode', label: 'VS Code', note: '仅忽略个人配置,保留共享的 .vscode 亦常见',
    lines: ['.vscode/*', '!.vscode/settings.json', '!.vscode/tasks.json', '!.vscode/launch.json', '!.vscode/extensions.json', '*.code-workspace'],
  },
  {
    id: 'ide-vim', label: 'Vim / Emacs', note: '编辑器交换文件',
    lines: ['*.swp', '*.swo', '*~', '.emacs.d/', '.vim/', '[._]*.s[a-w][a-z]'],
  },
  {
    id: 'os-mac', label: 'macOS', note: 'Finder 元数据',
    lines: ['.DS_Store', '.AppleDouble', '.LSOverride', '._*', '.Spotlight-V100', '.Trashes', '.fseventsd'],
  },
  {
    id: 'os-windows', label: 'Windows', note: '资源管理器缩略图等',
    lines: ['Thumbs.db', 'Thumbs.db:encryptable', 'ehthumbs.db', 'Desktop.ini', '$RECYCLE.BIN/', '*.lnk'],
  },
  {
    id: 'os-linux', label: 'Linux', note: '常见临时文件',
    lines: ['*~', '.fuse_hidden*', '.directory', '.Trash-*', '.nfs*'],
  },
]

/**
 * 合并选中组的规则:每组带注释标题,跨组去重行,保留空行分组。
 * @param {string[]} ids 选中的组 id(按 GITIGNORE_GROUPS 顺序输出)
 */
export function mergeGitignore(ids) {
  const chosen = GITIGNORE_GROUPS.filter((g) => ids.includes(g.id))
  if (!chosen.length) return ''
  const seen = new Set()
  const blocks = chosen.map((g) => {
    const lines = g.lines.filter((l) => {
      if (seen.has(l)) return false
      seen.add(l)
      return true
    })
    return `# ${g.label}${g.note ? ` — ${g.note}` : ''}\n${lines.join('\n')}`
  })
  return blocks.join('\n\n') + '\n'
}
