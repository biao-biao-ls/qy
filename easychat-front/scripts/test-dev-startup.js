#!/usr/bin/env node

const { spawn } = require('child_process')
const path = require('path')

console.log('Testing development mode startup...')

const devProcess = spawn('npm', ['run', 'dev'], {
  cwd: process.cwd(),
  stdio: 'pipe'
})

let output = ''
let hasStarted = false
const timeout = setTimeout(() => {
  if (!hasStarted) {
    console.log('❌ Development server failed to start within 10 seconds')
    devProcess.kill('SIGTERM')
    process.exit(1)
  }
}, 10000)

devProcess.stdout.on('data', (data) => {
  output += data.toString()
  console.log(data.toString())
  
  // Check for successful startup indicators
  if (output.includes('Local:') || 
      output.includes('ready in') || 
      output.includes('Electron app is ready')) {
    hasStarted = true
    console.log('✅ Development server started successfully!')
    clearTimeout(timeout)
    devProcess.kill('SIGTERM')
    process.exit(0)
  }
})

devProcess.stderr.on('data', (data) => {
  console.error(data.toString())
})

devProcess.on('close', (code) => {
  clearTimeout(timeout)
  if (hasStarted) {
    console.log('✅ Development server test completed')
    process.exit(0)
  } else {
    console.log(`❌ Development server exited with code ${code}`)
    process.exit(1)
  }
})