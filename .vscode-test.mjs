import { defineConfig } from '@vscode/test-cli'
import path from 'path'

process.env.NODE_ENV = 'test'

export default defineConfig({
    files: '{out/**/*.test.js,src/**/*.test.js}',
    mocha: {
        ui: 'bdd',
        timeout: 20000, // Maximum time (in ms) that a test can run before failing
        require: ['./scripts/sourcemaps.js'],
    },
    workspaceFolder: 'test-workspace',
    version: 'stable',
    extensionDevelopmentPath: path.resolve('./'),
    launchArgs: ['--disable-extensions'],
})
