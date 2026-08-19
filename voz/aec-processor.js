// aec-processor.js
class AECProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.filterLength = options.processorOptions?.filterLength || 256;
    this.mu = options.processorOptions?.mu || 0.15;
    this.eps = options.processorOptions?.eps || 1e-6;
    
    this.weights = new Float32Array(this.filterLength);
    this.delayBufferSize = 4096;
    this.referenceBuffer = new Float32Array(this.delayBufferSize);
    this.refWriteIndex = 0;
    this.delaySamples = options.processorOptions?.delaySamples || 256;
  }

  process(inputs, outputs) {
    const micInput = inputs[0][0];
    const refInput = inputs[1] ? inputs[1][0] : null;
    const output = outputs[0][0];

    if (!micInput) return true;

    const bufferSize = micInput.length;

    for (let i = 0; i < bufferSize; i++) {
      const x = micInput[i];
      const r = refInput ? refInput[i] : 0;

      this.referenceBuffer[this.refWriteIndex] = r;

      let power = 0;
      const refVector = new Float32Array(this.filterLength);

      for (let k = 0; k < this.filterLength; k++) {
        let readIdx = (this.refWriteIndex - this.delaySamples - k) % this.delayBufferSize;
        if (readIdx < 0) readIdx += this.delayBufferSize;

        const val = this.referenceBuffer[readIdx];
        refVector[k] = val;
        power += val * val;
      }

      let estimatedEcho = 0;
      for (let k = 0; k < this.filterLength; k++) {
        estimatedEcho += this.weights[k] * refVector[k];
      }

      const error = x - estimatedEcho;
      output[i] = error;

      const normFactor = this.mu / (power + this.eps);
      for (let k = 0; k < this.filterLength; k++) {
        this.weights[k] += normFactor * error * refVector[k];
      }

      this.refWriteIndex = (this.refWriteIndex + 1) % this.delayBufferSize;
    }

    return true;
  }
}

registerProcessor('aec-processor', AECProcessor);