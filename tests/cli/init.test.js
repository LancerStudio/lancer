import '../_test-helper.js'
import o from 'ospec'
import * as Init from '../../dist/cli/init.js'

o.spec('init', () => {

  o('smoke test', async () => {
    const { sourceDir, clientDir } = await import('../../dist/server/config.js')

    Init.initClientDir(sourceDir, clientDir)
    Init.initConfig(sourceDir)
    Init.initScripts(sourceDir)
    // Init.initTailwind(sourceDir) // Not this one since it npm installs
  })
})
