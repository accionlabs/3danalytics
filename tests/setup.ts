import '@testing-library/jest-dom'

// Mock WebGL context for Three.js
class MockWebGLRenderingContext {
  canvas = document.createElement('canvas')
  getExtension() { return null }
  getParameter(param: number) {
    if (param === 7938) return 'WebGL 1.0' // VERSION
    if (param === 7936) return 'Mock' // VENDOR
    if (param === 7937) return 'Mock WebGL' // RENDERER
    return 0
  }
  createBuffer() { return {} }
  createFramebuffer() { return {} }
  createProgram() { return {} }
  createRenderbuffer() { return {} }
  createShader() { return {} }
  createTexture() { return {} }
  bindBuffer() {}
  bindFramebuffer() {}
  bindRenderbuffer() {}
  bindTexture() {}
  blendFunc() {}
  bufferData() {}
  clear() {}
  clearColor() {}
  clearDepth() {}
  clearStencil() {}
  colorMask() {}
  compileShader() {}
  deleteBuffer() {}
  deleteFramebuffer() {}
  deleteProgram() {}
  deleteRenderbuffer() {}
  deleteShader() {}
  deleteTexture() {}
  depthFunc() {}
  depthMask() {}
  disable() {}
  drawArrays() {}
  drawElements() {}
  enable() {}
  enableVertexAttribArray() {}
  framebufferRenderbuffer() {}
  framebufferTexture2D() {}
  frontFace() {}
  generateMipmap() {}
  getAttribLocation() { return 0 }
  getProgramParameter() { return true }
  getProgramInfoLog() { return '' }
  getShaderParameter() { return true }
  getShaderInfoLog() { return '' }
  getUniformLocation() { return {} }
  linkProgram() {}
  pixelStorei() {}
  renderbufferStorage() {}
  scissor() {}
  shaderSource() {}
  stencilFunc() {}
  stencilMask() {}
  stencilOp() {}
  texImage2D() {}
  texParameteri() {}
  uniform1f() {}
  uniform1i() {}
  uniform2f() {}
  uniform3f() {}
  uniform4f() {}
  uniformMatrix3fv() {}
  uniformMatrix4fv() {}
  useProgram() {}
  vertexAttribPointer() {}
  viewport() {}
  attachShader() {}
  checkFramebufferStatus() { return 36053 } // FRAMEBUFFER_COMPLETE
  getShaderPrecisionFormat() {
    return { rangeMin: 127, rangeMax: 127, precision: 23 }
  }
  isContextLost() { return false }
}

const getContext = HTMLCanvasElement.prototype.getContext
HTMLCanvasElement.prototype.getContext = function (
  contextId: string,
  ...args: unknown[]
) {
  if (contextId === 'webgl' || contextId === 'webgl2') {
    return new MockWebGLRenderingContext() as unknown as RenderingContext
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return getContext.call(this, contextId as any, ...(args as any))
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
